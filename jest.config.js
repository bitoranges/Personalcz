module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'server.js',
    'x402-client.js',
    '!**/node_modules/**',
    '!**/frontend/**',
    '!**/chengzi-personal-space/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  modulePathIgnorePatterns: ['<rootDir>/chengzi-personal-space/', '<rootDir>/frontend/'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
};






