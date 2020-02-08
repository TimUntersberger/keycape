import { EntityRepository, Repository } from "mikro-orm";
import Role from "../entity/Role";
import Container, { Service } from "typedi";

@Service({
  factory: () => Container.get<any>("orm").getRepository(RoleRepository)
})
@Repository(Role)
export default class RoleRepository extends EntityRepository<Role> {
  findOneByName(name: string): Promise<Role> {
    return this.findOne({
      name
    });
  }
}
