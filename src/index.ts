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
import { validateConfig, Config, loadPreviousConfig } from "./config";

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
  const prevConfig = loadPreviousConfig();

  const prevPrivileges = prevConfig?.privileges ?? [];
  const currPrivileges = config.privileges ?? [];

  await Promise.all(
    prevPrivileges.map(async (p) => {
      if (!currPrivileges.includes(p)) {
        await privRepo.remove({
          name: p as any,
        });
      }
    })
  );

  currPrivileges.forEach((p) => {
    if (!prevPrivileges.includes(p)) {
      privRepo.persistLater(new Privilege(p));
    }
  });

  await privRepo.flush();

  const prevRoles = prevConfig?.roles?.map((r) => r.name) ?? [];
  const currRoles = config.roles?.map((r) => r.name) ?? [];

  await Promise.all(
    prevRoles
      .filter((r) => !currRoles.includes(r))
      .map(async (r) => {
        roleRepo.remove({
          name: r as any,
        });
      })
  );

  currRoles.forEach((r) => {
    if (!prevRoles.includes(r)) {
      roleRepo.persistLater(new Role(r));
    }
  });

  await roleRepo.flush();

  await Promise.all(
    config.roles?.map(async (r) => {
      let role = await roleRepo.findOneByName(r.name);

      await role.privileges.init();

      const currentPrivileges = [...r.privileges];
      const privilegesToRemove = [];

      role.privileges.getItems().forEach((p) => {
        if (!currentPrivileges.includes(p.name)) {
          privilegesToRemove.push(p.name);
        }
        currentPrivileges.splice(currentPrivileges.indexOf(p.name), 1);
      });

      await Promise.all(
        currentPrivileges.map(async (p) => {
          role.privileges.add(await privRepo.findOneByName(p));
        })
      );

      await Promise.all(
        privilegesToRemove.map(async (p) => {
          role.privileges.remove(await privRepo.findOneByName(p));
        })
      );

      roleRepo.persistLater(role);
    })
  );

  await roleRepo.flush();

  const prevUsernames = prevConfig?.accounts?.map((a) => a.username) ?? [];
  const currUsernames = config.accounts?.map((a) => a.username) ?? [];

  await Promise.all(
    prevUsernames
      .filter((u) => !currUsernames.includes(u))
      .map(async (u) => {
        accRepo.remove({
          username: u as any,
        });
      })
  );

  await Promise.all(
    config.accounts?.map(async (a) => {
      const role = await roleRepo.findOneByName(a.role);
      let acc = await accRepo.findOneByUsername(a.username);

      if (acc) {
        if (acc.password !== a.password) {
          acc.password = a.password;
        }
        if (acc.email !== a.email) {
          acc.email = a.email;
        }
        if (acc.role.id !== role.id) {
          acc.role = role;
        }
      } else {
        acc = new Account(a.username, a.email, a.password, role);
      }

      await accRepo.persistAndFlush(acc);
    })
  );
}

const config = loadConfig();

if (!config) {
  process.exit(1);
}

Container.set("config", config);

/*
 * Creating a migration throws a null pointer exception.
 * Looks like MikroORM is not defined when using the mikro-orm CLI ??? idk tbh
 * */
if (MikroORM) {
  import("./orm-config").then((ormConfig) => {
    MikroORM.init(ormConfig.default as any).then(async (orm) => {
      const migrator = orm.getMigrator();

      if (config.autoMigrate) await migrator.up().catch(() => {});

      Container.set("orm", orm);
      Container.set(AccountRepository, orm.em.getRepository(Account));
      Container.set(RoleRepository, orm.em.getRepository(Role));
      Container.set(PrivilegeRepository, orm.em.getRepository(Privilege));
      Container.set(
        OAuth2ConnectionRepository,
        orm.em.getRepository(OAuth2Connection)
      );

      if (config.persistEntities) {
        await persistConfig(config);
      }

      fs.copyFileSync("config.yaml", "config.prev.yaml");

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
}
