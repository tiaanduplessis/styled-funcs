'use strict'

const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const React = require('react')
const { renderToString } = require('react-dom/server')
const styledComponents = require('styled-components')
const loadApi = require('../../test/load-api.cjs')

const styled = styledComponents.default
const { css, ServerStyleSheet, ThemeProvider } = styledComponents
const api = loadApi()
const testsBuiltEntry = Boolean(process.env.STYLED_FUNCS_ENTRY)
const { by, byTheme, is, map, isMap, withProp } = api
const falsyValues = [undefined, null, false, 0, '', NaN]

// These are characterization tests, including surprising existing behavior.
// In particular, do not "fix" by/byTheme defaults, map's prop-value selection,
// string-only isMap keys, or the first-call array snapshot as part of tooling.
function renderStyles (Component, props, theme) {
  const sheet = new ServerStyleSheet()
  let element = React.createElement(Component, props, 'content')
  if (theme) element = React.createElement(ThemeProvider, { theme }, element)
  try {
    const html = renderToString(sheet.collectStyles(element))
    return { html, css: sheet.getStyleTags().replace(/\s+/g, '') }
  } finally {
    sheet.seal()
  }
}

function assertTypeError (action) {
  assert.throws(action, { name: 'TypeError' })
}

describe('public API', () => {
  it('exports exactly the six named helper functions', () => {
    assert.deepEqual(Object.keys(api).sort(), ['by', 'byTheme', 'is', 'isMap', 'map', 'withProp'])
    for (const value of Object.values(api)) assert.equal(typeof value, 'function')
  })

  it('preserves the separately established source and distribution function arities', () => {
    // The old distribution expanded default parameters, changing Function.length.
    const expected = testsBuiltEntry
      ? { by: 2, byTheme: 2, is: 2, map: 1, isMap: 2, withProp: 1 }
      : { by: 2, byTheme: 2, is: 1, map: 0, isMap: 0, withProp: 0 }
    for (const [name, arity] of Object.entries(expected)) {
      assert.equal(api[name].length, arity, `${name}.length`)
    }
  })
})

describe('by', () => {
  it('returns a direct property and a default for a missing final property', () => {
    assert.equal(by('color')({ color: 'red' }), 'red')
    assert.equal(by('color', 'pink')({}), 'pink')
    assert.equal(by('color')({}), undefined)
  })

  it('preserves the existing truthiness default for every falsy value', () => {
    for (const value of falsyValues) {
      assert.equal(by('value', 'fallback')({ value }), 'fallback')
      assert.equal(by('value')({ value }), undefined)
    }
    assert.equal(by('value', 0)({ value: false }), 0)
    assert.equal(by('value', null)({}), null)
  })

  it('returns truthy values by reference without evaluating them', () => {
    const values = [{ color: 'red' }, ['red'], () => 'red', true, -1]
    for (const value of values) assert.equal(by('value')({ value }), value)
  })

  it('traverses dotted properties, arrays, and nested combinations', () => {
    const props = { theme: { colors: ['red', { name: 'blue' }] }, rows: [{ cells: ['x', 'y'] }] }
    assert.equal(by('theme.colors[0]')(props), 'red')
    assert.equal(by('theme.colors.1.name')(props), 'blue')
    assert.equal(by('rows[0].cells[1]')(props), 'y')
    assert.equal(by('theme.absent', 'fallback')(props), 'fallback')
    assert.equal(by('theme.colors[9]', 'fallback')(props), 'fallback')
  })

  it('keeps the limited bracket parser: empty index means zero and suffixes are ignored', () => {
    const row = ['first', 'second']
    const props = { values: ['red', 'blue'], rows: [row] }
    assert.equal(by('values[]')(props), 'red')
    assert.equal(by('values[01]')(props), 'blue')
    assert.equal(by('values[0]ignored')(props), 'red')
    assert.equal(by('rows[0][1]')(props), row)
  })

  it('treats unsupported bracket expressions as literal property names', () => {
    const props = { 'values[-1]': 'negative', 'values[name]': 'named' }
    assert.equal(by('values[-1]')(props), 'negative')
    assert.equal(by('values[name]')(props), 'named')
  })

  it('allows inherited properties and empty path segments', () => {
    const props = Object.create({ inherited: { color: 'blue' } })
    props[''] = { '': 'empty' }
    assert.equal(by('inherited.color')(props), 'blue')
    assert.equal(by('.')(props), 'empty')
    assert.equal(by('')({ '': 'blank key' }), 'blank key')
  })

  it('propagates null through dotted paths before applying its default', () => {
    assert.equal(by('nested.color', 'fallback')({ nested: null }), 'fallback')
    assert.equal(by('nested.deep.color', 'fallback')({ nested: null }), 'fallback')
    assert.equal(by('nested[0].color', 'fallback')(null), 'fallback')
    assert.equal(by('color', 'fallback')(null), 'fallback')
  })

  it('throws on undefined intermediate properties and missing array containers', () => {
    assertTypeError(() => by('nested.color', 'fallback')({}))
    assertTypeError(() => by('nested[0]', 'fallback')({}))
    assertTypeError(() => by('nested[0].color', 'fallback')({ nested: [] }))
    assertTypeError(() => by('color')(undefined))
  })

  it('keeps the null array-container lookup quirk', () => {
    // A null container falls through to looking up the entire bracketed key.
    assert.equal(by('rows[0]', 'fallback')({ rows: null }), 'fallback')
    assert.equal(by('rows[0]')({ 'rows': null, 'rows[0]': 'literal' }), 'literal')
  })

  it('rejects non-string paths when invoked, rather than during construction', () => {
    for (const key of [undefined, null, 0, ['color'], Symbol('color')]) {
      const resolve = by(key)
      assert.equal(typeof resolve, 'function')
      assertTypeError(() => resolve({ color: 'red' }))
    }
  })
})

