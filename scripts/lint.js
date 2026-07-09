#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'coverage', 'backend/venv']);

function rel(path) {
  return relative(root, path) || '.';
}

function shouldSkip(path) {
  const relativePath = rel(path);
  return [...SKIP_DIRS].some((dir) => relativePath === dir || relativePath.startsWith(`${dir}/`));
}

function walk(dir, predicate, out = []) {
  if (shouldSkip(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (shouldSkip(path)) continue;
    const stats = statSync(path);
    if (stats.isDirectory()) {
      walk(path, predicate, out);
    } else if (predicate(path)) {
      out.push(path);
    }
  }
  return out;
}

function addFailure(path, message) {
  failures.push(`${rel(path)}: ${message}`);
}

const jsFiles = walk(root, (path) => path.endsWith('.js'));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    addFailure(file, result.stderr.trim() || 'JavaScript syntax check failed');
  }
}

const sourceFiles = walk(join(root, 'src'), (path) => /\.(js|html)$/.test(path));
for (const file of sourceFiles) {
  if (rel(file) === 'src/utils/dom.js') continue;
  const text = readFileSync(file, 'utf8');
  const bannedSink = /(?:\.innerHTML\s*=|\.outerHTML\s*=|\.insertAdjacentHTML\s*\(|\.createContextualFragment\s*\(|document\.write\s*\()/;
  if (bannedSink.test(text)) {
    addFailure(file, 'use src/utils/dom.js setHTML/clearElement instead of a raw HTML sink');
  }
  if (/\son[a-z]+\s*=/i.test(text)) {
    addFailure(file, 'inline event handler attributes are not allowed');
  }
}

const indexPath = join(root, 'index.html');
const indexHtml = readFileSync(indexPath, 'utf8');
if (/\son[a-z]+\s*=/i.test(indexHtml)) {
  addFailure(indexPath, 'inline event handler attributes are not allowed');
}
if (/href=["']#["']/.test(indexHtml)) {
  addFailure(indexPath, 'placeholder href="#" links are not allowed');
}
const skipTargetMatch = indexHtml.match(/<a\s+[^>]*href=["']#([^"']+)["'][^>]*class=["'][^"']*\bskip-link\b/i);
if (skipTargetMatch && !new RegExp(`id=["']${skipTargetMatch[1]}["']`).test(indexHtml)) {
  addFailure(indexPath, `skip link target #${skipTargetMatch[1]} is missing`);
}
const blankLinkPattern = /<a\b(?=[^>]*target=["']_blank["'])(?![^>]*rel=["'][^"']*\bnoopener\b)([^>]*)>/gi;
if (blankLinkPattern.test(indexHtml)) {
  addFailure(indexPath, 'target="_blank" links must include rel="noopener noreferrer"');
}

const configPath = join(root, 'backend/proxy_app/config.py');
const configText = readFileSync(configPath, 'utf8');
if (/origins["']?\s*:\s*["']\*/.test(configText)) {
  addFailure(configPath, 'CORS must not default to origins="*"');
}

const securityPath = join(root, 'backend/proxy_app/security.py');
const securityText = readFileSync(securityPath, 'utf8');
if (/script-src[^;]*'unsafe-inline'/.test(securityText)) {
  addFailure(securityPath, "script-src must not allow 'unsafe-inline'");
}

if (failures.length) {
  console.error('Lint failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Lint passed (${jsFiles.length} JS files checked, ${sourceFiles.length} source files scanned).`);
