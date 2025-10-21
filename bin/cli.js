#!/usr/bin/env node

import('../dist/cli.js').then(module => {
  module.main();
}).catch(err => {
  console.error('Error loading CLI:', err);
  process.exit(1);
});
