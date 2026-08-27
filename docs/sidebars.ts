import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    'getting-started',
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: ['core-concepts/contract', 'core-concepts/architecture'],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/schema-validation',
        'guides/interceptors',
        'guides/events',
        'guides/timeout-retry-cache',
        'guides/fallback-mode',
        'guides/multi-webview-routing',
        'guides/security',
        'guides/devtools',
        'guides/contract-export',
        'guides/patterns',
        'guides/testing',
      ],
    },
    {
      type: 'category',
      label: 'Platforms',
      collapsed: false,
      items: [
        'platforms/react',
        'platforms/vue',
        'platforms/react-native',
        'platforms/iframe',
        'platforms/custom-adapters',
      ],
    },
  ],
};

export default sidebars;
