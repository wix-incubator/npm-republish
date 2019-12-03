const execa = require('execa')
const { republishPackage } = require('../src')
const { setup, publishCheckPackage, calculateMd5, registry } = require('./test-utils')

setup()

test('should republish products from one package to different package under different name and different version', async () => {
  await publishCheckPackage()

  await republishPackage('check-package@1.0.0', 'target-package-name@1.1.0', [], registry)

  const { stdout: packageDef } = await execa('npm', [
    'view',
    'target-package-name',
    '--registry',
    registry,
    '-json',
    'versions',
  ])

  expect(JSON.parse(packageDef.toString())).toContain('1.1.0')

  const fromMd5 = await calculateMd5({
    packageName: 'check-package',
    packageVersion: '1.0.0',
    registry,
    withoutProps: ['name', 'version'],
  })
  const toMd5 = await calculateMd5({
    packageName: 'target-package-name',
    packageVersion: '1.1.0',
    registry,
    withoutProps: ['name', 'version', 'publishConfig', 'uniqePublishIdentifier'],
  })

  expect(fromMd5).toEqual(toMd5)
})

test('should republish an existing package using the preconfigured npm registry', async () => {
  await publishCheckPackage()

  await republishPackage('check-package@1.0.0', 'check-package@1.1.0', [], registry)

  const { stdout: packageDef } = await execa('npm', [
    'view',
    'check-package',
    '--registry',
    registry,
    '-json',
    'versions',
  ])

  expect(JSON.parse(packageDef.toString())).toContain('1.1.0')

  const fromMd5 = await calculateMd5({
    packageName: 'check-package',
    packageVersion: '1.0.0',
    registry,
    withoutProps: ['name', 'version', 'publishConfig', 'uniqePublishIdentifier'],
  })
  const toMd5 = await calculateMd5({
    packageName: 'check-package',
    packageVersion: '1.1.0',
    registry,
    withoutProps: ['name', 'version', 'publishConfig', 'uniqePublishIdentifier'],
  })

  expect(fromMd5).toEqual(toMd5)
})

test('should republish an existing package and pass publish args', async () => {
  await publishCheckPackage()

  await republishPackage('check-package@1.0.0', 'check-package@1.1.0', '--tag my-tag'.split(' '), registry)

  const { stdout: packageDefBuffer } = await execa('npm', ['view', 'check-package', '--registry', registry, '-json'])

  const packageDef = JSON.parse(packageDefBuffer.toString())

  expect(packageDef.versions).toContain('1.1.0')
  expect(packageDef['dist-tags']['my-tag']).toEqual('1.1.0')

  const fromMd5 = await calculateMd5({
    packageName: 'check-package',
    packageVersion: '1.0.0',
    registry,
    withoutProps: ['name', 'version', 'publishConfig', 'uniqePublishIdentifier'],
  })
  const toMd5 = await calculateMd5({
    packageName: 'check-package',
    packageVersion: '1.1.0',
    registry,
    withoutProps: ['name', 'version', 'publishConfig', 'uniqePublishIdentifier'],
  })

  expect(fromMd5).toEqual(toMd5)
})

test('should ignore scripts when publishing the package', async () => {
  await publishCheckPackage({
    scripts: {
      prepublishOnly: 'exit 1',
    },
  })

  await republishPackage('check-package@1.0.0', 'check-package@1.1.0', [], registry)

  const { stdout: packageDefBuffer } = await execa('npm', ['view', 'check-package', '--registry', registry, '-json'])

  const packageDef = JSON.parse(packageDefBuffer.toString())

  expect(packageDef.versions).toContain('1.1.0')

  const fromMd5 = await calculateMd5({
    packageName: 'check-package',
    packageVersion: '1.0.0',
    registry,
    withoutProps: ['name', 'version', 'publishConfig', 'uniqePublishIdentifier'],
  })
  const toMd5 = await calculateMd5({
    packageName: 'check-package',
    packageVersion: '1.1.0',
    registry,
    withoutProps: ['name', 'version', 'publishConfig', 'uniqePublishIdentifier'],
  })

  expect(fromMd5).toEqual(toMd5)
})
