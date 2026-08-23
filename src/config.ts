import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface BotConfig {
  token: string;
  databaseUrl?: string;
  checkIntervalMinutes: number;
  prefix: string;
}

export const config: BotConfig = {
  token: (process.env.DISCORD_TOKEN || '').trim(),
  databaseUrl: (process.env.DATABASE_URL || '').trim(),
  checkIntervalMinutes: Math.max(1, parseInt(process.env.CHECK_INTERVAL_MINUTES || '5', 10) || 5),
  prefix: '!tu',
};
