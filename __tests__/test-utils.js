const { spawnSync, spawn } = require('child_process')
const { writeFileSync } = require('fs')
const { join } = require('path')
const fs = require('fs-extra')
const os = require('os')
const path = require('path')
const execa = require('execa')
const md5Dir = require('md5-dir/promise')
const { downloadPackage } = require('../src/utils')

const registryUrl = 'http://localhost:4873'

const setup = () => {
  let verdaccioProcess

  beforeAll(() => {
    spawnSync('rm', ['-rf', './storage', './tmp'])
    verdaccioProcess = spawn('npx', ['verdaccio', '--config', 'verdaccio.yaml'])
    spawnSync('npx', ['wait-port', '4873', '-o', 'silent'])
  })

  afterEach(() => {
    spawnSync('rm', ['-rf', './storage', './tmp'])
  })

  afterAll(() => {
    verdaccioProcess.kill()
  })

  beforeEach(() => {
    jest.setTimeout(200000)
  })
}

const isCI = () => Boolean(process.env.TEAMCITY_VERSION)

const loginToRegistryIfNeeded = () => {
  const globalNpmRcFile = path.join(os.homedir(), `.npmrc`)

  const registryUrlWithoutHttp = `localhost:4873`

  const isAlreadyLoggedIn =
    fs.existsSync(globalNpmRcFile) &&
    fs
      .readFileSync(globalNpmRcFile)
      .toString()
      .includes(registryUrlWithoutHttp)

  if (!isAlreadyLoggedIn) {
    const authData = `//${registryUrlWithoutHttp}/:_authToken=cm95IHNvbW1lciB3YXMgaGVyZQ==`
    fs.appendFileSync(globalNpmRcFile, `${authData}`)
  }
}

async function publishCheckPackage(extendPackageJSON) {
  const tempDir = './tmp'

  await execa('mkdir', `-p ${tempDir}`.split(' '))

  if (!isCI()) {
    loginToRegistryIfNeeded()
  }

  writeFileSync(
    join(tempDir, 'package.json'),
    JSON.stringify({
      name: 'check-package',
      version: '1.0.0',
      ...extendPackageJSON,
    }),
  )

  await execa('npm', 'publish --ignore-scripts --registry http://localhost:4873'.split(' '), {
    cwd: tempDir,
  })

  await execa('rm', `-rf ${tempDir}`.split(' '))
}

async function calculateMd5({ registry, packageName, packageVersion, withoutProps }) {
  const { dirPath, cleanUp } = await downloadPackage({ packageVersion, packageName, registry })

  if (withoutProps.length > 0) {
    const packageJsonPath = path.join(dirPath, 'package.json')

    const packageJson = await fs.readJson(packageJsonPath)
    const newPackageJson = { ...packageJson }
    withoutProps.forEach(prop => delete newPackageJson[prop])

    await fs.writeJson(packageJsonPath, newPackageJson)
  }

  const md5 = await md5Dir(dirPath)

  await cleanUp()

  return md5
}

module.exports = {
  setup,
  loginToRegistryIfNeeded,
  publishCheckPackage,
  calculateMd5,
  registry: registryUrl,
}
