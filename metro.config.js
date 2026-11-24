const { getDefaultConfig } = require('expo/metro-config');
const { ensureBackend } = require('./scripts/ensure-backend');

// Ensure Flask backend is running on port 5000 whenever Metro server starts
try {
  ensureBackend();
} catch (e) {
  console.warn('[Metro] Backend check notice:', e.message);
}

const config = getDefaultConfig(__dirname);

module.exports = config;
