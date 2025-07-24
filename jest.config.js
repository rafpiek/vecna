module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  transformIgnorePatterns: ['node_modules/(?!(clipboardy)/)'],
  moduleNameMapper: {
    '^chalk$': '<rootDir>/tests/mocks/chalk.js',
    '^clipboardy$': '<rootDir>/tests/mocks/clipboardy.js',
    '^listr2$': '<rootDir>/tests/mocks/listr2.js'
  },
};
