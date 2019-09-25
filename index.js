const { execSync, exec } = require('child_process');
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

function stringHasForbiddenCantPublishBecauseVersionExists(str) {
    return (
        str.indexOf('forbidden cannot modify pre-existing version') > -1 || // artifactory error
        str.indexOf('cannot publish over the previously published versions') > -1 // npmjs error
    );
}

function getPackageVersionInfo(registry, packageName, version) {
    return JSON.parse(
        execSync(
            `npm show --json --registry=${registry} ${packageName}@${version}`,
            { stdio: 'pipe' },
        ).toString(),
    );
}

/**
 * 
 * @param {string} originPackageIdentifier The full identifier of the package (name and version)
 * @param {string} targetVersion The version to re-publish to
 * @param {string[]} publishArgs Any additional arguments to pass to npm publish
 * @param {string=} registry The registry to publish to/from
 */
function republishPackage(originPackageIdentifier, targetVersion, publishArgs, registry) {
    const tempDir = tempDirectory();

    return Promise.resolve()
        .then(() => {
            const tarFile = execSync(`npm pack ${originPackageIdentifier} ${registry ? `--registry=${registry}` : ''}`, {
                cwd: tempDir
            });

            console.log('Finished downloading origin opackage tarball, extracting...');

            return extract({
                file: join(tempDir, tarFile.toString().trim()),
                cwd: tempDir
            });
        })
        .then(() => {
            console.log('Finished downloading and extracting the origin package.');
            const packageJson = JSON.parse(readFileSync(join(tempDir, 'package/package.json'), 'utf8'));
            packageJson.version = targetVersion;
            packageJson.uniqePublishIdentifier = uniqueString();
            console.log('Unique identifier for this publish', packageJson.uniqePublishIdentifier);
            writeFileSync(join(tempDir, 'package/package.json'), JSON.stringify(packageJson));
            console.log(`Wrote the target version ${targetVersion} to the package.json`);

            const subProcess = exec(`npm publish --ddd --ignore-scripts ${publishArgs.join(' ')}`, {
                cwd: join(tempDir, 'package'),
            }, (error, stdout, stderr) => {
                if (error) {
                    if (stringHasForbiddenCantPublishBecauseVersionExists(stdout) ||
                        stringHasForbiddenCantPublishBecauseVersionExists(stderr)) {
                        const versionInfo = getPackageVersionInfo(registry, packageJson.name, targetVersion);
                        if (versionInfo.uniqePublishIdentifier !== packageJson.uniqePublishIdentifier) {
                            console.error(error);
                            process.exit(error.code);
                        }
                    }
                    else {
                        console.error(error);
                        process.exit(error.code);
                    }
                }
            });

            subProcess.stderr.pipe(process.stderr);
            subProcess.stdout.pipe(process.stdout);

            console.log('Publish to target version succeeded.');
        });
}

module.exports = {
    republishPackage
}
