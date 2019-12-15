# npm-republish

Republish npm package with a new version:

```javascript 1.8
const { republishPackage } = require('@wix/npm-republish');

(async () => {
  await republishPackage(
    'package-name@1.0.0',
    '1.1.0',
    {
      publishArgs: 'args to add to the npm publish command'.split(' '), // optional
      registry: 'http://localhost:4873', // optional
      shouldUnpublish: false, // optional
    }
  )
})()
```

You can even republish on a different package name:

```javascript 1.8
const { republishPackage } = require('@wix/npm-republish');

(async () => {
  await republishPackage('@my-org/package-name@1.0.0', 'different-package-name@1.1.0')
})()
```


#### Arguments:

- **identifier** (*string*) - The full identifier of the package (name and version)
- **target** (*string*) - The version or new identifier to re-publish to
- **options**
  - **publishArgs** (*string[]*) - Set of arguments to be included in publishing command. 
  - **registry** (*string*|{from: *string*, to: *string*}) - The registry to publish to/from.
  - **shouldUnpublish** - Unpublish origin package after republishing.

*Note:*
>The source code is not transpiled. Min node version: 8 (async support is required)
