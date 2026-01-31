import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for Node test environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
