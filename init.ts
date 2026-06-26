import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://root:example@localhost:27017/football?authSource=admin',
  apiFootball: {
    key: process.env.API_FOOTBALL_KEY ?? '',
    url: process.env.API_FOOTBALL_URL ?? 'https://v3.football.api-sports.io',
  },
} as const;
