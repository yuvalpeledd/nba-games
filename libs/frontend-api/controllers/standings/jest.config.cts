module.exports = {
  displayName: 'frontend-api-standings-controller',
  preset: '../../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory:
    '../../../../coverage/libs/frontend-api/controllers/standings',
};
