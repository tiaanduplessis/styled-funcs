'use strict'

const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { test } = require('node:test')
const { parse } = require('acorn')

const root = resolve(__dirname, '..')

test('keeps the CommonJS filename, ES5 syntax, external peer and six exports', () => {
  const manifest = require('../package.json')
  assert.equal(manifest.main, 'dist/index.js')
  assert.equal(manifest.source, 'src/index.js')
  assert.deepEqual(manifest.peerDependencies, { 'styled-components': '^4' })
  assert.equal(manifest.dependencies, undefined)
  const code = readFileSync(resolve(root, manifest.main), 'utf8')
  parse(code, { ecmaVersion: 5, sourceType: 'script' })
  const externalRequires = Array.from(code.matchAll(/require\(["']([^"']+)["']\)/g), match => match[1])
  assert.deepEqual(externalRequires, ['styled-components'])
  assert.deepEqual(Object.keys(require('../dist/index.js')).sort(), [
    'by', 'byTheme', 'is', 'isMap', 'map', 'withProp'
  ])
  assert.ok(code.length < 5000, 'peer implementation must remain external')
})

test('ships a source map pointing to the unchanged public source', () => {
  const map = JSON.parse(readFileSync(resolve(root, 'dist/index.js.map'), 'utf8'))
  assert.equal(map.file, 'index.js')
  assert.equal(map.version, 3)
  assert.deepEqual(map.sources, ['../src/index.js'])
  assert.deepEqual(map.sourcesContent, [readFileSync(resolve(root, 'src/index.js'), 'utf8')])
  assert.ok(map.mappings.length > 0)
})

test('preserves the original CJS non-strict computed assignment behavior', () => {
  const { spawnSync } = require('node:child_process')
  const result = spawnSync(process.execPath, ['-e', `
    const assert = require('node:assert/strict')
    const { withProp } = require(process.argv[1])
    const key = '__styledFuncsReadonlyProbe__'
    const props = Object.create(null)
    props[key] = 'own'
    Object.defineProperty(Object.prototype, key, { value: 'inherited', configurable: true })
    try {
      assert.deepEqual(Object.keys(withProp(key)(props)), [])
    } finally {
      delete Object.prototype[key]
    }
  `, resolve(root, 'dist/index.js')], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
})
