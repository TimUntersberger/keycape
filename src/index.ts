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
import OAuth2ConnectionRepository from "./repository/OAuth2ConnectionRepository";
import OAuth2Connection from "./entity/OAuth2Connection";

const app = express();
const domain = process.env.KEYCAPE_DOMAIN || "localhost";
const port = Number(process.env.KEYCAPE_PORT) || 8080;
const jwtSecret = process.env.KEYCAPE_JWT_SECRET || "secret";
const autoMigrate = Boolean(process.env.KEYCAPE_AUTO_MIGRATE) || true;
const oauth2Secret = process.env.KEYCAPE_OAUTH_SECRET || "secret";

type Config = {
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

  await persistConfig(
    yaml.parse(fs.readFileSync("config.yaml", { encoding: "UTF8" }))
  );

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
