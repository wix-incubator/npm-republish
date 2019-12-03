# npm-republish

Republish npm package with a new version:

```javascript 1.8
const { republishPackage } = require('@wix/npm-republish');

(async () => {
  const args = 'args to add to the npm publish command'; // optional
  const registryUrl = 'http://localhost:4873'; // optional
  await republishPackage('package-name@1.0.0', '1.1.0', args.split(' '), registryUrl)
})();
```

You can even republish ona different package name:

```javascript 1.8
const { republishPackage } = require('@wix/npm-republish');

(async () => {
  await republishPackage('package-name@1.0.0', 'different-package-name@1.1.0')
})();
```


* The source code is not transpiled. Min node version: 12 (async support is required)