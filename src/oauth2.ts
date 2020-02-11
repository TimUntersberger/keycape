import Account from "./entity/Account";
import jwt from "jsonwebtoken";
import Container from "typedi";
import express from "express";
import crypto from "crypto";
import ky from "ky-universal";
import oauth2 from "simple-oauth2";
import OAuth2ConnectionRepository from "./repository/OAuth2ConnectionRepository";
import AccountRepository from "./repository/AccountRepository";
import OAuth2Connection from "./entity/OAuth2Connection";
import { Config } from ".";

const jwtSecret = Container.get<Config>("config").jwt.secret;

export function createAccessToken(account: Account) {
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

export function createRefreshToken(account: Account) {
  return jwt.sign(
    {
      id: account.id
    },
    jwtSecret
  );
}

const config = Container.get<Config>("config");

function createProviderId(id: any) {
  return crypto
    .createHmac("sha256", config.oauth2.providerIdSecret)
    .update(String(id))
    .digest("base64");
}

async function fetchProfileData(
  url: string,
  tokenType: string,
  accessToken: string
) {
  return ky
    .get(url, {
      headers: {
        Authorization: `${tokenType} ${accessToken}`
      }
    })
    .then(res => res.json())
    .catch(x => {
      console.log(x);
    });
}

export function createOAuth2ProviderRoute(
  provider: "google" | "github",
  profileDataUrl: string,
  tokenHostUrl: string,
  tokenPathUrl: string,
  authorizePathUrl: string,
  providerId: string,
  providerSecret: string,
  accessTokenType: string,
  getUsernameFromData: (data: any) => string,
  getEmailFromData: (data: any) => string,
  scopes: string[]
) {
  const router = express.Router();
  const oauth2Provider = oauth2.create({
    client: {
      id: providerId,
      secret: providerSecret
    },
    auth: {
      tokenHost: tokenHostUrl,
      tokenPath: tokenPathUrl,
      authorizePath: authorizePathUrl
    }
  });

  router.get(`/oauth2/${provider}/signin`, async (_req, res) => {
    const authorizationUrl = oauth2Provider.authorizationCode.authorizeURL({
      redirect_uri: `http://${config.domain}:${config.port}/oauth2/${provider}/signin/callback`,
      scope: scopes
    });

    res.redirect(authorizationUrl + "&access_type=offline&prompt=consent");
  });

  router.get(`/oauth2/${provider}/signin/callback`, async (req, res) => {
    const connRepo = Container.get(OAuth2ConnectionRepository);

    const { code } = req.query;
    try {
      const result = await oauth2Provider.authorizationCode.getToken({
        code,
        redirect_uri: `http://${config.domain}:${config.port}/oauth2/${provider}/signin/callback`
      });

      const token = oauth2Provider.accessToken.create(result);
      const data = await fetchProfileData(
        profileDataUrl,
        accessTokenType,
        token.token.access_token
      );
      const providerId = createProviderId(data.id);
      const conn = await connRepo.findOneByProviderId(providerId);

      res.cookie("refresh_token", createRefreshToken(conn.account));
      res.redirect("http://localhost:8080/account");
    } catch (err) {
      console.error(`Access Token Error ${err.message}`);
      console.log(err);
      return res.status(500).json("Authenication failed");
    }
  });

  router.get(`/oauth2/${provider}/signup`, async (_req, res) => {
    const authorizationUrl = oauth2Provider.authorizationCode.authorizeURL({
      redirect_uri: `http://${Container.get("domain")}:${Container.get(
        "port"
      )}/oauth2/${provider}/signup/callback`,
      scope: scopes
    });

    res.redirect(authorizationUrl + "&access_type=offline&prompt=consent");
  });

  router.get(`/oauth2/${provider}/signup/callback`, async (req, res) => {
    const accountRepo = Container.get(AccountRepository);
    const connRepo = Container.get(OAuth2ConnectionRepository);
    const { code } = req.query;
    try {
      const result = await oauth2Provider.authorizationCode.getToken({
        code,
        redirect_uri: `http://${config.domain}:${config.port}/oauth2/${provider}/signup/callback`
      });

      const token = oauth2Provider.accessToken.create(result);
      const data = await fetchProfileData(
        profileDataUrl,
        accessTokenType,
        token.token.access_token
      );

      const account = accountRepo.create({
        username: getUsernameFromData(data),
        email: getEmailFromData(data),
        password: createProviderId(data.id)
      });

      const conn = new OAuth2Connection(
        account.password,
        token.token.refresh_token,
        token.token.access_token,
        "github"
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

  return router;
}
