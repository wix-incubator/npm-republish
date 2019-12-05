const { exec } = require('child_process')
const { readFileSync, writeFileSync, mkdirSync } = require('fs')
const { join } = require('path')
const uniqueString = require('unique-string')
const {
  TEN_MEGABYTES,
  downloadPackage,
  stringHasForbiddenCantPublishBecauseVersionExists,
  getPackageVersionInfo,
  destructPackageNameWithVersion,
} = require('./utils')

/**
 *
 * @param {string} originPackageIdentifier The full identifier of the package (name and version)
 * @param {string} targetVersion The version to re-publish to
 * @param {string[]} publishArgs Any additional arguments to pass to npm publish
 * @param {string|{from:string, to:string}=} registry The registry to publish to/from
 */
async function republishPackage(originPackageIdentifier, target, publishArgs = [], registry) {
  if (typeof registry === 'string') {
    registry = {
      from: registry,
      to: registry,
    }
  }

  const { packageName: originPackageName, packageVersion: originPackageVersion } = destructPackageNameWithVersion(
    originPackageIdentifier,
  )
  const { packageName: targetPackageName, packageVersion: targetPackageVersion } = destructPackageNameWithVersion(
    target,
  )

  const { dirPath, cleanUp } = await downloadPackage({
    ...(registry && { registry: registry.from }),
    packageName: originPackageName,
    packageVersion: originPackageVersion,
  })

  const packageJson = JSON.parse(readFileSync(join(dirPath, 'package.json'), 'utf8'))
  if (targetPackageName) {
    packageJson.name = targetPackageName
  }
  packageJson.version = targetPackageVersion
  if (registry) {
    packageJson.publishConfig = packageJson.publishConfig || {}
    packageJson.publishConfig.registry = registry.to
  }
  packageJson.uniqePublishIdentifier = uniqueString()
  console.log('Unique identifier for this publish', packageJson.uniqePublishIdentifier)
  writeFileSync(join(dirPath, 'package.json'), JSON.stringify(packageJson))
  console.log(`Wrote the target version ${targetPackageVersion} to the package.json`)

  return new Promise((resolve, reject) => {
    const subProcess = exec(
      `npm publish --ddd --ignore-scripts ${publishArgs.join(' ')}`,
      {
        cwd: dirPath,
        maxBuffer: TEN_MEGABYTES,
      },
      (error, stdout, stderr) => {
        if (error) {
          if (
            stringHasForbiddenCantPublishBecauseVersionExists(stdout) ||
            stringHasForbiddenCantPublishBecauseVersionExists(stderr)
          ) {
            const versionInfo = getPackageVersionInfo(registry.to, packageJson.name, targetVersion)
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
  }).then(cleanUp)
}

module.exports = {
  republishPackage,
}
