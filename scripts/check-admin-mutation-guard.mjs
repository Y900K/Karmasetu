import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const ADMIN_API_ROOT = path.join(ROOT, 'app', 'api', 'admin');
const WRITE_METHOD_RE = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\s*\(/g;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }

  return files;
}

function hasWriteHandler(source) {
  return WRITE_METHOD_RE.test(source);
}

function hasSecureGuard(source) {
  return source.includes('requireSecureAdminMutation(');
}

function toWorkspacePath(absPath) {
  return absPath.replace(ROOT + path.sep, '').split(path.sep).join('/');
}

async function run() {
  const routeFiles = await walk(ADMIN_API_ROOT);
  const failures = [];

  for (const filePath of routeFiles) {
    const source = await readFile(filePath, 'utf8');
    if (!hasWriteHandler(source)) {
      continue;
    }

    if (!hasSecureGuard(source)) {
      failures.push(toWorkspacePath(filePath));
    }
  }

  if (failures.length > 0) {
    console.error('Admin mutation guard check failed. The following write routes do not use requireSecureAdminMutation:');
    for (const filePath of failures) {
      console.error(`- ${filePath}`);
    }
    process.exit(1);
  }

  console.log(`Admin mutation guard check passed (${routeFiles.length} admin route files scanned).`);
}

run().catch((error) => {
  console.error('Admin mutation guard check failed unexpectedly:', error instanceof Error ? error.message : error);
  process.exit(1);
});
