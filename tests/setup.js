// Global test setup
import { jest } from '@jest/globals';

// Mock console methods if needed
global.console = {
  ...console,
  // uncomment to ignore specific logs during tests
  // log: jest.fn(),
  // error: jest.fn(),
  // warn: jest.fn(),
};