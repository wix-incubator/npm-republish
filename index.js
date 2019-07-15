const { execSync, spawnSync } = require('child_process');
const { extract } = require('tar');
const { readFileSync, writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');
const uniqueString = require('unique-string');
const tempDir = require('temp-dir');

const getPath = () => join(tempDir, uniqueString());

function tempDirectory() {
    const directory = getPath();
	mkdirSync(directory);
	return directory;
}

function republishPackage(originPackageIdentifier, targetVersion, publishArgs) {
    const tempDir = tempDirectory();

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

            spawnSync('npm', ['publish', '--ignore-scripts', ...publishArgs], {
                cwd: join(tempDir, 'package'),
                stdio: 'inherit'
            });
        });
}

module.exports = {
    republishPackage
}
