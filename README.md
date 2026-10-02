
# styled-funcs
[![package version](https://img.shields.io/npm/v/styled-funcs.svg?style=flat-square)](https://npmjs.org/package/styled-funcs)
[![package downloads](https://img.shields.io/npm/dm/styled-funcs.svg?style=flat-square)](https://npmjs.org/package/styled-funcs)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![package license](https://img.shields.io/npm/l/styled-funcs.svg?style=flat-square)](https://npmjs.org/package/styled-funcs)
[![make a pull request](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> Set of utility functions for working with styled components

## Table of Contents

- [About](#about)
- [Features](#features)
- [Usage](#usage)
- [Install](#install)
- [Contribute](#contribute)
- [License](#License)

## About

Explain the problem the package is trying to solve.

## Features

- Name key features e.g. size, performance, how it differs from similar solutions etc.

## Usage

```js
import React from "react";
import ReactDOM from "react-dom";
import styled, { ThemeProvider } from 'styled-components'

import { by, is, map, isMap, byTheme, withProp } from 'styled-funcs'

const theme = {
  colors: {
    primary: 'tomato',
    black: '#333',
    white: '#fff'
  }
}

const Container = styled.div`
  padding: ${map({
  small: '20px',
  large: '40px',
  default: '10px'
})};
  background-color: ${by('background')};
  ${is('flex', `
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column
  `)}
`

const Button = styled.button.attrs({
  type: 'button'
})`
  padding: ${isMap('size', ['10px', '20px', '30px'])};
  border: none;
  background-color: ${byTheme('colors.primary')};
  ${withProp('borderRadius')}
`

const Text = styled.p`
  ${withProp('fontSize')};
  color: ${byTheme('colors.black')};
`

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Container className="App" background="pink" flex small>
        <Text fontSize="33px">Hello CodeSandbox</Text>
        <Button size='1' borderRadius="10px">Click me</Button>
      </Container>
    </ThemeProvider>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);

```


## Install

This project uses [node](https://nodejs.org) and [npm](https://www.npmjs.com).

```sh
$ npm install styled-funcs
$ # OR
$ yarn add styled-funcs
```

## Contribute

1. Fork it and create your feature branch: `git checkout -b my-new-feature`
2. Commit your changes: `git commit -am "Add some feature"`
3. Push to the branch: `git push origin my-new-feature`
4. Submit a pull request

## License

MIT

## Development

Use Node 22.23.3 or Node 24.19.0 and Yarn Classic 1.22.22. These are
maintainer-tool requirements; the package's runtime and peer requirements have
not changed. `yarn.lock` is the only maintained lockfile.

```sh
yarn install --frozen-lockfile --ignore-scripts
yarn run check
yarn dev # rebuild the CommonJS distribution when source changes
```

`yarn run check` runs non-mutating ESLint, builds, tests the unmodified source, checks
the distribution's ES5 syntax/source map/external peer, and repeats the behavior
tests against `dist/index.js`. The builder keeps styled-components external and
emits the same CommonJS filename and source-map filename. No install, publish,
version, or release lifecycle command is added. Build explicitly before packing:

```sh
yarn build
npm pack --ignore-scripts
```

### Characterized existing behavior

The dependency refresh deliberately preserves these existing edge cases:

- `by` uses its fallback for every falsy result; `byTheme` uses its fallback only
  when the entire theme is falsy, not for missing keys in an existing theme
- Missing intermediate property paths can throw; these helpers are not safe
  general-purpose path readers
- `map` returns the first matching **prop value**, rather than its mapping value
- Array mappings become index-keyed objects on the first call. They are then
  snapshots; object mappings continue to reflect later mutations
- `isMap` matches string keys strictly, and skips falsy selector values
- `is` requires exactly `true`; `withProp` omits falsy prop values
- Existing source and transpiled CJS function arities differ because of default
  parameter lowering. Tests preserve both forms. The old CJS also assigns a
  dynamic `__proto__` key differently from the source's computed own property;
  the builder retains that difference. Do not pass untrusted keys to these
  helpers or interpret this characterization as a security hardening change

Tests include styled-components 4 CSS interpolation and React 16 server rendering.
The tooling refresh does not migrate the `styled-components: ^4` peer contract.
