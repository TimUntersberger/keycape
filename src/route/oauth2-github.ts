import { createOAuth2ProviderRoute } from "../oauth2";

const router = createOAuth2ProviderRoute(
  "github",
  "https://api.github.com/user",
  "https://github.com",
  "https://github.com/login/oauth/access_token",
  "https://github.com/login/oauth/authorize",
  "d42895f0b5c7fce9b677",
  "c4262d3ed5480f7e1ff601eb4244e409ab367ef7",
  "token",
  data => data.login,
  data => data.email,
  ["read:user"]
);

export default router;
