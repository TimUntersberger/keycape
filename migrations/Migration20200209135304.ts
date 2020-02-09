import { Migration } from 'mikro-orm';

export class Migration20200209135304 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "oauth2connection" ("id" serial primary key, "created_at" timestamptz(0) not null default now(), "updated_at" timestamptz(0) not null default now(), "access_token" varchar(255) not null, "refresh_token" varchar(255) not null, "expires_in" int4 not null, "scope" varchar(255) not null, "token_type" varchar(255) not null, "id_token" varchar(255) not null, "expires_at" timestamptz(0) not null);');

    this.addSql('create table "account_to_oauth2connection" ("account_id" int4 not null, "oauth2connection_id" int4 not null);');
    this.addSql('alter table "account_to_oauth2connection" add constraint "account_to_oauth2connection_pkey" primary key ("account_id", "oauth2connection_id");');

    this.addSql('alter table "account_to_oauth2connection" add constraint "account_to_oauth2connection_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "account_to_oauth2connection" add constraint "account_to_oauth2connection_oauth2connection_id_foreign" foreign key ("oauth2connection_id") references "oauth2connection" ("id") on update cascade on delete cascade;');
  }

}
