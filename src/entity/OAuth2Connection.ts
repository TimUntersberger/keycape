import { Entity, Property, ManyToOne } from "mikro-orm";
import Account from "./Account";
import BaseEntity from "./BaseEntity";

export type Providers = "google" | "github";

@Entity()
export default class OAuth2Connection extends BaseEntity {
  @Property()
  providerId: string;

  @Property({
    nullable: true,
  })
  refreshToken: string;

  /**
   * If an accessToken is available and the refreshToken is null then it is to assume that the accessToken doesnt expire automatically.
   * It can only expire if the user manually revokes access to the app.
   */
  @Property({
    nullable: true,
  })
  accessToken: string;

  @Property()
  provider: Providers;

  @ManyToOne()
  account: Account;

  constructor(
    providerId: string,
    refreshToken: string,
    accessToken: string,
    provider: Providers
  ) {
    super();
    this.providerId = providerId;
    this.refreshToken = refreshToken;
    this.accessToken = accessToken;
    this.provider = provider;
  }
}
