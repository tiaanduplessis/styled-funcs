import { css } from 'styled-components'

const getNestedProp = (o, k) =>
  k.split('.').reduce((a, c) => {
    const m = c.match(/(.*?)\[(\d*)\]/)
    if (m && a !== null && a[m[1]] !== null) {
      return a[m[1]][+m[2]]
    }
    return a === null ? a : a[c]
  }, o)

export const by = (key, def) => props => getNestedProp(props, key) || def

export const byTheme = (key, def) => props => (props.theme ? getNestedProp(props.theme, key) : def)

export const is = (key, val = '') => props =>
  props[key] === true
    ? css`${val}` : ''

export const map = (mapping = {}) => props => {
  if (Array.isArray(mapping)) {
    mapping = arrToObj(mapping)
  }

  const keys = Object.keys(mapping)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (props[key] !== undefined) {
      return props[key]
    }
  }

  if (mapping.default) {
    return mapping.default
  }
}

const arrToObj = (arr = []) => {
  return arr.reduce((acc, cur, index) => {
    acc[index] = cur
    return acc
  }, {})
}

export const isMap = (prop = '', mapping = {}) => props => {
  if (Array.isArray(mapping)) {
    mapping = arrToObj(mapping)
  }

  if (props[prop]) {
    const keys = Object.keys(mapping)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]

      if (key === props[prop]) {
        return mapping[key]
      }
    }

    if (mapping.default) {
      return mapping.default
    }
  }
}

export const withProp = (prop = '') => props =>
  props[prop]
    ? ({
      [prop]: props[prop]
    })
    : ''
