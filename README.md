[![](https://img.shields.io/docker/cloud/build/baaka/keycape)](https://hub.docker.com/r/baaka/keycape/builds)  
# Keycape

## TODO

* Think about the current accesstoken payload. Maybe we should only send the id of the account instead of the whole account.
* Rename Privilege to Scope (To align more to the oauth2 spec)
* Support either accesstoken or refreshtoken invalidation (most likely by using a blacklist in redis)

An authentication server that provides a preconfigured way to use oauth2 providers.

## Supported oauth2 providers (WIP)

* google

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
  providerIdSecret: secret # used to salt the hashed id of the oauth2 connection. The result is used as password and id
  providers:
    - provider: google
      id: "345i0345jfkgjd02jj0i4503" # id given by provider
      secret: "0252ujksdl;fjk234i0" # secret given by provider
      scopes: # any additional scopes you need
        - everything
        - idk
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
