import { Migration } from 'mikro-orm';

export class Migration20200426130623 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "account" ("id" serial primary key, "created_at" timestamptz(0) not null default now(), "updated_at" timestamptz(0) not null default now(), "username" varchar(255) not null, "email" varchar(255) null, "password" varchar(255) not null, "role_id" int4 not null);');
    this.addSql('alter table "account" add constraint "account_username_unique" unique ("username");');

    this.addSql('create table "role" ("id" serial primary key, "created_at" timestamptz(0) not null default now(), "updated_at" timestamptz(0) not null default now(), "name" varchar(255) not null);');
    this.addSql('alter table "role" add constraint "role_name_unique" unique ("name");');

    this.addSql('create table "privilege" ("id" serial primary key, "created_at" timestamptz(0) not null default now(), "updated_at" timestamptz(0) not null default now(), "name" varchar(255) not null);');
    this.addSql('alter table "privilege" add constraint "privilege_name_unique" unique ("name");');

    this.addSql('create table "oauth2connection" ("id" serial primary key, "created_at" timestamptz(0) not null default now(), "updated_at" timestamptz(0) not null default now(), "provider_id" varchar(255) not null, "refresh_token" varchar(255) null, "access_token" varchar(255) null, "provider" json not null, "account_id" int4 not null);');

    this.addSql('create table "role_to_privilege" ("role_id" int4 not null, "privilege_id" int4 not null);');
    this.addSql('alter table "role_to_privilege" add constraint "role_to_privilege_pkey" primary key ("role_id", "privilege_id");');

    this.addSql('alter table "account" add constraint "account_role_id_foreign" foreign key ("role_id") references "role" ("id") on update cascade;');

    this.addSql('alter table "oauth2connection" add constraint "oauth2connection_account_id_foreign" foreign key ("account_id") references "account" ("id") on update cascade;');

    this.addSql('alter table "role_to_privilege" add constraint "role_to_privilege_role_id_foreign" foreign key ("role_id") references "role" ("id") on update cascade on delete cascade;');
    this.addSql('alter table "role_to_privilege" add constraint "role_to_privilege_privilege_id_foreign" foreign key ("privilege_id") references "privilege" ("id") on update cascade on delete cascade;');
  }

}
