import { createOAuth2ProviderRoute, getProviderByName } from "../oauth2";

const provider = getProviderByName("google");

const router = createOAuth2ProviderRoute(
  "google",
  "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
  "https://accounts.google.com/",
  "https://accounts.google.com/o/oauth2/token",
  "https://accounts.google.com/o/oauth2/auth",
  provider.id,
  provider.secret,
  "Bearer",
  (data) => data.name,
  (data) => data.email,
  [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ]
);

export default router;