describe('byTheme', () => {
  it('reads nested theme properties and array paths', () => {
    const props = { theme: { colors: { primary: 'tomato' }, sizes: ['10px', '20px'] } }
    assert.equal(byTheme('colors.primary')(props), 'tomato')
    assert.equal(byTheme('sizes[1]')(props), '20px')
    assert.equal(byTheme('sizes.0')(props), '10px')
  })

  it('uses its default only when theme itself is falsy', () => {
    for (const theme of falsyValues) assert.equal(byTheme('color', 'pink')({ theme }), 'pink')
    assert.equal(byTheme('color', 'pink')({}), 'pink')
    assert.equal(byTheme('color')({}), undefined)
  })

  it('does not substitute the default for a missing property in an existing theme', () => {
    assert.equal(byTheme('color', 'pink')({ theme: {} }), undefined)
    assert.equal(byTheme('colors.primary', 'pink')({ theme: { colors: {} } }), undefined)
    assert.equal(byTheme('sizes[4]', 'pink')({ theme: { sizes: [] } }), undefined)
  })

  it('preserves every falsy value in an existing theme', () => {
    for (const value of falsyValues) {
      assert.equal(byTheme('value', 'fallback')({ theme: { value } }), value)
    }
  })

  it('returns object and function theme values without cloning or evaluating them', () => {
    for (const value of [{ color: 'red' }, ['red'], () => 'red']) {
      assert.equal(byTheme('value')({ theme: { value } }), value)
    }
  })

  it('preserves null propagation and the same bracket-parser quirks as by', () => {
    assert.equal(byTheme('colors.primary', 'pink')({ theme: { colors: null } }), null)
    assert.equal(byTheme('sizes[]')({ theme: { sizes: ['10px'] } }), '10px')
    assert.equal(byTheme('sizes[0]suffix')({ theme: { sizes: ['10px'] } }), '10px')
    assert.equal(byTheme('sizes[0]')({ theme: { 'sizes': null, 'sizes[0]': 'literal' } }), 'literal')
  })

  it('reads inherited themes and theme properties', () => {
    const theme = Object.create({ color: 'red' })
    assert.equal(byTheme('color')(Object.create({ theme })), 'red')
  })

  it('throws for missing intermediate paths and null or undefined props', () => {
    assertTypeError(() => byTheme('colors.primary', 'pink')({ theme: {} }))
    assertTypeError(() => byTheme('sizes[0]', 'pink')({ theme: {} }))
    assertTypeError(() => byTheme('color')(null))
    assertTypeError(() => byTheme('color')(undefined))
  })

  it('only validates a path when a truthy theme causes traversal', () => {
    assert.equal(byTheme(null, 'fallback')({}), 'fallback')
    assertTypeError(() => byTheme(null)({ theme: {} }))
    assertTypeError(() => byTheme(['color'])({ theme: { color: 'red' } }))
  })
})

