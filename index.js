#!/usr/bin/env node

const { directory } = require('tempy');
const { execSync, spawnSync } = require('child_process');
const { extract } = require('tar');
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

async function republishPackage(originPackageIdentifier, targetVersion, publishArgs) {
    const tempDir = directory();

    const tarFile = execSync(`npm pack ${originPackageIdentifier}`, {
        cwd: tempDir
    });
    
    await extract({
        file: join(tempDir, tarFile.toString().trim()),
        cwd: tempDir
    });

    const packageJson = JSON.parse(readFileSync(join(tempDir, 'package/package.json'), 'utf8'));
    packageJson.version = targetVersion;
    writeFileSync(join(tempDir, 'package/package.json'), JSON.stringify(packageJson));

    spawnSync('npm', ['publish', ...publishArgs], {
        cwd: join(tempDir, 'package'),
        stdio: 'inherit'
    });
}

republishPackage(process.argv[2], process.argv[3], process.argv.slice(4));


