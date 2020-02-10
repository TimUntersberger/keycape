import { Migration } from 'mikro-orm';

export class Migration20200210204001 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "account" alter column "email" drop default;');
    this.addSql('alter table "account" alter column "email" drop not null;');
    this.addSql('alter table "account" alter column "email" type varchar(255) using ("email"::varchar(255));');

    this.addSql('alter table "oauth2connection" alter column "account_id" drop default;');
    this.addSql('alter table "oauth2connection" alter column "account_id" drop not null;');
    this.addSql('alter table "oauth2connection" alter column "account_id" type int4 using ("account_id"::int4);');
    this.addSql('alter table "oauth2connection" alter column "account_id" set not null;');
  }

}
