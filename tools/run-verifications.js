const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const tests = fs.readdirSync(__dirname)
  .filter((name) => /^verify-.*\.js$/.test(name))
  .sort();

if (!tests.length) {
  console.error("No verification scripts were found.");
  process.exit(1);
}

const failures = [];
for (const name of tests) {
  const file = path.join(__dirname, name);
  let passed = true;
  try {
    delete require.cache[require.resolve(file)];
    require(file);
  } catch (error) {
    passed = false;
    failures.push(name);
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
  }
  if (passed) console.log(`PASS ${name}`);
}

const javascriptFiles = [
  ...fs.readdirSync(root).filter((name) => name.endsWith(".js")).map((name) => path.join(root, name)),
  ...fs.readdirSync(__dirname).filter((name) => name.endsWith(".js")).map((name) => path.join(__dirname, name)),
];
for (const file of javascriptFiles) {
  try {
    new vm.Script(fs.readFileSync(file, "utf8"), { filename: file });
  } catch (error) {
    failures.push(path.relative(root, file));
    console.error(`SYNTAX FAIL ${path.relative(root, file)}`);
    console.error(error?.stack || error);
  }
}

if (failures.length) {
  console.error(`Quality gates failed: ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(`Quality gates passed: ${tests.length} verification scripts, ${javascriptFiles.length} JavaScript syntax checks.`);
