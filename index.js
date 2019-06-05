

const { directory } = require('tempy');
const { execSync, spawnSync } = require('child_process');
const { extract } = require('tar');
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

function republishPackage(originPackageIdentifier, targetVersion, publishArgs) {
    const tempDir = directory();

    return Promise.resolve()
        .then(() => {
            const tarFile = execSync(`npm pack ${originPackageIdentifier}`, {
                cwd: tempDir
            });

            return extract({
                file: join(tempDir, tarFile.toString().trim()),
                cwd: tempDir
            });
        })
        .then(() => {
            const packageJson = JSON.parse(readFileSync(join(tempDir, 'package/package.json'), 'utf8'));
            packageJson.version = targetVersion;
            writeFileSync(join(tempDir, 'package/package.json'), JSON.stringify(packageJson));

            spawnSync('npm', ['publish', ...publishArgs], {
                cwd: join(tempDir, 'package'),
                stdio: 'inherit'
            });
        });
}

module.exports = {
    republishPackage
}
