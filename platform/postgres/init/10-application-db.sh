#!/bin/bash
# Crea la base de datos y el usuario del catálogo de aplicaciones.
#
# La imagen oficial de PostgreSQL ejecuta los scripts de
# /docker-entrypoint-initdb.d SOLO cuando el volumen de datos está vacío.
# Con el volumen actual (ya inicializado) este script no se ejecuta.
#
# La base de datos it_service_manager y su usuario los crea la propia imagen
# a partir de POSTGRES_DB, POSTGRES_USER y POSTGRES_PASSWORD.
set -euo pipefail

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     --set app_password="$APPLICATION_DB_PASSWORD" <<-'EOSQL'
	CREATE USER application_user WITH PASSWORD :'app_password';
	CREATE DATABASE application_db OWNER application_user;
	REVOKE CONNECT ON DATABASE application_db FROM PUBLIC;
	GRANT CONNECT ON DATABASE application_db TO application_user;
	REVOKE CONNECT ON DATABASE it_service_manager FROM PUBLIC;
EOSQL
