import { Migration } from 'mikro-orm';

export class Migration20200209144447 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "oauth2connection" add column "google_id" varchar(255) not null;');
    this.addSql('alter table "oauth2connection" alter column "account_id" drop default;');
    this.addSql('alter table "oauth2connection" alter column "account_id" drop not null;');
    this.addSql('alter table "oauth2connection" alter column "account_id" type int4 using ("account_id"::int4);');
    this.addSql('alter table "oauth2connection" alter column "account_id" set not null;');
  }

}
