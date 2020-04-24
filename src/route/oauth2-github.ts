import { createOAuth2ProviderRoute, getProviderByName } from "../oauth2";

const provider = getProviderByName("github");

const router = createOAuth2ProviderRoute(
  "github",
  "https://api.github.com/user",
  "https://github.com",
  "https://github.com/login/oauth/access_token",
  "https://github.com/login/oauth/authorize",
  provider.id,
  provider.secret,
  "token",
  (data) => data.login,
  (data) => data.email,
  ["read:user"]
);

export default router;
