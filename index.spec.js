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
  publishCheckPackage();

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
    "Finished downloading and extracting the origin package.
    Unique identifier for this publish 54d809f28b5fc0dd432f6cadc7fa4a5b
    Wrote the target version 1.1.0 to the package.json
    + check-package@1.1.0
    Publish to target version succeeded.
    "
  `);
});

test("should republish an existing package and pass publish args", async () => {
  publishCheckPackage();

  const { stdout } = spawnSync(
    "sh",
    [
      "-c",
      "node ./bin/npm-republish.js check-package@1.0.0 1.1.0 --tag my-tag"
    ],
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
  expect(packageDef["dist-tags"]["my-tag"]).toEqual("1.1.0");
  expect(stdout.toString()).toMatchInlineSnapshot(`
    "Finished downloading and extracting the origin package.
    Unique identifier for this publish 679cbae264d0f12879aa7424dbecba9e
    Wrote the target version 1.1.0 to the package.json
    + check-package@1.1.0
    Publish to target version succeeded.
    "
  `);
});

test("should ignore scripts when publishing the package", async () => {
  publishCheckPackage({
    scripts: {
      prepublishOnly: "exit 1"
    }
  });

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

  const { stdout: packageDefBuffer } = spawnSync("npm", [
    "view",
    "check-package",
    "--registry",
    "http://localhost:4873",
    "-json"
  ]);

  const packageDef = JSON.parse(packageDefBuffer.toString());

  expect(packageDef.versions).toContain("1.1.0");
  expect(stdout.toString()).toMatchInlineSnapshot(`
    "Finished downloading and extracting the origin package.
    Unique identifier for this publish 7b9345d39d1d775316853a48c7109302
    Wrote the target version 1.1.0 to the package.json
    + check-package@1.1.0
    Publish to target version succeeded.
    "
  `);
});

function publishCheckPackage(extendPackageJSON) {
  const tempDir = "./tmp";

  execSync(`mkdir -p ${tempDir}`);

  writeFileSync(
    join(tempDir, "package.json"),
    JSON.stringify({
      name: "check-package",
      version: "1.0.0",
      ...extendPackageJSON
    })
  );

  execSync("npm publish --ignore-scripts --registry http://localhost:4873", {
    cwd: tempDir,
    stdio: "ignore"
  });

  execSync(`rm -rf ${tempDir}`);
}
