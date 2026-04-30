import path from 'path';

const args = process.argv.slice(2);
const runTestsByPathIndex = args.indexOf('--runTestsByPath');
const testFiles =
  runTestsByPathIndex >= 0
    ? args.slice(runTestsByPathIndex + 1).filter((arg) => !arg.startsWith('--'))
    : ['src/tests/ctftime.test.ts'];

if (testFiles.length === 0) {
  throw new Error('--runTestsByPath requires at least one test path');
}

async function run(): Promise<void> {
  for (const testFile of testFiles) {
    const resolvedPath = path.resolve(process.cwd(), testFile);
    await import(resolvedPath);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
