// Minimal test setup file
// This file provides basic configuration for the test environment

// Test utilities that can be imported by test files
export const testUtils = {
  mockAIResponse: (response: any) => ({
    success: true,
    data: response,
    timestamp: Date.now(),
  }),
  mockError: (message: string) => ({
    success: false,
    error: message,
    timestamp: Date.now(),
  }),
};