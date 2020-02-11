import express from "express";
import { MikroORM, RequestContext } from "mikro-orm";
import OrmConfig from "./orm-config";
import { Container } from "typedi";
import AccountRepository from "./repository/AccountRepository";
import RoleRepository from "./repository/RoleRepository";
import PrivilegeRepository from "./repository/PrivilegeRepository";
import Account from "./entity/Account";
import Role from "./entity/Role";
import Privilege from "./entity/Privilege";
import cookieParser from "cookie-parser";
import yaml from "yaml";
import fs from "fs";
import joi from "joi";
import OAuth2ConnectionRepository from "./repository/OAuth2ConnectionRepository";
import OAuth2Connection from "./entity/OAuth2Connection";

const app = express();
const domain = process.env.KEYCAPE_DOMAIN || "localhost";
const port = Number(process.env.KEYCAPE_PORT) || 8080;
const jwtSecret = process.env.KEYCAPE_JWT_SECRET || "secret";
const autoMigrate = Boolean(process.env.KEYCAPE_AUTO_MIGRATE) || true;
const oauth2Secret = process.env.KEYCAPE_OAUTH_SECRET || "secret";

type Config = {
  domain?: string;
  port?: number;
  defaultRole: string;
  autoMigrate?: boolean;

  jwt: {
    secret: string;
  };

  db: {
    host?: string;
    port?: number;
    dbname?: string;
    username: string;
    password: string;
  };

  oauth2: {
    providerIdSecret: string;
  };

  accounts?: {
    username: string;
    email: string;
    password: string;
    role: string;
  }[];

  roles?: {
    name: string;
    privileges: string[];
  }[];

  privileges?: string[];
};

function loadConfig(): Config {
  const config: Config = yaml.parse(
    fs.readFileSync("config.yaml", { encoding: "UTF8" })
  );

  const configSchema = joi.object({
    domain: joi.string().default("localhost"),
    port: joi.number().required(),
    defaultRole: joi.string().required(),
    autoMigrate: joi.boolean().default(true),
    jwt: joi
      .object({
        secret: joi.string().required()
      })
      .required(),
    db: joi
      .object({
        host: joi.string().default("localhost"),
        port: joi.number().default(5432),
        dbname: joi.string(),
        username: joi.string().required(),
        password: joi.string().required()
      })
      .required(),
    oauth2: joi
      .object({
        providerIdSecret: joi.string().required()
      })
      .required(),
    accounts: joi
      .array()
      .items(
        joi.object({
          username: joi.string().required(),
          email: joi
            .string()
            .email()
            .required(),
          password: joi.string().required(),
          role: joi.string()
        })
      )
      .default([]),
    roles: joi
      .array()
      .items(
        joi.object({
          name: joi.string().required(),
          privileges: joi
            .array()
            .items(joi.string())
            .required()
        })
      )
      .default([]),
    privileges: joi
      .array()
      .items(joi.string())
      .default([])
  });

  const validationResult = configSchema.validate(config);

  if (validationResult.error) {
    console.log(validationResult.error.details[0].message);

    return null;
  }

  return config;
}

async function persistConfig(config: Config) {
  const privRepo = Container.get(PrivilegeRepository);
  const roleRepo = Container.get(RoleRepository);
  const accRepo = Container.get(AccountRepository);

  console.log();

  await Promise.all(
    config.privileges?.map(async p => {
      try {
        return await privRepo.persistAndFlush(new Privilege(p));
      } catch (err) {
        console.log(`Privilege with name '${p}' already exists.`);
      }
    })
  );

  await Promise.all(
    config.roles?.map(async r => {
      const role = new Role(r.name);

      try {
        await roleRepo.persistAndFlush(role);

        await role.privileges.init();

        r.privileges.forEach(async p => {
          role.privileges.add(await privRepo.findOneByName(p));
        });

        await roleRepo.persist(role);
      } catch {
        console.log(`Role with name '${r.name}' aleady exists.`);
      }
    })
  );

  await Promise.all(
    config.accounts?.map(async a => {
      const role = await roleRepo.findOneByName(a.role);
      const acc = new Account(a.username, a.email, a.password, role);

      try {
        await accRepo.persistAndFlush(acc);
      } catch {
        console.log(`Account with username '${a.username}' already exists.`);
      }
    })
  );

  console.log();
}

MikroORM.init(OrmConfig as any).then(async orm => {
  const config = loadConfig();

  if (!config) {
    return;
  }

  const migrator = orm.getMigrator();

  if (autoMigrate) await migrator.up();

  Container.set("domain", domain);
  Container.set("port", port);
  Container.set("jwtSecret", jwtSecret);
  Container.set("oauth2Secret", oauth2Secret);

  Container.set("orm", orm);
  Container.set(AccountRepository, orm.em.getRepository(Account));
  Container.set(RoleRepository, orm.em.getRepository(Role));
  Container.set(PrivilegeRepository, orm.em.getRepository(Privilege));
  Container.set(
    OAuth2ConnectionRepository,
    orm.em.getRepository(OAuth2Connection)
  );

  await persistConfig(config);

  app.use((_req, _res, next) => RequestContext.create(orm.em, next));
  app.use(express.json());
  app.use(cookieParser());

  app.use(await import("./route/account").then(x => x.default));
  app.use(await import("./route/role").then(x => x.default));
  app.use(await import("./route/privilege").then(x => x.default));
  app.use(await import("./route/auth").then(x => x.default));
  app.use(await import("./route/oauth2-google").then(x => x.default));
  app.use(await import("./route/oauth2-github").then(x => x.default));

  app.listen(port, "0.0.0.0", () => console.log("Listening on port " + port));
});
