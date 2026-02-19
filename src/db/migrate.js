require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function migrate() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    try {
        console.log('Running migrations...');
        await pool.query(schema);
        console.log('Migrations completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
