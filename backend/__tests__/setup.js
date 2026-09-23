// Test setup file
// This runs before each test suite

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.PORT = 5556;

// Increase timeout for async operations
// A cold schema sync creates close to 100 tables. External/workspace drives can
// take longer than 10 seconds even though the same suite is fast on local SSD.
jest.setTimeout(120000);

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};
