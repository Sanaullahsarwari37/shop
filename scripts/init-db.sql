-- Shop Management – PostgreSQL setup (run as postgres superuser)
--
--   psql -U postgres -f scripts/init-db.sql
--
-- If CREATE DATABASE fails because it already exists, that is OK.
-- Then grant privileges:
--   psql -U postgres -d shop_management -c "GRANT ALL ON SCHEMA public TO shop;"

CREATE ROLE shop LOGIN PASSWORD 'shop123';
CREATE DATABASE shop_management OWNER shop;
