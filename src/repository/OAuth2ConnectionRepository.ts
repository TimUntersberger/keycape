import { EntityRepository, Repository } from "mikro-orm";
import OAuth2Connection from "../entity/OAuth2Connection";

@Repository(OAuth2Connection)
export default class OAuth2ConnectionRepository extends EntityRepository<
  OAuth2Connection
> {
  findOneByProviderId(providerId: string): Promise<OAuth2Connection> {
    return this.findOne(
      {
        providerId: providerId as any,
      },
      ["account.role.privileges"]
    );
  }
}
