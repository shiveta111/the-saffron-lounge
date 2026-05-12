module.exports = {
  apps: [{
    name: 'thesaffronlounge-backend',
    script: 'dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: process.env.STAGING_PORT || 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: process.env.PRODUCTION_PORT || 3000
    }
  }]
};