describe('is', () => {
  it('passes the enabled value through the real styled-components css helper', () => {
    const value = 'display: flex; color: red;'
    assert.deepEqual(is('enabled', value)({ enabled: true }), css`${value}`)
    assert.ok(Array.isArray(is('enabled', value)({ enabled: true })))
  })

  it('requires the prop to be exactly true', () => {
    for (const enabled of [...falsyValues, 1, 'true', [], {}, Object(true)]) {
      assert.equal(is('enabled', 'color: red;')({ enabled }), '')
    }
    assert.equal(is('enabled', 'color: red;')({}), '')
  })

  it('uses literal keys rather than traversing dotted paths', () => {
    assert.equal(is('nested.enabled', 'color: red;')({ nested: { enabled: true } }), '')
    const value = 'color: red;'
    assert.deepEqual(is('nested.enabled', value)({ 'nested.enabled': true }), css`${value}`)
  })

  it('supports inherited, empty, and symbol prop keys', () => {
    const key = Symbol('enabled')
    const value = 'color: red;'
    assert.deepEqual(is('enabled', value)(Object.create({ enabled: true })), css`${value}`)
    assert.deepEqual(is('', value)({ '': true }), css`${value}`)
    assert.deepEqual(is(key, value)({ [key]: true }), css`${value}`)
  })

  it('defaults its value to an empty css interpolation', () => {
    assert.deepEqual(is('enabled')({ enabled: true }), css`${''}`)
    assert.deepEqual(is('enabled', undefined)({ enabled: true }), css`${''}`)
  })

  it('preserves css handling of falsy values and nested css fragments', () => {
    for (const value of falsyValues.filter(value => value !== undefined)) {
      assert.deepEqual(is('enabled', value)({ enabled: true }), css`${value}`)
    }
    const value = [css`color: red;`, ['padding: 2px;', false]]
    assert.deepEqual(is('enabled', value)({ enabled: true }), css`${value}`)
  })

  it('preserves function interpolation without calling it before rendering', () => {
    let calls = 0
    const value = props => {
      calls++
      return `color: ${props.color};`
    }
    const result = is('enabled', value)({ enabled: true, color: 'red' })
    assert.equal(calls, 0)
    assert.ok(result.includes(value))
    assert.deepEqual(result, css`${value}`)
  })

  it('throws when props are null or undefined', () => {
    assertTypeError(() => is('enabled')(null))
    assertTypeError(() => is('enabled')(undefined))
  })
})

