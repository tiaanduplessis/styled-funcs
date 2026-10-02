import { babel } from '@rollup/plugin-babel'
import { rollup, watch } from 'rollup'
import { minify } from 'terser'

const input = {
  input: 'src/index.js',
  external: ['styled-components'],
  plugins: [babel({
    babelHelpers: 'bundled',
    babelrc: false,
    configFile: false,
    // Match the existing distribution's function arities and computed keys.
    assumptions: { ignoreFunctionLength: true, setComputedProperties: true },
    presets: [['@babel/preset-env', { targets: { ie: '11' }, modules: false }]]
  })]
}
const output = {
  format: 'cjs',
  file: 'dist/index.js',
  exports: 'named',
  strict: false,
  generatedCode: 'es5',
  sourcemap: true,
  plugins: [{
    name: 'minify-es5',
    async renderChunk (code) {
      const result = await minify(code, {
        ecma: 5,
        toplevel: true,
        compress: { passes: 2 },
        sourceMap: { asObject: true }
      })
      return { code: result.code, map: result.map }
    }
  }]
}

if (process.argv.includes('--watch')) {
  const watcher = watch({ ...input, output })
  watcher.on('event', async event => {
    if (event.code === 'ERROR') console.error(event.error)
    if (event.code === 'BUNDLE_END') await event.result.close()
  })
} else {
  const bundle = await rollup(input)
  try {
    await bundle.write(output)
  } finally {
    await bundle.close()
  }
}
