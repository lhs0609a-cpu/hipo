module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/**',
    '!src/models/**'
  ],
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js']
};
