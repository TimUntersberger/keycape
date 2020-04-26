import "reflect-metadata";
import Account from "./entity/Account";
import Privilege from "./entity/Privilege";
import Role from "./entity/Role";
import BaseEntity from "./entity/BaseEntity";
import path from "path";
import OAuth2Connection from "./entity/OAuth2Connection";
import { ReflectMetadataProvider } from "mikro-orm";
import Container from "typedi";
import "./";
import { Config } from "./config";

const config = Container.get<Config>("config");

export default {
  entities: [Account, Role, Privilege, BaseEntity, OAuth2Connection],
  entitiesDirsTs: ["./src/entity"],
  host: config.db.host,
  port: config.db.port,
  user: config.db.username,
  password: config.db.password,
  dbName: config.db.dbname,
  debug: true,
  type: "postgresql",
  metaDataProvider: ReflectMetadataProvider,
  migrations: {
    pattern: /^[\w-]+\d+\.(ts|js)$/,
    path: path.join(__dirname, "../migrations"),
  },
};
