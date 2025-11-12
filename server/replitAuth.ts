// Custom Google OAuth implementation
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

async function upsertUser(profile: any) {
  const user = await storage.upsertUser({
    id: profile.id,
    email: profile.emails?.[0]?.value || null,
    firstName: profile.name?.givenName || null,
    lastName: profile.name?.familyName || null,
    profileImageUrl: profile.photos?.[0]?.value || null,
  });
  return user;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Track registered strategies
  const registeredStrategies = new Set<string>();
  
  // Dynamic Google OAuth Strategy setup per request
  const setupGoogleStrategy = (host: string, protocol: string) => {
    const strategyName = `google-${host}`;
    
    // Check if strategy already exists for this domain
    if (!registeredStrategies.has(strategyName)) {
      const callbackURL = `${protocol}://${host}/api/auth/google/callback`;
      
      passport.use(
        strategyName,
        new GoogleStrategy(
          {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL,
            passReqToCallback: true,
          },
          async (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
            try {
              const user = await upsertUser(profile);
              // Store tokens in database for Google APIs
              await storage.updateUserGoogleTokens(user.id, accessToken, refreshToken);
              done(null, { id: user.id, profile });
            } catch (error) {
              done(error, null);
            }
          }
        )
      );
      registeredStrategies.add(strategyName);
    }
    
    return strategyName;
  };

  passport.serializeUser((user: any, cb) => cb(null, user.id));
  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await storage.getUser(id);
      cb(null, user);
    } catch (error) {
      cb(error, null);
    }
  });

  app.get("/api/login", (req, res, next) => {
    const host = req.get('host') ?? req.hostname;
    const strategyName = setupGoogleStrategy(host, req.protocol);
    passport.authenticate(strategyName, {
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/documents.readonly",
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/drive.file"
      ],
      accessType: 'offline',
      prompt: 'consent'
    } as any)(req, res, next);
  });

  app.get("/api/auth/google/callback", (req, res, next) => {
    const host = req.get('host') ?? req.hostname;
    const strategyName = setupGoogleStrategy(host, req.protocol);
    passport.authenticate(strategyName, {
      failureRedirect: "/",
    })(req, res, next);
  }, (req, res) => {
    res.redirect("/");
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  if (!user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const dbUser = await storage.getUser(user.id);
  if (!dbUser?.isAdmin) {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }

  return next();
};
