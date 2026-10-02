import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'

export default [
  { ignores: ['dist/**', 'example.js'] },
  js.configs.recommended,
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: false,
    commaDangle: 'never',
    arrowParens: false,
    braceStyle: '1tbs',
    jsx: false
  }),
  { rules: {
    '@stylistic/space-before-function-paren': ['error', 'always'],
    '@stylistic/arrow-parens': ['error', 'as-needed']
  } },
  {
    files: ['scripts/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } }
  },
  {
    files: ['src/index.js'],
    // Preserve the existing source layout during the dependency-only refresh.
    rules: {
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/indent': ['error', 2, { ignoredNodes: ['ConditionalExpression'] }]
    }
  },
  {
    files: ['src/__tests__/**/*.js', 'test/**/*.{js,cjs}', 'scripts/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { __dirname: 'readonly', process: 'readonly', Buffer: 'readonly' }
    }
  }
]
