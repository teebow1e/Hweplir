import dotenv from 'dotenv';
import { EnvConfig } from '../types';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

/**
 * Validate and export environment configuration
 */
function validateEnv(): EnvConfig {
  const requiredVars = ['SERVER_ID', 'BOT_TOKEN', 'VIEW_ALL_CTF_ROLEID'];
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    logger.error('Please create a .env file based on .env.example');
    process.exit(1);
  }

  return {
    SERVER_ID: process.env.SERVER_ID!,
    BOT_TOKEN: process.env.BOT_TOKEN!,
    VIEW_ALL_CTF_ROLEID: process.env.VIEW_ALL_CTF_ROLEID!,
    LOG_CHANNELID: process.env.LOG_CHANNELID,
  };
}

export const config = validateEnv();
