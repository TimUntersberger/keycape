import express from "express";
import Container from "typedi";
import RoleRepository from "../repository/RoleRepository";
import PrivilegeRepository from "../repository/PrivilegeRepository";

const router = express.Router();

router.get("/role", async (_req, res) => {
  const repo = Container.get(RoleRepository);

  const roles = await repo.findAll();

  res.json(roles);
});

router.post("/role", async (req, res) => {
  const repo = Container.get(RoleRepository);

  const role = repo.create(req.body);

  await repo.persist(role, true);

  res.json(role);
});

router.post("/role/:roleId/privileges", async (req, res) => {
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

router.get("/role/:roleId/privileges", async (req, res) => {
  const { roleId } = req.params;
  const roleRepo = Container.get(RoleRepository);

  const role = await roleRepo.findOne(roleId as any);

  await role.privileges.init();

  res.json(role.privileges.toArray());
});

export default router;
