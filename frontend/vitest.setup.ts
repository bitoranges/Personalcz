import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock window.location for tests
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:5173',
    href: 'http://localhost:5173',
    protocol: 'http:',
    host: 'localhost:5173',
    hostname: 'localhost',
    port: '5173',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Ensure addEventListener and removeEventListener are available
if (!window.addEventListener) {
  (window as any).addEventListener = () => {};
}
if (!window.removeEventListener) {
  (window as any).removeEventListener = () => {};
}
if (!window.dispatchEvent) {
  (window as any).dispatchEvent = () => true;
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});