describe('map', () => {
  it('returns the matching prop value instead of the corresponding mapping value', () => {
    const resolve = map({ primary: '10px', default: '5px' })
    assert.equal(resolve({ primary: true }), true)
    assert.equal(resolve({ primary: 'from props' }), 'from props')
    assert.equal(resolve({}), '5px')
  })

  it('accepts every defined prop value, including falsy values', () => {
    const resolve = map({ primary: 'ignored', default: 'fallback' })
    for (const primary of [null, false, 0, '', NaN]) assert.equal(resolve({ primary }), primary)
    assert.equal(resolve({ primary: undefined }), 'fallback')
  })

  it('selects the first defined prop in mapping insertion order', () => {
    const resolve = map({ second: 'ignored', first: 'ignored', default: 'fallback' })
    assert.equal(resolve({ first: 'one', second: 'two' }), 'two')
    assert.equal(resolve({ first: 'one', second: undefined }), 'one')
    assert.equal(resolve({ first: 'one', second: false }), false)
  })

  it('uses Object.keys ordering, so integer keys sort before string keys', () => {
    const resolve = map({ last: 'ignored', 10: 'ignored', 2: 'ignored', first: 'ignored' })
    assert.equal(resolve({ last: 'last', 10: 'ten', 2: 'two', first: 'first' }), 'two')
  })

  it('treats default as an ordinary prop key before using it as fallback', () => {
    const resolve = map({ default: 'mapping fallback', primary: 'ignored' })
    assert.equal(resolve({ default: false, primary: 'primary' }), false)
    assert.equal(resolve({ default: 'prop default', primary: 'primary' }), 'prop default')
    assert.equal(resolve({ primary: 'primary' }), 'primary')
  })

  it('only returns truthy fallback mapping values', () => {
    for (const fallback of falsyValues) assert.equal(map({ default: fallback })({}), undefined)
    assert.equal(map({ default: 'fallback' })({}), 'fallback')
    assert.equal(map()({}), undefined)
    assert.equal(map({})({ anything: true }), undefined)
  })

  it('ignores inherited mapping keys but permits inherited props and fallback', () => {
    const mapping = Object.create({ inherited: 'ignored', default: 'fallback' })
    mapping.own = 'ignored'
    assert.equal(map(mapping)({ inherited: 'prop' }), 'fallback')
    assert.equal(map(mapping)(Object.create({ own: 'inherited prop' })), 'inherited prop')
  })

  it('keeps an object mapping live across calls, without mutating inputs', () => {
    const mapping = { first: 'ignored', default: 'fallback' }
    const resolve = map(mapping)
    const props = Object.freeze({ first: 'one', second: 'two' })
    assert.equal(resolve(props), 'one')
    delete mapping.first
    mapping.second = 'also ignored'
    mapping.default = 'new fallback'
    assert.equal(resolve(props), 'two')
    assert.equal(resolve({}), 'new fallback')
    assert.deepEqual(mapping, { default: 'new fallback', second: 'also ignored' })
  })

  it('converts arrays into index keys while still selecting prop values', () => {
    const mapping = Object.freeze(['10px', '20px'])
    const resolve = map(mapping)
    assert.equal(resolve({ 1: 'prop one' }), 'prop one')
    assert.equal(resolve({ 0: false, 1: 'prop one' }), false)
    assert.equal(resolve({}), undefined)
    assert.deepEqual(mapping, ['10px', '20px'])
  })

  it('snapshots array entries on its first invocation, not at construction', () => {
    const mapping = ['first']
    const resolve = map(mapping)
    mapping.push('second')
    assert.equal(resolve({ 1: 'visible before first call' }), 'visible before first call')
    mapping.push('third')
    mapping.splice(0, 2)
    assert.equal(resolve({ 1: 'snapshot key survives' }), 'snapshot key survives')
    assert.equal(resolve({ 2: 'new key is absent' }), undefined)
    assert.deepEqual(mapping, ['third'])
  })

  it('skips sparse array holes and ignores custom array properties', () => {
    const mapping = []
    mapping[2] = 'entry'
    mapping.default = 'ignored default'
    mapping.primary = 'ignored primary'
    const resolve = map(mapping)
    assert.equal(resolve({ 0: 'hole', primary: 'ignored' }), undefined)
    assert.equal(resolve({ 2: 'selected' }), 'selected')
    assert.equal(resolve({}), undefined)
  })

  it('throws for null mappings and for null props when a key is inspected', () => {
    assertTypeError(() => map(null)({}))
    assertTypeError(() => map({ primary: 'value' })(null))
    assertTypeError(() => map({ primary: 'value' })(undefined))
    // An empty mapping never reads props, so invalid props happen to be tolerated.
    assert.equal(map()(null), undefined)
    assert.equal(map()(undefined), undefined)
  })
})

