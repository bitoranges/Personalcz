// Jest setup file
// Set NODE_ENV to test to prevent server from starting during tests
process.env.NODE_ENV = 'test';

// Mock console methods if needed to reduce noise in test output
// Uncomment if you want to suppress console.log during tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };
