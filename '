import { Entity, Property, ManyToOne } from "mikro-orm";
import Account from "./Account";
import BaseEntity from "./BaseEntity";

@Entity()
export default class OAuth2Connection extends BaseEntity {
  @Property()
  providerId: string;

  @Property({
    nullable: true
  })
  refreshToken: string;

  /**
   * If a accessToken is available and the refreshToken is null then it is to assume that the accesToken doesnt expires automatically.
   * It can only expire if the user manually revokes access to the app.
   */
  @Property({
    nullable: true
  })
  accessToken: string;

  @Property()
  provider: string;

  @ManyToOne()
  account: Account;

  constructor(
    providerId: string,
    refreshToken: string,
    accessToken: string,
    provider: "google" | "github"
  ) {
    super();
    this.providerId = providerId;
    this.refreshToken = refreshToken;
    this.accessToken = accessToken;
    this.provider = provider;
  }
}
