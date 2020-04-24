![Docker](https://github.com/TimUntersberger/keycape/workflows/Docker/badge.svg?branch=master)
[![Netlify Status](https://api.netlify.com/api/v1/badges/f4b45f35-0fee-4bb2-8348-fb4b24be8c61/deploy-status)](https://app.netlify.com/sites/keycape/deploys)

# Keycape

An authentication server that provides a preconfigured way to use oauth2 providers.

## Supported oauth2 providers (WIP)

* google
* github

## config.yaml

```yaml
defaultRole: Admin # the role that gets assigned to every account where the role is not defined
domain: localhost # domainname of the server hosting the keycape server
port: 8080 # port of the keycape server
autoMigrate: true # whether to migrate on startup. Should be turned off in production
jwt:
  secret: secret # secret used to hash the authentication JWT
db:
  host: localhost
  port: 5432
  dbname: admin
  username: admin
  password: admin
oauth2:
  secret: secret # used to salt the hash of the password
  providers:
    - provider: google
      id: "345i0345jfkgjd02jj0i4503" # id given by provider
      secret: "0252ujksdl;fjk234i0" # secret given by provider
#Everything below is optional to make sure that these entities exist on startup.
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

## Example docker-compose.yml

```yaml
version: '3'
services:
  keycape:
    image: baaka/keycape
    ports:
      - '8080:8080'
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
