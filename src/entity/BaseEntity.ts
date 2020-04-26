import { IdEntity, PrimaryKey, Property, BeforeUpdate } from "mikro-orm";

export default abstract class BaseEntity implements IdEntity<{ id: number }> {
  @PrimaryKey()
  id!: number;

  @Property({
    default: "now()",
  })
  createdAt: Date;

  @Property({
    default: "now()",
  })
  updatedAt: Date;

  @BeforeUpdate()
  beforeUpdate() {
    this.updatedAt = new Date();
  }
}
