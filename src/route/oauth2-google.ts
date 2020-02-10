import { createOAuth2ProviderRoute } from "../oauth2";

const router = createOAuth2ProviderRoute(
  "google",
  "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
  "https://accounts.google.com/",
  "https://accounts.google.com/o/oauth2/token",
  "https://accounts.google.com/o/oauth2/auth",
  "349060531457-6naion9025ipiqqbovt8vq60p5esfvq3.apps.googleusercontent.com",
  "gf_ZIsQ5hLY-cl0xgT2p-rdb",
  "Bearer",
  data => data.name,
  data => data.email,
  [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
);

export default router;
