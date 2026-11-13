const { join } = require('node:path');
const nxPreset = require('@nx/jest/preset').default;

// jose (firebase-admin's jwks-rsa requires it, which Node does natively) ships ES modules only, and Jest runs
// CommonJS: it compiles it like the code. The rest of node_modules is left as it is.
const ES_MODULES = '(?:jose)';

module.exports = {
  ...nxPreset,
  transform: {
    [`/node_modules/(?:\\.pnpm/[^/]+/node_modules/)?${ES_MODULES}/.+\\.c?js$`]:
      [
        'ts-jest',
        {
          tsconfig: join(__dirname, 'tsconfig.jest-es-modules.json'),
          diagnostics: false,
        },
      ],
    ...nxPreset.transform,
  },
  transformIgnorePatterns: [`/node_modules/(?!(?:\\.pnpm/)?${ES_MODULES}[@/])`],
};
