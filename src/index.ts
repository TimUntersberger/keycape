import express from "express";
import { MikroORM, RequestContext } from "mikro-orm";
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
import OAuth2ConnectionRepository from "./repository/OAuth2ConnectionRepository";
import OAuth2Connection from "./entity/OAuth2Connection";
import { validateConfig, Config } from "./config";

const app = express();

function loadConfig(): Config {
  const config: Config = yaml.parse(
    fs.readFileSync("config.yaml", { encoding: "UTF8" })
  );

  const validationResult = validateConfig(config);

  if (validationResult.error) {
    console.log();
    validationResult.error.details
      .map((d) => `ERROR: ${d.message}`)
      .forEach((x) => console.log(x));
    console.log();
    return null;
  }

  return validationResult.value;
}

async function persistConfig(config: Config) {
  const privRepo = Container.get(PrivilegeRepository);
  const roleRepo = Container.get(RoleRepository);
  const accRepo = Container.get(AccountRepository);

  console.log();

  await Promise.all(
    config.privileges?.map(async (p) => {
      try {
        return await privRepo.persistAndFlush(new Privilege(p));
      } catch (err) {
        console.log(`Privilege with name '${p}' already exists.`);
      }
    })
  );

  await Promise.all(
    config.roles?.map(async (r) => {
      const role = new Role(r.name);

      try {
        await roleRepo.persistAndFlush(role);

        await role.privileges.init();

        r.privileges.forEach(async (p) => {
          role.privileges.add(await privRepo.findOneByName(p));
        });

        await roleRepo.persist(role);
      } catch {
        console.log(`Role with name '${r.name}' aleady exists.`);
      }
    })
  );

  await Promise.all(
    config.accounts?.map(async (a) => {
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

const config = loadConfig();

if (!config) {
  process.exit(1);
}

Container.set("config", config);

import("./orm-config").then((ormConfig) => {
  MikroORM.init(ormConfig.default as any).then(async (orm) => {
    const migrator = orm.getMigrator();

    if (config.autoMigrate) await migrator.up();

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

    app.use(await import("./route/account").then((x) => x.default));
    app.use(await import("./route/role").then((x) => x.default));
    app.use(await import("./route/privilege").then((x) => x.default));
    app.use(await import("./route/auth").then((x) => x.default));
    if (config.oauth2) {
      if (config.oauth2.providers.some((p) => p.provider === "google"))
        app.use(await import("./route/oauth2-google").then((x) => x.default));
      if (config.oauth2.providers.some((p) => p.provider === "github"))
        app.use(await import("./route/oauth2-github").then((x) => x.default));
    }

    app.listen(config.port, "0.0.0.0", () =>
      console.log("Listening on port " + config.port)
    );
  });
});
