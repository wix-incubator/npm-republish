const { exec } = require('child_process')
const { readFileSync, writeFileSync, mkdirSync } = require('fs')
const { join } = require('path')
const uniqueString = require('unique-string')
const isPlainObject = require('is-plain-object');
const {
  TEN_MEGABYTES,
  downloadPackage,
  unpublishPackage,
  stringHasForbiddenCantPublishBecauseVersionExists,
  getPackageVersionInfo,
  destructPackageNameWithVersion,
} = require('./utils')

/**
 *
 * @param {string} identifier The full identifier of the package (name and version)
 * @param {string} target The version to re-publish to
 * @param {{registry: string, publishArgs: string[], shouldUnpublish: boolean}|string[]} publishArgs Publishing coonfiguration.
 * @param {string|{from:string, to:string}=} registry (DEPRECATED. Use 3-rd agrument as an options) The registry to publish to/from
 * @param {boolean} shouldUnpublish (DEPRECATED. Use 3-rd agrument as an options) Unpublish origin package after republishing
 */
async function republishPackage(identifier, target, publishArgs = [], registry, shouldUnpublish) {
  if (isPlainObject(publishArgs) && arguments.length === 3) {
    const options = publishArgs;
    publishArgs = options.publishArgs || [];
    registry = options.registry;
    shouldUnpublish = options.shouldUnpublish;
  }
  if (typeof registry === 'string') {
    registry = {
      from: registry,
      to: registry,
    }
  }

  const { packageName: originPackageName, packageVersion: originPackageVersion } = destructPackageNameWithVersion(
    identifier,
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
  }).then(cleanUp).then(() => {
    if (shouldUnpublish) {
      unpublishPackage(registry.to, originPackageName, originPackageVersion);
    }
  })
}

module.exports = {
  republishPackage,
}
