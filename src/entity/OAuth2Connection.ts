import { Entity, Property, ManyToOne } from "mikro-orm";
import Account from "./Account";
import BaseEntity from "./BaseEntity";

@Entity()
export default class OAuth2Connection extends BaseEntity {
  @Property()
  googleId: string;

  @Property()
  refreshToken: string;

  @Property()
  provider: string;

  @ManyToOne()
  account: Account;

  constructor(googleId: string, refreshToken: string, provider: "google") {
    super();
    this.googleId = googleId;
    this.refreshToken = refreshToken;
    this.provider = provider;
  }
}
