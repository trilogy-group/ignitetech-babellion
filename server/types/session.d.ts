import 'express-session';

declare module 'express-session' {
  interface SessionData {
    googleAccessToken?: string;
    googleRefreshToken?: string;
  }
}

