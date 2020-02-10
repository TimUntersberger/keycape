import express from "express";
import oauth2 from "simple-oauth2";
import Container from "typedi";
import OAuth2ConnectionRepository from "../repository/OAuth2ConnectionRepository";
import OAuth2Connection from "../entity/OAuth2Connection";
import ky from "ky-universal";
import crypto from "crypto";
import AccountRepository from "../repository/AccountRepository";
import { createRefreshToken } from "../oauth2";

const router = express.Router();
const domain = Container.get<string>("domain");
const port = Container.get<number>("port");
const oauth2Secret = Container.get<string>("oauth2Secret");

function createGithubId(id: any) {
  return crypto
    .createHmac("sha256", oauth2Secret)
    .update(String(id))
    .digest("base64");
}

async function fetchProfileData(accessToken: string) {
  return ky
    .get("https://api.github.com/user", {
      headers: {
        Authorization: `token ${accessToken}`
      }
    })
    .then(res => res.json())
    .catch(x => {
      console.log(x);
    });
}

const oauth2Github = oauth2.create({
  client: {
    id: "d42895f0b5c7fce9b677",
    secret: "c4262d3ed5480f7e1ff601eb4244e409ab367ef7"
  },
  auth: {
    tokenHost: "https://github.com/",
    tokenPath: "https://github.com/login/oauth/access_token",
    authorizePath: "https://github.com/login/oauth/authorize"
  }
});

router.get("/oauth2/github/signin", async (_req, res) => {
  const authorizationUrl = oauth2Github.authorizationCode.authorizeURL({
    redirect_uri: `http://${domain}:${port}/oauth2/github/signin/callback`,
    scope: ["read:user"]
  });

  res.redirect(authorizationUrl + "&access_type=offline&prompt=consent");
});

router.get("/oauth2/github/signin/callback", async (req, res) => {
  const connRepo = Container.get(OAuth2ConnectionRepository);

  const { code } = req.query;
  try {
    const result = await oauth2Github.authorizationCode.getToken({
      code,
      redirect_uri: `http://${domain}:${port}/oauth2/github/signin/callback`
    });

    const token = oauth2Github.accessToken.create(result);

    const data = await fetchProfileData(token.token.access_token);

    const githubId = createGithubId(data.id);

    const conn = await connRepo.findOneByProviderId(githubId);

    res.cookie("refresh_token", createRefreshToken(conn.account));
    res.redirect("http://localhost:8080/account");
  } catch (err) {
    console.error(`Access Token Error ${err.message}`);
    console.log(err);
    return res.status(500).json("Authenication failed");
  }
});

router.get("/oauth2/github/signup", async (_req, res) => {
  const authorizationUrl = oauth2Github.authorizationCode.authorizeURL({
    redirect_uri: `http://${Container.get("domain")}:${Container.get(
      "port"
    )}/oauth2/github/signup/callback`,
    scope: ["read:user"]
  });

  res.redirect(authorizationUrl + "&access_type=offline&prompt=consent");
});

router.get("/oauth2/github/signup/callback", async (req, res) => {
  const accountRepo = Container.get(AccountRepository);
  const connRepo = Container.get(OAuth2ConnectionRepository);
  const { code } = req.query;
  try {
    const result = await oauth2Github.authorizationCode.getToken({
      code,
      redirect_uri: `http://${domain}:${port}/oauth2/github/signup/callback`
    });

    const token = oauth2Github.accessToken.create(result);
    const data = await fetchProfileData(token.token.access_token);

    const account = accountRepo.create({
      username: data.login,
      email: data.email,
      password: createGithubId(data.id)
    });

    console.log(token.token);

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

export default router;
