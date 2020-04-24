import { EntityRepository, Repository } from "mikro-orm";
import Account from "../entity/Account";

@Repository(Account)
export default class AccountRepository extends EntityRepository<Account> {
  findOneByUsername(username: string) {
    return this.findOne({
      username: username,
    });
  }
}
