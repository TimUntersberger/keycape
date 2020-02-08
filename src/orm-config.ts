import Account from "./entity/Account";
import Privilege from "./entity/Privilege";
import Role from "./entity/Role";
import BaseEntity from "./entity/BaseEntity";

const dbName = process.env.KEYCAPE_DB_NAME || "db";
const user = process.env.KEYCAPE_DB_USERNAME || "admin";
const password = process.env.KEYCAPE_DB_PASSWORD || "admin";

export default {
  entities: [Account, Role, Privilege, BaseEntity],
  user,
  password,
  dbName,
  type: "postgresql"
};
