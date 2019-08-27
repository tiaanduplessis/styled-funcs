import { by, map } from '../'

test('should get property by name', () => {
  expect(by('color')({
    color: 'red'
  })).toBe('red')
  expect(by('color', 'pink')({})).toBe('pink')
})

test('should map property', () => {
  expect(map({
    primary: '10px',
    default: '5px'
  })({})).toBe('5px')
})
