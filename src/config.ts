import dotenv from 'dotenv';
import { ServerConfig } from './types/index.js';

dotenv.config();

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
};

const getBooleanEnv = (key: string, defaultValue: boolean = false): boolean => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

const getNumberEnv = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const num = parseInt(value, 10);
  if (isNaN(num)) return defaultValue;
  return num;
};

const getArrayEnv = (key: string, defaultValue: string[] = []): string[] => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim()).filter(Boolean);
};

export const config: ServerConfig = {
  protocols: {
    stdio: getBooleanEnv('ENABLE_STDIO', true),
    http: getBooleanEnv('ENABLE_HTTP_REST', true),
    websocket: getBooleanEnv('ENABLE_WEBSOCKET', true),
    rest: getBooleanEnv('ENABLE_HTTP_MCP', true),
  },
  
  server: {
    host: getEnvVar('HOST', '0.0.0.0'),
    port: getNumberEnv('PORT', 4004),
    timeout: getNumberEnv('REQUEST_TIMEOUT_MS', 30000),
    maxConnections: getNumberEnv('MAX_CONNECTIONS', 1000),
  },
  
  security: {
    apiKeyHeader: getEnvVar('API_KEY_HEADER', 'x-api-key'),
    rateLimitWindowMs: getNumberEnv('RATE_LIMIT_WINDOW_MS', 60000),
    rateLimitMaxRequests: getNumberEnv('RATE_LIMIT_MAX_REQUESTS', 100),
    corsOrigins: getEnvVar('CORS_ORIGINS', '*'),
    jwtSecret: getEnvVar('JWT_SECRET', 'default-jwt-secret-change-in-production'),
  },
  
  database: {
    mongodbUrl: getEnvVar('MONGODB_URL', 'mongodb://localhost:27017/crypto_sentiment'),
    redisUrl: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
    redisPrefix: getEnvVar('REDIS_PREFIX', 'crypto-sentiment:'),
  },
  
  aiProvider: {
    openRouterApiKey: getEnvVar('OPENROUTER_API_KEY', ''),
    openRouterBaseUrl: getEnvVar('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
    defaultModel: getEnvVar('DEFAULT_MODEL', 'deepseek/deepseek-chat'),
    backupModel: getEnvVar('BACKUP_MODEL', 'meta-llama/llama-3.1-8b-instruct:free'),
    timeout: getNumberEnv('AI_TIMEOUT_MS', 30000),
    maxTokens: getNumberEnv('MAX_TOKENS', 4000),
  },
  
  priceApi: {
    coinGeckoApiKey: process.env.COINGECKO_API_KEY,
    coinGeckoBaseUrl: getEnvVar('COINGECKO_BASE_URL', 'https://api.coingecko.com/api/v3'),
    binanceBaseUrl: getEnvVar('BINANCE_BASE_URL', 'https://api.binance.com/api/v3'),
    cacheTtl: getNumberEnv('PRICE_CACHE_TTL', 300),
  },
  
  news: {
    fetchInterval: getNumberEnv('NEWS_FETCH_INTERVAL', 300000),
    maxAgeHours: getNumberEnv('NEWS_MAX_AGE_HOURS', 24),
    rssFeeds: getArrayEnv('RSS_FEEDS', [
      'https://cointelegraph.com/rss',
      'https://coindesk.com/arc/outboundfeeds/rss/',
      'https://cryptonews.com/feed/',
      'https://decrypt.co/feed'
    ]),
    redditFeeds: getArrayEnv('REDDIT_FEEDS', [
      'https://www.reddit.com/r/CryptoCurrency/.rss',
      'https://www.reddit.com/r/Bitcoin/.rss',
      'https://www.reddit.com/r/ethereum/.rss'
    ]),
  },
  
  analysis: {
    defaultDepth: (getEnvVar('DEFAULT_ANALYSIS_DEPTH', 'standard') as 'quick' | 'standard' | 'deep'),
    defaultTimeRange: (getEnvVar('DEFAULT_TIME_RANGE', '6h') as '1h' | '6h' | '12h' | '24h'),
    defaultMaxNewsItems: getNumberEnv('DEFAULT_MAX_NEWS_ITEMS', 15),
    sentimentConfidenceThreshold: parseFloat(getEnvVar('SENTIMENT_CONFIDENCE_THRESHOLD', '0.6')),
    cacheAnalysisTtl: getNumberEnv('CACHE_ANALYSIS_TTL', 900),
  },
};

export const isDevelopment = process.env.NODE_ENV !== 'production';
export const isProduction = process.env.NODE_ENV === 'production';

export const validateConfig = (): void => {
  const errors: string[] = [];
  
  // Validate required AI provider configuration
  if (!config.aiProvider.openRouterApiKey && isProduction) {
    errors.push('OPENROUTER_API_KEY is required in production');
  }
  
  // Validate database URLs
  try {
    new URL(config.database.mongodbUrl);
  } catch {
    errors.push('MONGODB_URL must be a valid URL');
  }
  
  try {
    new URL(config.database.redisUrl);
  } catch {
    errors.push('REDIS_URL must be a valid URL');
  }
  
  // Validate port range
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  // Validate news feeds
  if (config.news.rssFeeds.length === 0) {
    errors.push('At least one RSS feed must be configured');
  }
  
  // Validate analysis parameters
  if (!['quick', 'standard', 'deep'].includes(config.analysis.defaultDepth)) {
    errors.push('DEFAULT_ANALYSIS_DEPTH must be one of: quick, standard, deep');
  }
  
  if (!['1h', '6h', '12h', '24h'].includes(config.analysis.defaultTimeRange)) {
    errors.push('DEFAULT_TIME_RANGE must be one of: 1h, 6h, 12h, 24h');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
};

export default config;