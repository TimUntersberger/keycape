import { Entity, Property } from "mikro-orm";
import BaseEntity from "./BaseEntity";

@Entity()
export default class Scope extends BaseEntity {
  @Property({
    unique: true,
  })
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }
}
