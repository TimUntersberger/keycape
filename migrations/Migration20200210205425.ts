import { Migration } from 'mikro-orm';

export class Migration20200210205425 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "oauth2connection" add column "access_token" varchar(255) null;');
    this.addSql('alter table "oauth2connection" alter column "refresh_token" drop default;');
    this.addSql('alter table "oauth2connection" alter column "refresh_token" drop not null;');
    this.addSql('alter table "oauth2connection" alter column "refresh_token" type varchar(255) using ("refresh_token"::varchar(255));');
    this.addSql('alter table "oauth2connection" alter column "account_id" drop default;');
    this.addSql('alter table "oauth2connection" alter column "account_id" drop not null;');
    this.addSql('alter table "oauth2connection" alter column "account_id" type int4 using ("account_id"::int4);');
    this.addSql('alter table "oauth2connection" alter column "account_id" set not null;');
  }

}
