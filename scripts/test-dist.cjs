'use strict'

const { spawnSync } = require('node:child_process')

const result = spawnSync(process.execPath, ['--test', 'src/__tests__/index.test.js'], {
  stdio: 'inherit',
  env: { ...process.env, STYLED_FUNCS_ENTRY: 'dist/index.js' }
})
if (result.error) throw result.error
process.exit(result.status === null ? 1 : result.status)
