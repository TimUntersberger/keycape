import { Entity, Property, BeforeCreate, ManyToOne } from "mikro-orm";
import Role from "./Role";
import RoleRepository from "../repository/RoleRepository";
import Container from "typedi";
import BaseEntity from "./BaseEntity";

@Entity()
export default class Account extends BaseEntity {
  @Property({
    unique: true
  })
  username: string;

  @Property()
  email: string;

  @Property()
  password: string;

  @ManyToOne()
  role!: Role;

  constructor(username: string, email: string, password: string, role: Role) {
    super();
    this.username = username;
    this.email = email;
    this.password = password;
    this.role = role;
  }

  @BeforeCreate()
  async beforeCreate() {
    if (!this.role) {
      this.role = await Container.get(RoleRepository).findOne({
        name: "Admin"
      });
    }
  }
}
