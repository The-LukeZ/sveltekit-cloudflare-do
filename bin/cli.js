#!/usr/bin/env node

import('../dist/cli.mjs').then(module => {
  module.main();
}).catch(err => {
  console.error('Error loading CLI:', err);
  process.exit(1);
});
