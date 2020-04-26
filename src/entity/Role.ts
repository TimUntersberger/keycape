import { Entity, Property, ManyToMany, Collection } from "mikro-orm";

import Privilege from "./Privilege";
import BaseEntity from "./BaseEntity";

@Entity()
export default class Role extends BaseEntity {
  @Property({
    unique: true,
  })
  name: string;

  @ManyToMany({ entity: () => Privilege, owner: true })
  privileges = new Collection<Privilege>(this);

  constructor(name: string) {
    super();
    this.name = name;
  }
}
