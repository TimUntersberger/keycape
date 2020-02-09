import express from "express";
import Container from "typedi";
import AccountRepository from "../repository/AccountRepository";
import jwt from "jsonwebtoken";
import Account from "../entity/Account";
import { createRefreshToken, createAccessToken } from "../oauth2";

const app = express.Router();
const jwtSecret = Container.get<string>("jwtSecret");

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

export default app;
