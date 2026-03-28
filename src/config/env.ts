import dotenv from 'dotenv';
import { EnvConfig } from '../types';
import logger from '../utils/logger';

// Load environment variables
dotenv.config();

/**
 * Validate and export environment configuration
 */
function validateEnv(): EnvConfig {
  const requiredVars = ['SERVER_ID', 'BOT_TOKEN', 'VIEW_ALL_CTF_ROLEID', 'VERIFIED_ROLE_ID'];
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
    VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID!,
    LOG_CHANNELID: process.env.LOG_CHANNELID,
    DENY_CTF_ROLEID: process.env.DENY_CTF_ROLEID,
  };
}

export const config = validateEnv();
