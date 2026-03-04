#!/usr/bin/env node

import { createProject } from './create.js';

const args = process.argv.slice(2);
const projectName = args[0];

if (!projectName) {
  console.log('');
  console.log('  Usage: npx create-liteforge <project-name>');
  console.log('');
  console.log('  Example:');
  console.log('    npx create-liteforge my-app');
  console.log('');
  process.exit(1);
}

if (/[^a-zA-Z0-9._-]/.test(projectName)) {
  console.error(`\n  Error: Invalid project name "${projectName}"`);
  console.error('  Use only letters, numbers, dots, hyphens and underscores.\n');
  process.exit(1);
}

createProject(projectName);
