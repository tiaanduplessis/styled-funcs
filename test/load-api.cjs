'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')
const exportNames = ['by', 'byTheme', 'is', 'map', 'isMap', 'withProp']

// Exercise exactly the same assertions against the source and the published CJS:
//   node --test src/__tests__/index.test.js
//   STYLED_FUNCS_ENTRY=dist/index.js node --test src/__tests__/index.test.js
// Source loading only adapts module syntax. It does not transpile or replace any
// implementation, and css is the real peer dependency in both modes.
module.exports = function loadApi () {
  if (process.env.STYLED_FUNCS_ENTRY) {
    return require(path.resolve(root, process.env.STYLED_FUNCS_ENTRY))
  }

  const filename = path.join(root, 'src/index.js')
  const source = fs.readFileSync(filename, 'utf8')
  const imports = source.match(/^import \{ css \} from 'styled-components'\r?$/gm)
  const exports = Array.from(source.matchAll(/^export const (\w+) =/gm), match => match[1])
  assert.equal(imports && imports.length, 1, 'source loader expects one css import')
  assert.deepEqual(exports, exportNames, 'source loader must include every public export')

  const body = source
    .replace(/^import \{ css \} from 'styled-components'\r?$/m, '')
    .replace(/^export const /gm, 'const ')
  const evaluate = vm.compileFunction(`'use strict'\n${body}\nreturn { ${exportNames.join(', ')} }`, ['css'], { filename })
  return evaluate(require('styled-components').css)
}
