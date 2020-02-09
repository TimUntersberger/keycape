[![](https://img.shields.io/docker/cloud/build/baaka/keycape)](https://hub.docker.com/r/baaka/keycape/builds)  
# Keycape

An authentication server that provides a preconfigured way to use oauth2 providers.

## Supported oauth2 providers (WIP)

* google

## List of environment variables

* `KEYCAPE_DOMAIN`
* `KEYCAPE_PORT`
* `KEYCAPE_JWT_SECRET`
* `KEYCAPE_DB_HOST`
* `KEYCAPE_DB_PORT`
* `KEYCAPE_DB_NAME`
* `KEYCAPE_DB_USERNAME`
* `KEYCAPE_DB_PASSWORD`
* `KEYCAPE_AUTO_MIGRATE`
* `KEYCAPE_OAUTH_SECRET`
* `KEYCAPE_DEFAULT_ROLE`

## Example docker-compose.yml

```yaml
version: '3'
services:
  keycape:
    image: baaka/keycape
    ports:
      - '8080:8080'
    environment:
      - KEYCAPE_DB_HOST=db
      - KEYCAPE_DB_PORT=5432
      - KEYCAPE_DB_NAME=db
      - KEYCAPE_JWT_SECRET=secret
      - KEYCAPE_DB_USERNAME=postgres
      - KEYCAPE_DB_PASSWORD=password
    volumes:
      - ./config.yaml:/app/config.yaml
    depends_on:
      - db
  db:
    image: postgres:12
    ports:
      - '5432:5432'
    environment:
      - POSTGRES_PASSWORD=password
```

## Config

example config.yaml

```YAML
accounts:
  - username: admin
    email: admin@admin.com
    password: test
    role: Admin
roles:
  - name: Admin
    privileges:
      - CreateUser
privileges:
  - CreateUser

```
