const { Client } = require('pg');

async function init() {
  // Try connecting to default 'postgres' db to create our 'aegis_os' db
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres', // Common default
    port: 5432,
  });

  try {
    await client.connect();
    console.log("Connected to Postgres.");
    
    // Create database if not exists
    try {
      await client.query('CREATE DATABASE aegis_os');
      console.log("Database 'aegis_os' created.");
    } catch (e) {
      if (e.code === '42P04') {
        console.log("Database 'aegis_os' already exists.");
      } else {
        throw e;
      }
    }
    
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error("Postgres connection failed. Is it installed and running?");
    console.error(err);
    process.exit(1);
  }
}

init();
