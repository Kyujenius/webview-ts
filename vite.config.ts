import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
  },
  fmt: {
    semi: true,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'es5',
    printWidth: 100,
    arrowParens: 'always',
    sortPackageJson: false,
    ignorePatterns: [],
  },
});
