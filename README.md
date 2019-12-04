# npm-republish

Republish npm package with a new version:

```javascript 1.8
const { republishPackage } = require('@wix/npm-republish')

;(async () => {
  const args = 'args to add to the npm publish command' // optional
  const registryUrl = 'http://localhost:4873' // optional
  await republishPackage('package-name@1.0.0', '1.1.0', args.split(' '), registryUrl)
})()
```

You can even republish on a different package name:

```javascript 1.8
const { republishPackage } = require('@wix/npm-republish')

;(async () => {
  await republishPackage('@my-org/package-name@1.0.0', 'different-package-name@1.1.0')
})()
```

- the first param must have package-name and package-version. package-scope is optional.
- second param must have package-version. package-name and package-scope are optional.
- The source code is not transpiled. Min node version: 8 (async support is required)
