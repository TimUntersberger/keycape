import { Migration } from 'mikro-orm';

export class Migration20200426082935 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "oauth2connection" drop constraint if exists "oauth2connection_provider_check";');
    this.addSql('alter table "oauth2connection" alter column "provider" type json using ("provider"::json);');
    this.addSql('alter table "oauth2connection" drop constraint if exists "oauth2connection_account_id_check";');
    this.addSql('alter table "oauth2connection" alter column "account_id" type int4 using ("account_id"::int4);');

    this.addSql('drop table if exists "scope_to_role" cascade;');
  }

}
