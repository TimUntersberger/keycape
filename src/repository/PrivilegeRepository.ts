import { EntityRepository, Repository } from "mikro-orm";
import Privilege from "../entity/Privilege";
import Container, { Service } from "typedi";

@Service({
  factory: () => Container.get<any>("orm").getRepository(PrivilegeRepository)
})
@Repository(Privilege)
export default class PrivilegeRepository extends EntityRepository<Privilege> {
  findOneByName(name: string): Promise<Privilege> {
    return this.findOne({
      name
    });
  }
}
