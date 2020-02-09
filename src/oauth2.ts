import Account from "./entity/Account";
import jwt from "jsonwebtoken";
import Container from "typedi";

const jwtSecret = Container.get<string>("jwtSecret");

export function createAccessToken(account: Account) {
  return (
    "Bearer " +
    jwt.sign(
      {
        id: account.id,
        role: {
          id: account.role.id,
          name: account.role.name,
          privileges: account.role.privileges.toArray().map(p => p.name)
        }
      },
      jwtSecret
    )
  );
}

export function createRefreshToken(account: Account) {
  return jwt.sign(
    {
      id: account.id
    },
    jwtSecret
  );
}
