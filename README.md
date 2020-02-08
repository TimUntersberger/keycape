## List of environment variables

* `KEYCAPE_PORT`
* `KEYCAPE_JWT_SECRET`
* `KEYCAPE_DB_HOST`
* `KEYCAPE_DB_PORT`
* `KEYCAPE_DB_NAME`
* `KEYCAPE_DB_USERNAME`
* `KEYCAPE_DB_PASSWORD`

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
