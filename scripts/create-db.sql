-- Run this script on your existing PostgreSQL to create the database
-- psql -U postgres -f scripts/create-db.sql

CREATE DATABASE bot_router;
CREATE USER bot_router_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bot_router TO bot_router_user;

\c bot_router

GRANT ALL ON SCHEMA public TO bot_router_user;
