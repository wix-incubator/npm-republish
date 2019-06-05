const { spawnSync, spawn, execSync } = require("child_process");
const { writeFileSync } = require("fs");
const { join } = require("path");

let verdaccioProcess;

beforeAll(() => { 
    verdaccioProcess = spawn("npx", ["verdaccio", "--config", "verdaccio.yaml"]);
    spawnSync("npx", ["wait-port", "4873", "-o", "silent"]);
});

afterAll(() => {
    verdaccioProcess.kill();
});

afterEach(() => {
    spawnSync("rm", ["-rf", "./storage"]);
});

test("should republish an existing package using the preconfigured npm registry", async () => {
    publishCheckPackage()

    const { stdout } = spawnSync(
        "sh",
        ["-c", "node ./bin/npm-republish.js check-package@1.0.0 1.1.0"],
        {
            env: {
                ...process.env,
                NPM_CONFIG_REGISTRY: "http://localhost:4873"
            }
        }
    );

    const { stdout: packageDef } = spawnSync("npm", [
        "view",
        "check-package",
        "--registry",
        "http://localhost:4873",
        "-json",
        "versions"
    ]);

    expect(JSON.parse(packageDef.toString())).toContain("1.1.0");
    expect(stdout.toString()).toMatchInlineSnapshot(`
    "+ check-package@1.1.0
    "
  `);
});

test("should republish an existing package and pass publish args", async () => {
    publishCheckPackage()

    const { stdout } = spawnSync(
        "sh",
        ["-c", "node ./bin/npm-republish.js check-package@1.0.0 1.1.0 --tag my-tag"],
        {
            env: {
                ...process.env,
                NPM_CONFIG_REGISTRY: "http://localhost:4873"
            }
        }
    );

    const { stdout: packageDefBuffer } = spawnSync("npm", [
        "view",
        "check-package",
        "--registry",
        "http://localhost:4873",
        "-json"
    ]);

    const packageDef = JSON.parse(packageDefBuffer.toString());

    expect(packageDef.versions).toContain("1.1.0");
    expect(packageDef['dist-tags']['my-tag']).toEqual('1.1.0')
    expect(stdout.toString()).toMatchInlineSnapshot(`
      "+ check-package@1.1.0
      "
    `);
});

function publishCheckPackage() {
    const tempDir = "./tmp";

    execSync(`mkdir -p ${tempDir}`);

    writeFileSync(
        join(tempDir, "package.json"),
        JSON.stringify({
            name: "check-package",
            version: "1.0.0"
        })
    );

    spawnSync("npm", ["publish", "--registry", "http://localhost:4873"], {
        cwd: tempDir
    });

    execSync(`rm -rf ${tempDir}`);
}