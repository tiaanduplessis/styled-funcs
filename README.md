
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
    