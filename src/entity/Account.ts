import {
  Entity,
  Property,
  BeforeCreate,
  ManyToOne,
  Collection,
  OneToMany
} from "mikro-orm";
import Role from "./Role";
import RoleRepository from "../repository/RoleRepository";
import Container from "typedi";
import BaseEntity from "./BaseEntity";
import OAuth2Connection from "./OAuth2Connection";

const defaultRole = process.env.KEYCAPE_DEFAULT_ROLE || "Admin";

@Entity()
export default class Account extends BaseEntity {
  @Property({
    unique: true
  })
  username: string;

  @Property({
    nullable: true
  })
  email: string;

  @Property()
  password: string;

  @ManyToOne()
  role!: Role;

  @OneToMany(
    () => OAuth2Connection,
    c => c.account
  )
  oauth2Connections = new Collection<OAuth2Connection>(this);

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
      this.role = await Container.get(RoleRepository).findOneByName(
        defaultRole
      );
    }
  }
}