describe('isMap', () => {
  it('returns the mapping value selected by a string prop', () => {
    const resolve = isMap('size', { small: '10px', large: '20px', default: '5px' })
    assert.equal(resolve({ size: 'small' }), '10px')
    assert.equal(resolve({ size: 'large' }), '20px')
    assert.equal(resolve({ size: 'unknown' }), '5px')
  })

  it('does not return a fallback when its selector prop is falsy', () => {
    const resolve = isMap('size', { default: '5px' })
    for (const size of falsyValues) assert.equal(resolve({ size }), undefined)
    assert.equal(resolve({}), undefined)
  })

  it('preserves falsy mapped values for an exact match', () => {
    for (const value of falsyValues) {
      assert.equal(isMap('size', { small: value, default: 'fallback' })({ size: 'small' }), value)
    }
  })

  it('only returns a truthy fallback for unmatched truthy selectors', () => {
    for (const fallback of falsyValues) {
      assert.equal(isMap('size', { default: fallback })({ size: 'missing' }), undefined)
    }
    assert.equal(isMap('size', { default: false })({ size: 'default' }), false)
  })

  it('compares selectors strictly to string keys, without numeric or boolean coercion', () => {
    const resolve = isMap('value', { 0: 'zero', 1: 'one', true: 'yes', default: 'fallback' })
    assert.equal(resolve({ value: '0' }), 'zero')
    assert.equal(resolve({ value: '1' }), 'one')
    assert.equal(resolve({ value: 'true' }), 'yes')
    assert.equal(resolve({ value: 0 }), undefined)
    assert.equal(resolve({ value: 1 }), 'fallback')
    assert.equal(resolve({ value: true }), 'fallback')
    assert.equal(resolve({ value: Object('1') }), 'fallback')
  })

  it('returns selected objects and functions by reference without invoking them', () => {
    for (const value of [{ color: 'red' }, ['red'], () => 'red']) {
      assert.equal(isMap('size', { selected: value })({ size: 'selected' }), value)
    }
  })

  it('uses literal, empty, inherited, and symbol selector prop keys', () => {
    const mapping = { small: '10px', default: 'fallback' }
    assert.equal(isMap('nested.size', mapping)({ nested: { size: 'small' } }), undefined)
    assert.equal(isMap('nested.size', mapping)({ 'nested.size': 'small' }), '10px')
    assert.equal(isMap('', mapping)({ '': 'small' }), '10px')
    assert.equal(isMap('size', mapping)(Object.create({ size: 'small' })), '10px')
    const key = Symbol('size')
    assert.equal(isMap(key, mapping)({ [key]: 'small' }), '10px')
  })

  it('ignores inherited and symbol mapping keys but reads an inherited fallback', () => {
    const mapping = Object.create({ small: 'inherited', default: 'fallback' })
    const key = Symbol('selected')
    mapping[key] = 'symbol mapping'
    assert.equal(isMap('size', mapping)({ size: 'small' }), 'fallback')
    assert.equal(isMap('size', mapping)({ size: key }), 'fallback')
  })

  it('keeps object mapping mutations visible across calls without mutating props', () => {
    const mapping = { small: '10px', default: '5px' }
    const resolve = isMap('size', mapping)
    const props = Object.freeze({ size: 'small' })
    assert.equal(resolve(props), '10px')
    mapping.small = '12px'
    assert.equal(resolve(props), '12px')
    delete mapping.small
    mapping.default = '7px'
    assert.equal(resolve(props), '7px')
    assert.deepEqual(mapping, { default: '7px' })
  })

  it('maps arrays using string indices and leaves the input array untouched', () => {
    const mapping = Object.freeze(['10px', '20px', '30px'])
    const resolve = isMap('size', mapping)
    assert.equal(resolve({ size: '0' }), '10px')
    assert.equal(resolve({ size: '1' }), '20px')
    assert.equal(resolve({ size: '2' }), '30px')
    assert.equal(resolve({ size: 1 }), undefined)
    assert.equal(resolve({ size: '3' }), undefined)
    assert.deepEqual(mapping, ['10px', '20px', '30px'])
  })

  it('snapshots arrays at the first call even when that call has no selector', () => {
    const mapping = ['10px']
    const resolve = isMap('size', mapping)
    mapping[0] = '12px'
    assert.equal(resolve({}), undefined)
    mapping[0] = '99px'
    mapping.push('20px')
    assert.equal(resolve({ size: '0' }), '12px')
    assert.equal(resolve({ size: '1' }), undefined)
    assert.deepEqual(mapping, ['99px', '20px'])
  })

  it('skips sparse array holes and drops custom default properties during conversion', () => {
    const mapping = []
    mapping[2] = '30px'
    mapping.default = 'ignored'
    const resolve = isMap('size', mapping)
    assert.equal(resolve({ size: '0' }), undefined)
    assert.equal(resolve({ size: '2' }), '30px')
    assert.equal(resolve({ size: 'missing' }), undefined)
  })

  it('uses empty-selector and empty-mapping defaults', () => {
    assert.equal(isMap()({}), undefined)
    assert.equal(isMap()({ '': 'selected' }), undefined)
    assert.equal(isMap(undefined, { selected: 'value' })({ '': 'selected' }), 'value')
    assert.equal(isMap('size')({ size: 'small' }), undefined)
  })

  it('throws for invalid props and defers null-mapping errors until a truthy selector', () => {
    assertTypeError(() => isMap('size', {})(null))
    assertTypeError(() => isMap('size', {})(undefined))
    assert.equal(isMap('size', null)({}), undefined)
    assert.equal(isMap('size', null)({ size: false }), undefined)
    assertTypeError(() => isMap('size', null)({ size: 'small' }))
  })
})

