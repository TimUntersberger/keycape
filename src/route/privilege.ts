import express from "express";
import Container from "typedi";
import PrivilegeRepository from "../repository/PrivilegeRepository";

const router = express.Router();

router.get("/privilege", async (_req, res) => {
  const repo = Container.get(PrivilegeRepository);

  const privileges = await repo.findAll();

  res.json(privileges);
});

router.post("/privilege", async (req, res) => {
  const repo = Container.get(PrivilegeRepository);

  const privilege = repo.create(req.body);

  await repo.persist(privilege, true);

  res.json(privilege);
});

export default router;
