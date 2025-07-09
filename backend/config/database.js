const { Pool } = require('pg');

// Create pool configuration
const poolConfig = {
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Use individual config for better control
poolConfig.host = process.env.DB_HOST;
poolConfig.port = process.env.DB_PORT;
poolConfig.database = process.env.DB_NAME;
poolConfig.user = process.env.DB_USER;
poolConfig.password = process.env.DB_PASSWORD;
poolConfig.ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;

const pool = new Pool(poolConfig);

// Test the connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

// Function to run queries
const query = (text, params) => pool.query(text, params);

// Function to get a client from the pool
const getClient = () => pool.connect();

// Function to close the pool
const closePool = () => pool.end();

module.exports = {
    query,
    getClient,
    closePool,
    pool
}; 