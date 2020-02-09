import Account from "./entity/Account";
import Privilege from "./entity/Privilege";
import Role from "./entity/Role";
import BaseEntity from "./entity/BaseEntity";
import path from "path";
import OAuth2Connection from "./entity/OAuth2Connection";

const host = process.env.KEYCAPE_DB_HOST || "localhost";
const port = process.env.KEYCAPE_DB_PORT || "5432";
const dbName = process.env.KEYCAPE_DB_NAME || "admin";
const user = process.env.KEYCAPE_DB_USERNAME || "admin";
const password = process.env.KEYCAPE_DB_PASSWORD || "admin";

export default {
  entities: [Account, Role, Privilege, BaseEntity, OAuth2Connection],
  host,
  port,
  user,
  password,
  dbName,
  type: "postgresql",
  migrations: {
    path: path.join(__dirname, "../migrations")
  }
};
