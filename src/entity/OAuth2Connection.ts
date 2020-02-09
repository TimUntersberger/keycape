import { Entity, Property, ManyToOne } from "mikro-orm";
import Account from "./Account";
import BaseEntity from "./BaseEntity";

@Entity()
export default class OAuth2Connection extends BaseEntity {
  @Property()
  providerId: string;

  @Property()
  refreshToken: string;

  @Property()
  provider: string;

  @ManyToOne()
  account: Account;

  constructor(providerId: string, refreshToken: string, provider: "google") {
    super();
    this.providerId = providerId;
    this.refreshToken = refreshToken;
    this.provider = provider;
  }
}
