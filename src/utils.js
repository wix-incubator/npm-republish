const tempy = require('tempy')
const execa = require('execa')
const path = require('path')
const fs = require('fs-extra')
const { extract } = require('tar')
const pack = require('libnpmpack')
const { Readable } = require('stream');

function bufferToStream(binary) {
  const readableInstanceStream = new Readable({
    read() {
      this.push(binary);
      this.push(null);
    }
  });
  return readableInstanceStream;
}

function streamToPromise(stream) {
  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve())
    stream.on('error', err => reject(err))
  })
}

async function downloadPackage({ registry, packageIdentifier, url }) {
  const extractPath = tempy.directory()
  const npmPackTarget = url || packageIdentifier;
  const tarball = await pack(npmPackTarget, { registry })
  await streamToPromise(bufferToStream(tarball).pipe(extract({cwd: extractPath})))

  console.log('Finished downloading and extracting the origin package.')
  return {
    dirPath: path.join(extractPath, 'package'),
    cleanUp: () => fs.remove(extractPath),
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