describe('withProp', () => {
  it('wraps a truthy property in a fresh style object', () => {
    const props = Object.freeze({ borderRadius: '10px', other: 'ignored' })
    const resolve = withProp('borderRadius')
    const first = resolve(props)
    assert.deepEqual(first, { borderRadius: '10px' })
    assert.notEqual(first, props)
    assert.notEqual(first, resolve(props))
    assert.deepEqual(props, { borderRadius: '10px', other: 'ignored' })
  })

  it('returns an empty string for all falsy values and missing props', () => {
    for (const value of falsyValues) assert.equal(withProp('value')({ value }), '')
    assert.equal(withProp('value')({}), '')
  })

  it('preserves nested value references and does not invoke functions', () => {
    for (const value of [{ color: 'red' }, ['red'], () => 'red']) {
      assert.equal(withProp('value')({ value }).value, value)
    }
  })

  it('uses literal keys without nested traversal', () => {
    assert.equal(withProp('nested.color')({ nested: { color: 'red' } }), '')
    assert.deepEqual(withProp('nested.color')({ 'nested.color': 'red' }), { 'nested.color': 'red' })
  })

  it('supports empty default keys, inherited props, and symbol keys', () => {
    assert.deepEqual(withProp()({ '': 'value' }), { '': 'value' })
    assert.deepEqual(withProp(undefined)({ '': 'value' }), { '': 'value' })
    assert.deepEqual(withProp('color')(Object.create({ color: 'red' })), { color: 'red' })
    const key = Symbol('color')
    assert.deepEqual(withProp(key)({ [key]: 'red' }), { [key]: 'red' })
  })

  it('preserves the existing source/distribution difference for the special __proto__ key', () => {
    // Source computed properties define an own key. The old CJS build uses
    // assignment, which calls Object.prototype's prototype setter instead.
    const key = '__proto__'
    const value = { color: 'red' }
    const props = Object.create(null)
    props[key] = value
    const result = withProp(key)(props)
    if (testsBuiltEntry) {
      assert.equal(Object.getPrototypeOf(result), value)
      assert.equal(Object.hasOwn(result, key), false)
    } else {
      assert.equal(Object.getPrototypeOf(result), Object.prototype)
      assert.equal(Object.hasOwn(result, key), true)
    }
    assert.equal(result[key], value)
  })

  it('preserves the distribution assignment behavior for a primitive __proto__ value', () => {
    const key = '__proto__'
    const props = Object.create(null)
    props[key] = 'red'
    const result = withProp(key)(props)
    assert.equal(Object.getPrototypeOf(result), Object.prototype)
    assert.equal(Object.hasOwn(result, key), !testsBuiltEntry)
    assert.equal(result[key], testsBuiltEntry ? Object.prototype : 'red')
  })

  it('throws for null or undefined props', () => {
    assertTypeError(() => withProp('color')(null))
    assertTypeError(() => withProp('color')(undefined))
  })
})

