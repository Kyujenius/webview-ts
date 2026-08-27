module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'simple-import-sort'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: {
    node: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
    ],
  },
  // ─── Package boundary rules ───
  // The dependency direction is: bindings → core → shared, with cli/devtools as
  // sidecars that know only shared. Type tests verify inference; these rules
  // make a layering violation fail lint before it ever compiles.
  overrides: [
    {
      files: ['packages/shared/src/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@webview-ts/*', 'react', 'react-*', 'react-native*', 'vue'],
                message:
                  'shared is the foundation layer — it imports no other package or framework.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['packages/core/src/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@webview-ts/react',
                  '@webview-ts/vue',
                  '@webview-ts/react-native',
                  '@webview-ts/devtools',
                  '@webview-ts/cli',
                  'react',
                  'react-*',
                  'react-native*',
                  'vue',
                ],
                message: 'core knows only shared — no frameworks, no upper layers.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['packages/frameworks/react/src/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  'vue',
                  '@webview-ts/vue',
                  '@webview-ts/react-native',
                  '@webview-ts/devtools',
                  '@webview-ts/cli',
                  'react-native*',
                ],
                message: 'the react binding knows only core/shared and React.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['packages/frameworks/vue/src/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  'react',
                  'react-*',
                  'react-native*',
                  '@webview-ts/react',
                  '@webview-ts/react-native',
                  '@webview-ts/devtools',
                  '@webview-ts/cli',
                ],
                message: 'the vue binding knows only core/shared and Vue.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['packages/frameworks/react-native/src/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  'vue',
                  '@webview-ts/react',
                  '@webview-ts/vue',
                  '@webview-ts/devtools',
                  '@webview-ts/cli',
                ],
                message: 'the RN host knows only core/shared, React, and react-native(-webview).',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['packages/devtools/src/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@webview-ts/core',
                  '@webview-ts/react',
                  '@webview-ts/vue',
                  '@webview-ts/react-native',
                  '@webview-ts/cli',
                ],
                message: 'devtools is a sidecar — it observes through the shared seam only.',
              },
            ],
          },
        ],
      },
    },
    {
      files: ['packages/cli/src/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@webview-ts/core',
                  '@webview-ts/react',
                  '@webview-ts/vue',
                  '@webview-ts/react-native',
                  '@webview-ts/devtools',
                ],
                message: 'the cli exports the contract — it knows only shared.',
              },
            ],
          },
        ],
      },
    },
  ],
};
