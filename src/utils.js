const tempy = require('tempy')
const execa = require('execa')
const path = require('path')
const fs = require('fs-extra')
const { extract } = require('tar')

async function downloadPackage({ registry, packageIdentifier, url }) {
  const downloadDirPath = tempy.directory()

  const npmPackTarget = url || packageIdentifier;
  const npmPackParams = `pack ${npmPackTarget} ${registry ? `--registry=${registry}` : ''}`
  const { stdout: tgzFileName } = await execa('npm', npmPackParams.split(' ').filter(Boolean), {
    cwd: downloadDirPath,
  })
  const tgzPath = path.join(downloadDirPath, tgzFileName)
  await extract({ file: tgzPath, cwd: downloadDirPath })

  console.log('Finished downloading and extracting the origin package.')

  return {
    dirPath: path.join(downloadDirPath, 'package'),
    cleanUp: () => fs.remove(downloadDirPath),
  }
}

const TEN_MEGABYTES = 10 * 1024 * 1024

function stringHasForbiddenCantPublishBecauseVersionExists(str) {
  return (
    str.indexOf('forbidden cannot modify pre-existing version') > -1 || // artifactory error
    str.indexOf('cannot publish over the previously published versions') > -1 // npmjs error
  )
}

async function getPackageVersionInfo(registry, packageName, version) {
  const npmPackParams = `show --json --registry=${registry} ${packageName}@${version}`;
  return JSON.parse(
    await execa('npm', npmPackParams.split(' ')),
  )
}

async function unpublishPackage(registry, packageIdentifier) {
  const npmPackParams = `unpublish --registry=${registry} ${packageIdentifier}`;
  return execa('npm', npmPackParams.split(' '));
}

function destructPackageNameWithVersion(packageNameWithVersion) {
  const invalidArgument = new Error(
    `invalid argument: ${packageNameWithVersion}. it must be from the form <package-name>@<version>. scope is optional.`,
  )
  if (!packageNameWithVersion) {
    throw invalidArgument
  }
  if (packageNameWithVersion.includes('/')) {
    const parts = packageNameWithVersion.split('@')
    if (parts.length < 3) {
      throw invalidArgument
    } else {
      return {
        packageName: `@${parts[1]}`,
        packageVersion: parts[2],
      }
    }
  } else {
    const parts = packageNameWithVersion.split('@')
    if (parts.length < 2) {
      throw invalidArgument
    } else {
      return {
        packageName: parts[0],
        packageVersion: parts[1],
      }
    }
  }
}

function isURL(url) {
  try {
    new (require('url').URL)(url)
    return true
  }
  catch (e) {
    return false;
  }
}

module.exports = {
  destructPackageNameWithVersion,
  downloadPackage,
  TEN_MEGABYTES,
  unpublishPackage,
  stringHasForbiddenCantPublishBecauseVersionExists,
  getPackageVersionInfo,
  isURL,
}
