import { Migration } from 'mikro-orm';

export class Migration20200209135850 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "oauth2connection" add column "account_id" int4 not null;');

    this.addSql('drop table if exists "account_to_oauth2connection" cascade;');
  }

}
