const execa = require('execa')
const { republishPackage } = require('../src')
const { setup, publishCheckPackage, calculateMd5, registry } = require('./test-utils')

setup()

test('should republish products from one package to different package under different name with scope and different version', async () => {
  const originPackageName = '@super-scope/check-package'
  const originPackageVersion = '1.0.0'
  await publishCheckPackage({
    name: originPackageName,
    version: originPackageVersion,
  })

  await republishPackage(
    `${originPackageName}@${originPackageVersion}`,
    '@my-scope/target-package-name@1.1.0',
    { registry },
  )

  const { stdout: packageDef } = await execa('npm', [
    'view',
    '@my-scope/target-package-name',
    '--registry',
    registry,
    '-json',
    'versions',
  ])

  expect(JSON.parse(packageDef.toString())).toContain('1.1.0')

  const fromMd5 = await calculateMd5({
    packageName: originPackageName,
    packageVersion: originPackageVersion,
    registry,
    withoutProps: ['name', 'version'],
  })
  const toMd5 = await calculateMd5({
    packageName: '@my-scope/target-package-name',
    packageVersion: '1.1.0',
    registry,
    withoutProps: ['name', 'version', 'publishConfig', 'uniqePublishIdentifier'],
  })

  expect(fromMd5).toEqual(toMd5)
})

test('should republish products from one package to different package under different name and different version', async () => {
  const originPackageName = 'check-package'
  const originPackageVersion = '1.0.0'
  await publishCheckPackage({
    name: originPackageName,
    version: originPackageVersion,
  })

  await republishPackage(`${originPackageName}@${originPackageVersion}`, 'target-package-name@1.1.0', { registry })

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
    packageName: originPackageName,
    packageVersion: originPackageVersion,
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
  const originPackageName = 'check-package'
  const originPackageVersion = '1.0.0'
  await publishCheckPackage({
    name: originPackageName,
    version: originPackageVersion,
  })

  await republishPackage(`${originPackageName}@${originPackageVersion}`, 'check-package@1.1.0', { registry })

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
    packageName: originPackageName,
    packageVersion: originPackageVersion,
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
  const originPackageName = 'check-package'
  const originPackageVersion = '1.0.0'
  await publishCheckPackage({
    name: originPackageName,
    version: originPackageVersion,
  })

  await republishPackage(
    `${originPackageName}@${originPackageVersion}`,
    'check-package@1.1.0',
    {
      publishArgs: '--tag my-tag'.split(' '),
      registry
    },
  )

  const { stdout: packageDefBuffer } = await execa('npm', ['view', 'check-package', '--registry', registry, '-json'])

  const packageDef = JSON.parse(packageDefBuffer.toString())

  expect(packageDef.versions).toContain('1.1.0')
  expect(packageDef['dist-tags']['my-tag']).toEqual('1.1.0')

  const fromMd5 = await calculateMd5({
    packageName: originPackageName,
    packageVersion: originPackageVersion,
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
  const originPackageName = 'check-package'
  const originPackageVersion = '1.0.0'
  await publishCheckPackage({
    name: originPackageName,
    version: originPackageVersion,
    scripts: {
      prepublishOnly: 'exit 1',
    },
  })

  await republishPackage(`${originPackageName}@${originPackageVersion}`, 'check-package@1.1.0', { registry })

  const { stdout: packageDefBuffer } = await execa('npm', ['view', 'check-package', '--registry', registry, '-json'])

  const packageDef = JSON.parse(packageDefBuffer.toString())

  expect(packageDef.versions).toContain('1.1.0')

  const fromMd5 = await calculateMd5({
    packageName: originPackageName,
    packageVersion: originPackageVersion,
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

test('should republish an existing package and unpublish previous version', async () => {
  const originPackageName = 'check-package'
  const originPackageVersion = '1.0.0'
  await publishCheckPackage({
    name: originPackageName,
    version: originPackageVersion,
  })

  await republishPackage(
    `${originPackageName}@${originPackageVersion}`,
    'check-package@1.1.0',
    {
      publishArgs: '--tag my-tag'.split(' '),
      registry
    },
  )

  const { stdout: packageDefBuffer } = await execa('npm', ['view', 'check-package', '--registry', registry, '-json'])

  const packageDef = JSON.parse(packageDefBuffer.toString())

  expect(packageDef.versions).toContain('1.1.0')
  expect(packageDef['dist-tags']['my-tag']).toEqual('1.1.0')

  const fromMd5 = await calculateMd5({
    packageName: originPackageName,
    packageVersion: originPackageVersion,
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

test('should not unpublish previous version by default', async () => {
  const originPackageName = '@super-scope/check-package'
  const originPackageVersion = '1.0.0';
  const targetPackageVersion = '1.1.0';
  await publishCheckPackage({
    name: originPackageName,
    version: originPackageVersion,
  })

  await republishPackage(
    `${originPackageName}@${originPackageVersion}`,
    `${originPackageName}@${targetPackageVersion}`,
    { registry },
  )

  const { stdout: packageDef } = await execa('npm', [
    'view',
    originPackageName,
    '--registry',
    registry,
    '-json',
    'versions',
  ])

  expect(JSON.parse(packageDef.toString())).toContain(targetPackageVersion)
  expect(JSON.parse(packageDef.toString())).toContain(originPackageVersion)
})

test('should unpublish previous version after republishing with `shouldUnpublish: true` option', async () => {
  const originPackageName = '@super-scope/check-package'
  const originPackageVersion = '1.0.0';
  const targetPackageVersion = '1.1.0';
  await publishCheckPackage({
    name: originPackageName,
    version: originPackageVersion,
  })

  await republishPackage(
    `${originPackageName}@${originPackageVersion}`,
    `${originPackageName}@${targetPackageVersion}`,
    { registry, shouldUnpublish: true },
  )

  const { stdout: packageDef } = await execa('npm', [
    'view',
    originPackageName,
    '--registry',
    registry,
    '-json',
    'versions',
  ])

  expect(JSON.parse(packageDef.toString())).toContain(targetPackageVersion)
  expect(JSON.parse(packageDef.toString())).not.toContain(originPackageVersion)
})
