import joi from "joi";
import { Providers } from "./entity/OAuth2Connection";

export type Config = {
  domain: string;
  port: number;
  defaultRole: string;
  autoMigrate: boolean;

  jwt: {
    secret: string;
  };

  db: {
    host: string;
    port: number;
    dbname: string;
    username: string;
    password: string;
  };

  oauth2: {
    secret: string;
    providers: {
      provider: Providers;
      id: string;
      secret: string;
    }[];
  };

  accounts: {
    username: string;
    email: string;
    password: string;
    role: string;
  }[];

  roles: {
    name: string;
    privileges: string[];
  }[];

  privileges: string[];
};

const defaultConfig = {
  domain: "localhost",
  port: 8080,
  autoMigrate: true,
  jwt: {
    secret: "secret",
  },
  db: {
    host: "localhost",
    port: 5432,
  },
  oauth2: {
    secret: "secret",
  },
  accounts: [],
  roles: [],
  privileges: [],
};

const configSchema = joi.object({
  domain: joi.string().default(defaultConfig.domain),
  port: joi.number().default(defaultConfig.port),
  defaultRole: joi.string().required(),
  autoMigrate: joi.boolean().default(defaultConfig.autoMigrate),
  jwt: joi
    .object({
      secret: joi.string().default(defaultConfig.jwt.secret),
    })
    .default(defaultConfig.jwt),
  db: joi
    .object({
      host: joi.string().default(defaultConfig.db.host),
      port: joi.number().default(defaultConfig.db.port),
      dbname: joi.string().required(),
      username: joi.string().required(),
      password: joi.string().required(),
    })
    .required(),
  oauth2: joi.object({
    secret: joi.string().default(defaultConfig.oauth2.secret),
    providers: joi
      .array()
      .items(
        joi.object({
          provider: joi.string().valid(["google", "github"]).required(),
          id: joi.string().required(),
          secret: joi.string().required(),
        })
      )
      .default([]),
  }),
  accounts: joi
    .array()
    .items(
      joi.object({
        username: joi.string().required(),
        email: joi.string().email().required(),
        password: joi.string().required(),
        role: joi.string(),
      })
    )
    .default(defaultConfig.accounts),
  roles: joi
    .array()
    .items(
      joi.object({
        name: joi.string().required(),
        privileges: joi.array().items(joi.string()).required(),
      })
    )
    .default(defaultConfig.roles),
  privileges: joi.array().items(joi.string()).default(defaultConfig.privileges),
});

export function validateConfig(config: Config) {
  return configSchema.validate(config);
}

