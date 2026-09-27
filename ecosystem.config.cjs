module.exports = {
  apps: [{ name: 'nexo', script: 'server.js', cwd: __dirname, autorestart: true, max_memory_restart: '400M' }],
};
