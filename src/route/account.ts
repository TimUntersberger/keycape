import express from "express";
import Container from "typedi";
import AccountRepository from "../repository/AccountRepository";

const router = express.Router();

router.get("/account", async (req, res) => {
  const repo = Container.get(AccountRepository);

  const accounts = await repo.findAll();

  res.json(accounts);
});

router.get("/account/:id", async (req, res) => {
  const { id } = req.params;
  const repo = Container.get(AccountRepository);

  const account = await repo.findOne({ id: +id });

  res.json(account);
});

router.get("/account/:id/oauth2connections", async (req, res) => {
  const { id } = req.params;
  const repo = Container.get(AccountRepository);

  const account = await repo.findOne({ id: +id }, ["oauth2Connections"]);

  res.json(account.oauth2Connections.getItems());
});

router.post("/account", async (req, res) => {
  const repo = Container.get(AccountRepository);

  const account = repo.create(req.body);

  await repo.persist(account, true);

  res.json(account);
});

export default router;