describe('styled-components 4 and React 16 SSR integration', () => {
  it('supports all six exports together in a styled template and ThemeProvider', () => {
    const Component = styled.div`
      color: ${by('color', 'pink')};
      background: ${byTheme('colors.primary', 'black')};
      margin: ${map({ spacing: 'this mapping value is ignored', default: '1px' })};
      padding: ${isMap('size', ['2px', '4px'])};
      ${is('enabled', 'display: block;')}
      ${withProp('borderRadius')}
    `
    const result = renderStyles(Component, {
      color: 'red', spacing: '3px', size: '1', enabled: true, borderRadius: '5px'
    }, { colors: { primary: 'blue' } })
    assert.match(result.html, /^<div[^>]*class="[^"]+"[^>]*>content<\/div>$/)
    for (const declaration of ['color:red;', 'background:blue;', 'margin:3px;', 'padding:4px;', 'display:block;', 'border-radius:5px;']) {
      assert.ok(result.css.includes(declaration), `missing ${declaration} in ${result.css}`)
    }
    assert.equal(result.css.includes('thismappingvalueisignored'), false)
  })

  it('renders defaults and omits disabled or falsy style fragments', () => {
    const Component = styled.div`
      color: ${by('color', 'pink')};
      background: ${byTheme('primary', 'black')};
      margin: ${map({ spacing: 'ignored', default: '7px' })};
      padding: ${isMap('size', { small: '2px', default: '6px' })};
      ${is('enabled', 'display: block;')}
      ${withProp('borderRadius')}
    `
    const result = renderStyles(Component, { color: '', size: 'missing', enabled: 'true', borderRadius: 0 })
    // styled-components supplies an empty theme object even without ThemeProvider,
    // so byTheme's default is not used and the empty declaration is discarded.
    assert.ok(result.css.includes('color:pink;'))
    assert.ok(result.css.includes('margin:7px;'))
    assert.ok(result.css.includes('padding:6px;'))
    assert.equal(result.css.includes('background:'), false)
    assert.equal(result.css.includes('display:'), false)
    assert.equal(result.css.includes('border-radius:'), false)
  })

  it('evaluates function interpolation inside is with the eventual render props', () => {
    const seen = []
    const Component = styled.div`
      ${is('enabled', props => {
        seen.push(props.color)
        return `color: ${props.color};`
      })}
    `
    assert.equal(seen.length, 0)
    const result = renderStyles(Component, { enabled: true, color: 'purple' })
    assert.ok(result.css.includes('color:purple;'))
    assert.ok(seen.length > 0)
    assert.ok(seen.every(color => color === 'purple'))
    const disabled = renderStyles(Component, { enabled: false, color: 'orange' })
    assert.equal(disabled.css.includes('color:orange;'), false)
    assert.ok(seen.every(color => color === 'purple'))
  })

  it('renders nested css fragments returned by isMap and selected function values', () => {
    const Component = styled.div`
      ${isMap('variant', {
        active: css`color: ${byTheme('colors.primary')}; padding: ${by('padding')};`,
        default: css`opacity: 0.5;`
      })}
      width: ${by('cssWidth')};
      height: ${map({ cssHeight: 'ignored' })};
    `
    const result = renderStyles(Component, {
      variant: 'active', padding: '8px', cssWidth: props => `${props.unit}px`, cssHeight: props => `${props.unit * 2}px`, unit: 9
    }, { colors: { primary: 'teal' } })
    for (const declaration of ['color:teal;', 'padding:8px;', 'width:9px;', 'height:18px;']) {
      assert.ok(result.css.includes(declaration), `missing ${declaration} in ${result.css}`)
    }
    const fallback = renderStyles(Component, { variant: 'unknown' })
    assert.ok(fallback.css.includes('opacity:0.5;'))
  })
})
