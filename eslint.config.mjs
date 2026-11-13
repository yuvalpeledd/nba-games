import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', 'migrations/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          // CLAUDE.md's dependency direction.
          depConstraints: [
            {
              sourceTag: 'scope:web',
              onlyDependOnLibsWithTags: ['scope:web', 'scope:shared'],
            },
            {
              sourceTag: 'scope:frontend-api',
              onlyDependOnLibsWithTags: ['scope:frontend-api', 'scope:shared'],
            },
            {
              sourceTag: 'scope:data-fetcher',
              onlyDependOnLibsWithTags: ['scope:data-fetcher', 'scope:shared'],
            },
            {
              // scope:server: the HTTP plumbing frontend-api's own (frontend-api-common).
              sourceTag: 'scope:score-manager',
              onlyDependOnLibsWithTags: [
                'scope:score-manager',
                'scope:shared',
                'scope:server',
              ],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
          ],
        },
      ],
    },
  },
];
