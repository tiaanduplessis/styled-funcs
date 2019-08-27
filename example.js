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
