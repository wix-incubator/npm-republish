const tempy = require('tempy')
const execa = require('execa')
const path = require('path')
const fs = require('fs-extra')
const { extract } = require('tar')

async function downloadPackage({ registry, packageName, packageVersion }) {
  const downloadDirPath = tempy.directory()

  const npmPackParams = `pack ${packageName}@${packageVersion} ${registry ? `--registry=${registry}` : ''}`
  await execa('npm', npmPackParams.split(' '), {
    cwd: downloadDirPath,
  })

  const tgzPath = path.join(downloadDirPath, `${packageName}-${packageVersion}.tgz`)
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

function getPackageVersionInfo(registry, packageName, version) {
  return JSON.parse(
    execSync(`npm show --json --registry=${registry} ${packageName}@${version}`, { stdio: 'pipe' }).toString(),
  )
}

module.exports = {
  downloadPackage,
  TEN_MEGABYTES,
  stringHasForbiddenCantPublishBecauseVersionExists,
  getPackageVersionInfo,
}
