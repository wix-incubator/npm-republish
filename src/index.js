const { exec } = require('child_process')
const { readFileSync, writeFileSync } = require('fs')
const { join } = require('path')
const uniqueString = require('unique-string')
const {
  TEN_MEGABYTES,
  downloadPackage,
  unpublishPackage,
  stringHasForbiddenCantPublishBecauseVersionExists,
  getPackageVersionInfo,
  destructPackageNameWithVersion,
  isURL
} = require('./utils')
const execa = require('execa')

/**
 *
 * @param {string} identifier The full identifier of the package (name and version)
 * @param {string} target The version to re-publish to
 * @param {{registry: string|{from:string, to:string}, publishArgs: string[], shouldUnpublish: boolean}|string[]} publishArgs Publishing coonfiguration.
 */
async function republishPackage(identifier, target, { publishArgs = [], registry, shouldUnpublish = false, packageJsonMutator = x => x } = {}) {
  if (typeof registry === 'string') {
    registry = {
      from: registry,
      to: registry,
    }
  }

  const { packageName: targetPackageName, packageVersion: targetPackageVersion } = destructPackageNameWithVersion(
    target,
  )

  const isIdentifierAURL = isURL(identifier);
  let downloadPacakgeResult;

  if (isIdentifierAURL) {
    downloadPacakgeResult = await downloadPackage({
      url: identifier
    })  
  } else {
    downloadPacakgeResult = await downloadPackage({
      ...(registry && { registry: registry.from }),
      packageIdentifier: identifier
    })
  }

  const packageJsonContent = readFileSync(join(downloadPacakgeResult.dirPath, 'package.json'), 'utf8')
  const packageJson = packageJsonMutator(JSON.parse(packageJsonContent))
  if (targetPackageName) {
    packageJson.name = targetPackageName
  }
  packageJson.version = targetPackageVersion
  if (registry) {
    packageJson.publishConfig = { registry: registry.to }
  }
  packageJson.uniqePublishIdentifier = uniqueString()
  console.log('Unique identifier for this publish', packageJson.uniqePublishIdentifier)
  writeFileSync(join(downloadPacakgeResult.dirPath, 'package.json'), JSON.stringify(packageJson))
  console.log(`Wrote the target version ${targetPackageVersion} to the package.json`)

  await execa('npm', ['run', 'prerepublish', '--if-present'], {
    cwd: downloadPacakgeResult.dirPath,
    stdio: 'inherit'
  })

  return new Promise((resolve, reject) => {
    const subProcess = exec(
      `npm publish --ddd --ignore-scripts ${publishArgs.join(' ')}`,
      {
        cwd: downloadPacakgeResult.dirPath,
        maxBuffer: TEN_MEGABYTES,
      },
      async (error, stdout, stderr) => {
        if (error) {
          if (
            stringHasForbiddenCantPublishBecauseVersionExists(stdout) ||
            stringHasForbiddenCantPublishBecauseVersionExists(stderr)
          ) {
            const versionInfo = await getPackageVersionInfo(registry.to, packageJson.name, targetVersion)
            if (versionInfo.uniqePublishIdentifier !== packageJson.uniqePublishIdentifier) {
              reject(error)
            } else {
              console.log('Publish to target version succeeded.')
              resolve()
            }
          } else {
            reject(error)
          }
        } else {
          console.log('Publish to target version succeeded.')
          resolve()
        }
      },
    )

    subProcess.stderr.pipe(process.stderr)
    subProcess.stdout.pipe(process.stdout)
  }).then(downloadPacakgeResult.cleanUp).then(() => {
    if (shouldUnpublish) {
      try {
        return unpublishPackage(registry.to, identifier);
      } catch (e) {
        console.error("Can't unpublish a package: ", e);
      }
    }
  })
}

module.exports = {
  republishPackage,
}
