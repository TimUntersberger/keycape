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
import oauth2 from "simple-oauth2";
import OAuth2ConnectionRepository from "./repository/OAuth2ConnectionRepository";
import OAuth2Connection from "./entity/OAuth2Connection";
import ky from "ky-universal";
import crypto from "crypto";

const app = express();
const domain = process.env.KEYCAPE_DOMAIN || "localhost";
const port = Number(process.env.KEYCAPE_PORT) || 8080;
const jwtSecret = process.env.KEYCAPE_JWT_SECRET || "secret";
const autoMigrate = Boolean(process.env.KEYCAPE_AUTO_MIGRATE) || true;
const oauth2Secret = process.env.KEYCAPE_OAUTH_SECRET || "secret";

const oauth2Google = oauth2.create({
  client: {
    id:
      "349060531457-6naion9025ipiqqbovt8vq60p5esfvq3.apps.googleusercontent.com",
    secret: "gf_ZIsQ5hLY-cl0xgT2p-rdb"
  },
  auth: {
    tokenHost: "https://accounts.google.com/",
    tokenPath: "https://accounts.google.com/o/oauth2/token",
    authorizePath: "https://accounts.google.com/o/oauth2/auth"
  }
});

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

function createGoogleId(id: any) {
  return crypto
    .createHmac("sha256", oauth2Secret)
    .update(id)
    .digest("base64");
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

function createAccessToken(account: Account) {
  return (
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
}

function createRefreshToken(account: Account) {
  return jwt.sign(
    {
      id: account.id
    },
    jwtSecret
  );
}

MikroORM.init(OrmConfig as any).then(async orm => {
  const migrator = orm.getMigrator();

  if (autoMigrate) await migrator.up();

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

  app.get("/oauth2/google/signin", async (_req, res) => {
    const authorizationUrl = oauth2Google.authorizationCode.authorizeURL({
      redirect_uri: `http://${domain}:${port}/oauth2/google/signin/callback`,
      scope: ["https://www.googleapis.com/auth/userinfo.profile"]
    });

    res.redirect(authorizationUrl + "&access_type=offline&prompt=consent");
  });

  app.get("/oauth2/google/signin/callback", async (req, res) => {
    const connRepo = Container.get(OAuth2ConnectionRepository);

    const { code } = req.query;
    try {
      const result = await oauth2Google.authorizationCode.getToken({
        code,
        redirect_uri: `http://${domain}:${port}/oauth2/google/signin/callback`
      });

      const token = oauth2Google.accessToken.create(result);

      const data = await ky
        .get("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: {
            Authorization: `${token.token.token_type} ${token.token.access_token}`
          }
        })
        .json<any>();

      const googleId = createGoogleId(data.id);

      const conn = await connRepo.findOneByGoogleId(googleId);

      res.cookie("refresh_token", createRefreshToken(conn.account));
      res.redirect("http://localhost:8080/account");
    } catch (err) {
      console.error(`Access Token Error ${err.message}`);
      console.log(err);
      return res.status(500).json("Authenication failed");
    }
  });

  app.get("/oauth2/google/signup", async (_req, res) => {
    const authorizationUrl = oauth2Google.authorizationCode.authorizeURL({
      redirect_uri: `http://${domain}:${port}/oauth2/google/signup/callback`,
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email"
      ]
    });

    res.redirect(authorizationUrl + "&access_type=offline&prompt=consent");
  });

  app.get("/oauth2/google/signup/callback", async (req, res) => {
    const accountRepo = Container.get(AccountRepository);
    const connRepo = Container.get(OAuth2ConnectionRepository);
    const { code } = req.query;
    try {
      const result = await oauth2Google.authorizationCode.getToken({
        code,
        redirect_uri: `http://${domain}:${port}/oauth2/google/signup/callback`
      });

      const token = oauth2Google.accessToken.create(result);

      const data = await ky
        .get("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: {
            Authorization: `${token.token.token_type} ${token.token.access_token}`
          }
        })
        .json<any>();

      const account = accountRepo.create({
        username: data.name,
        email: data.email,
        password: createGoogleId(data.id)
      });

      const conn = new OAuth2Connection(
        account.password,
        token.token.refresh_token,
        "google"
      );

      conn.account = account;

      await connRepo.persistAndFlush(conn);

      res.redirect("http://localhost:8080/account");
    } catch (err) {
      console.error(`Access Token Error ${err.message}`);
      console.log(err);
      return res.status(500).json("Authenication failed");
    }
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

  app.get("/auth/refresh", async (req, res) => {
    const repo = Container.get(AccountRepository);
    const { refreshToken } = req.cookies;
    const decodedToken = jwt.verify(refreshToken, jwtSecret);
    console.log(decodedToken);
    const account = await repo.findOne(decodedToken["id"], {
      populate: ["role"]
    });
    if (account) {
      res.cookie("refreshToken", createRefreshToken(account));
      await account.role.privileges.init();
      res.setHeader("Authorization", createAccessToken(account));
      res.end();
    } else {
      res.status(404).end();
    }
  });

  app.get("/auth/authenticate", async (req, res) => {
    const repo = Container.get(AccountRepository);
    const { username, password } = req.query;

    let account: Account;

    account = await repo.findOne(
      {
        username
      },
      {
        populate: ["role"]
      }
    );

    if (account == null) {
      res.status(404).end();
    } else if (account.password != password) {
      res.status(403).end();
    } else {
      res.cookie("refreshToken", createRefreshToken(account));
      await account.role.privileges.init();
      res.setHeader("Authorization", createAccessToken(account));
      res.end();
    }
  });

  app.listen(port, "0.0.0.0", () => console.log("Listening on port " + port));
});
