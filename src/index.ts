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
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import yaml from "yaml";
import fs from "fs";

const app = express();
const port = process.env.KEYCAPE_PORT || 8080;
const jwtSecret = process.env.KEYCAPE_JWT_SECRET || "secret";
const autoMigrate = process.env.KEYCAPE_AUTO_MIGRATE || true;

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

  Container.set("orm", orm);
  Container.set(AccountRepository, orm.em.getRepository(Account));
  Container.set(RoleRepository, orm.em.getRepository(Role));
  Container.set(PrivilegeRepository, orm.em.getRepository(Privilege));

  await persistConfig(
    yaml.parse(fs.readFileSync("config.yaml", { encoding: "UTF8" }))
  );

  app.use((_req, _res, next) => RequestContext.create(orm.em, next));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/account", async (_req, res) => {
    const repo = Container.get(AccountRepository);

    const accounts = await repo.findAll();

    res.json(accounts);
  });

  app.post("/account", async (req, res) => {
    const repo = Container.get(AccountRepository);

    const account = repo.create(req.body);

    await repo.persist(account, true);

    res.json(account);
  });

  app.get("/role", async (_req, res) => {
    const repo = Container.get(RoleRepository);

    const roles = await repo.findAll();

    res.json(roles);
  });

  app.post("/role", async (req, res) => {
    const repo = Container.get(RoleRepository);

    const role = repo.create(req.body);

    await repo.persist(role, true);

    res.json(role);
  });

  app.post("/role/:roleId/privileges", async (req, res) => {
    const { roleId } = req.params;
    const privilegeIds: number[] = req.body;
    const roleRepo = Container.get(RoleRepository);
    const privRepo = Container.get(PrivilegeRepository);

    const role = await roleRepo.findOne(roleId as any);
    const privileges = await privRepo.find({
      "id:in": privilegeIds
    } as any);

    await role.privileges.init();

    role.privileges.add(...privileges);

    roleRepo.persistAndFlush(role);

    res.end();
  });

  app.get("/role/:roleId/privileges", async (req, res) => {
    const { roleId } = req.params;
    const roleRepo = Container.get(RoleRepository);

    const role = await roleRepo.findOne(roleId as any);

    await role.privileges.init();

    res.json(role.privileges.toArray());
  });

  app.get("/privilege", async (_req, res) => {
    const repo = Container.get(PrivilegeRepository);

    const privileges = await repo.findAll();

    res.json(privileges);
  });

  app.post("/privilege", async (req, res) => {
    const repo = Container.get(PrivilegeRepository);

    const privilege = repo.create(req.body);

    await repo.persist(privilege, true);

    res.json(privilege);
  });

  app.get("/authenticate", async (req, res) => {
    const repo = Container.get(AccountRepository);
    const { refreshToken } = req.cookies;
    const { username, password } = req.query;

    let account: Account;

    if (!refreshToken) {
      account = await repo.findOne(
        {
          username
        },
        {
          populate: ["role"]
        }
      );
    } else {
      const decodedToken = jwt.verify(refreshToken, jwtSecret);
      account = await repo.findOne(decodedToken["id"], {
        populate: ["role"]
      });
    }

    if (account == null) {
      res.status(404).end();
    } else if (account.password != password) {
      res.status(403).end();
    } else {
      res.cookie(
        "refreshToken",
        jwt.sign(
          {
            id: account.id
          },
          jwtSecret
        )
      );
      await account.role.privileges.init();
      res.setHeader(
        "Authorization",
        "Bearer " +
          jwt.sign(
            {
              id: account.id,
              role: {
                id: account.role.id,
                name: account.role.name,
                privileges: account.role.privileges.toArray().map(p => p.name)
              }
            },
            jwtSecret
          )
      );
      res.end();
    }
  });

  app.listen(port, () => console.log("Listening on port " + port));
});
