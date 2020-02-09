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

function createGoogleId(id: any) {
  return crypto
    .createHmac("sha256", oauth2Secret)
    .update(id)
    .digest("base64");
}

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

router.get("/oauth2/google/signin", async (_req, res) => {
  const authorizationUrl = oauth2Google.authorizationCode.authorizeURL({
    redirect_uri: `http://${domain}:${port}/oauth2/google/signin/callback`,
    scope: ["https://www.googleapis.com/auth/userinfo.profile"]
  });

  res.redirect(authorizationUrl + "&access_type=offline&prompt=consent");
});

router.get("/oauth2/google/signin/callback", async (req, res) => {
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

router.get("/oauth2/google/signup", async (_req, res) => {
  const authorizationUrl = oauth2Google.authorizationCode.authorizeURL({
    redirect_uri: `http://${Container.get("domain")}:${Container.get(
      "port"
    )}/oauth2/google/signup/callback`,
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email"
    ]
  });

  res.redirect(authorizationUrl + "&access_type=offline&prompt=consent");
});

router.get("/oauth2/google/signup/callback", async (req, res) => {
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

export default router;
