import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'webview-ts',
  tagline: 'Type-safe WebView ↔ Host bridge for TypeScript',
  url: 'https://kyujenius.github.io',
  baseUrl: '/webview-ts/',
  organizationName: 'Kyujenius',
  projectName: 'webview-ts',
  favicon: 'img/logo.svg',

  onBrokenLinks: 'throw',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ko'],
    localeConfigs: {
      en: { label: 'English', htmlLang: 'en' },
      ko: { label: '한국어', htmlLang: 'ko' },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Kyujenius/webview-ts/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'webview-ts',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        { type: 'localeDropdown', position: 'right' },
        {
          href: 'https://github.com/Kyujenius/webview-ts',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `MIT Licensed. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
