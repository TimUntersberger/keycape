import express from "express";
import Container from "typedi";
import AccountRepository from "../repository/AccountRepository";

const router = express.Router();

router.get("/", async (req, res) => {
  const repo = Container.get(AccountRepository);

  const accounts = await repo.findAll();

  res.json(accounts);
});

router.post("/", async (req, res) => {
  const repo = Container.get(AccountRepository);

  const account = repo.create(req.body);

  await repo.persist(account, true);

  res.json(account);
});

export default router;
