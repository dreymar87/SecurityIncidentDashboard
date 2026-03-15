require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const DB_PORT = parseInt(process.env.DB_PORT || '5432');

function envConnection() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: DB_PORT,
    database: process.env.DB_NAME || 'security_dashboard',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };
}

module.exports = {
  development: {
    client: 'pg',
    connection: envConnection(),
    migrations: {
      directory: './migrations',
    },
    pool: { min: 0, max: 10 },
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : { ...envConnection(), ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false },
    migrations: {
      directory: './migrations',
    },
    pool: { min: 0, max: 10 },
  },
};
