import express from "express";
import Container from "typedi";
import AccountRepository from "../repository/AccountRepository";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import { createRefreshToken, createAccessToken } from "../oauth2";
import { Config } from "../config";

const app = express.Router();
const config = Container.get<Config>("config");
const jwtSecret = config.jwt.secret;

app.get("/auth/refresh", async (req, res) => {
  const repo = Container.get(AccountRepository);
  const { refreshToken } = req.cookies;
  const decodedToken = jwt.verify(refreshToken, jwtSecret);
  console.log(decodedToken);
  const account = await repo.findOne(decodedToken["id"], {
    populate: ["role"],
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

  const account = await repo.findOne(
    {
      username,
    } as any,
    {
      populate: ["role"],
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

app.post("/auth/forgotPassword", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    res.status(400).json({
      error: {
        message: "Username is undefined",
      },
    });
    return;
  }

  const accountRepo = Container.get(AccountRepository);
  const account = await accountRepo.findOneByUsername(username);

  if (!account) {
    res.status(400).json({
      error: {
        message: "Username not found",
      },
    });
    return;
  }

  const token = jwt.sign(
    {
      username,
    },
    jwtSecret,
    {
      expiresIn: "10m",
    }
  );

  res.json({
    token,
  });
});

app.post("/auth/changePassword", async (req, res) => {
  const { username, currentPassword, newPassword } = req.body as any;
  const accountRepo = Container.get(AccountRepository);
  const account = await accountRepo.findOneByUsername(username);

  if (account && account.password === currentPassword) {
    account.password = newPassword;
    await accountRepo.persistAndFlush(account);
    res.status(200).end();
  } else {
    res.status(400).end();
  }
});

app.get("/auth/forgotPassword/callback", async (req, res) => {
  const { token } = req.query;
  const accountRepo = Container.get(AccountRepository);
  try {
    const decodedToken = jwt.verify(token as any, jwtSecret) as any;
    const account = await accountRepo.findOneByUsername(decodedToken.username);

    res.status(200).json({
      hashedPassword: account.password,
    });
  } catch (err) {
    if (err instanceof JsonWebTokenError) {
      res.status(400).json({
        error: {
          message: err.message,
        },
      });
    }
  }
});

export default app;
