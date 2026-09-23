const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const projectRoot = path.resolve(__dirname, '..');
const roots = [
  path.join(projectRoot, 'src'),
  path.join(projectRoot, 'App.js'),
  path.join(projectRoot, 'index.js'),
];
const files = [];

function collect(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    files.push(target);
    return;
  }
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) collect(child);
    else if (/\.[jt]sx?$/.test(entry.name)) files.push(child);
  }
}

roots.forEach(collect);
const errors = [];
const navigationTargets = new Set();
for (const file of files) {
  try {
    parser.parse(fs.readFileSync(file, 'utf8'), {
      sourceType: 'module',
      plugins: ['jsx'],
    });
  } catch (error) {
    errors.push({
      file: path.relative(projectRoot, file),
      line: error.loc?.line,
      column: error.loc?.column,
      message: error.message,
    });
  }
}

const navigatorSource = fs.readFileSync(
  path.join(projectRoot, 'src', 'navigation', 'AppNavigator.js'),
  'utf8'
);
for (const match of navigatorSource.matchAll(/<(?:Stack|Tab)\.Screen[\s\S]*?\bname=["']([^"']+)["']/g)) {
  navigationTargets.add(match[1]);
}

const navigationReferences = new Set();
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\.navigate\(\s*["']([^"']+)["']/g)) {
    navigationReferences.add(match[1]);
  }
}
const missingNavigationTargets = [...navigationReferences]
  .filter((name) => !navigationTargets.has(name))
  .sort();

console.log(JSON.stringify({
  files: files.length,
  errors,
  navigation: {
    registered: navigationTargets.size,
    referenced: navigationReferences.size,
    missingTargets: missingNavigationTargets,
  },
}, null, 2));
if (errors.length || missingNavigationTargets.length) process.exitCode = 1;
