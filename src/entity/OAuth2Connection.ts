import { Entity, Property, ManyToOne } from "mikro-orm";
import Account from "./Account";
import BaseEntity from "./BaseEntity";

@Entity()
export default class OAuth2Connection extends BaseEntity {
  @Property()
  googleId: string;

  @Property()
  accessToken: string;

  @Property()
  refreshToken: string;

  @Property()
  expiresIn: number;

  @Property()
  tokenType: string;

  @Property()
  expiresAt: Date;

  @Property()
  provider: string;

  @ManyToOne()
  account: Account;

  constructor(
    googleId: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    tokenType: string,
    expiresAt: Date,
    provider: "google"
  ) {
    super();
    this.googleId = googleId;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresIn = expiresIn;
    this.tokenType = tokenType;
    this.expiresAt = expiresAt;
    this.provider = provider;
  }
}
