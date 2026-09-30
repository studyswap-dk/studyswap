// Keeps .claude/skills as a copy of .agents/skills.
//
// Codex and Copilot read project skills from .agents/skills, Claude Code only
// from .claude/skills. The copy is made of real files, not symbolic links,
// because Git for Windows checks links out as plain text files unless symlinks
// are enabled, and then Claude Code silently finds no skills.
//
//   pnpm run skills:sync    replace .claude/skills with a copy of .agents/skills
//   pnpm run skills:check   fail if .claude/skills is not an exact copy (CI)

import { cpSync, existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";

const source = ".agents/skills";
const target = ".claude/skills";

function listFiles(root) {
  const files = new Map();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      const key = relative(root, path).split("\\").join("/");
      if (entry.isSymbolicLink()) files.set(key, { path, symlink: true });
      else if (entry.isDirectory()) walk(path);
      else files.set(key, { path, symlink: false });
    }
  };
  if (existsSync(root)) walk(root);
  return files;
}

function check() {
  const expected = listFiles(source);
  const actual = listFiles(target);
  const problems = [];

  for (const [key, file] of actual) {
    if (file.symlink) problems.push(`${target}/${key} is a symbolic link`);
    else if (!expected.has(key)) problems.push(`${target}/${key} is not in ${source}`);
  }
  for (const [key, file] of expected) {
    const copy = actual.get(key);
    if (!copy) problems.push(`${target}/${key} is missing`);
    else if (!copy.symlink && !readFileSync(copy.path).equals(readFileSync(file.path))) {
      problems.push(`${target}/${key} differs from ${source}/${key}`);
    }
  }

  if (problems.length > 0) {
    console.error(problems.join("\n"));
    console.error(`\n${target} is out of date. Run: pnpm run skills:sync`);
    process.exit(1);
  }
  console.log(`${target} matches ${source} (${expected.size} files)`);
}

function sync() {
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true, dereference: true });
  console.log(`Copied ${source} to ${target}`);
}

if (process.argv.includes("--check")) check();
else sync();
