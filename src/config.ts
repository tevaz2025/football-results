import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://root:example@localhost:27017/football?authSource=admin',
  apiFootball: {
    key: process.env.API_FOOTBALL_KEY ?? '',
    url: process.env.API_FOOTBALL_URL ?? 'https://v3.football.api-sports.io',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'default_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  admin: {
    email:    process.env.ADMIN_EMAIL    ?? 'admin@football.com',
    password: process.env.ADMIN_PASSWORD ?? 'admin1234',
    username: process.env.ADMIN_USERNAME ?? 'admin',
  },
} as const;
