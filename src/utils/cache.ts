import { createClient, RedisClientType } from 'redis';
import { config } from '../config.js';
import { logger } from './logger.js';
import { CacheEntry } from '../types/index.js';

export class CacheManager {
  private client: RedisClientType;
  private connected: boolean = false;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private useRedis: boolean = true;

  constructor() {
    this.client = createClient({
      url: config.database.redisUrl,
      socket: {
        connectTimeout: 5000,
      },
    });

    this.client.on('error', (error) => {
      logger.warn('Redis connection error, falling back to memory cache', { error: error.message });
      this.useRedis = false;
      this.connected = false;
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis cache');
      this.connected = true;
      this.useRedis = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Disconnected from Redis, using memory cache');
      this.connected = false;
      this.useRedis = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.warn('Failed to connect to Redis, using memory cache', { error });
      this.useRedis = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
    }
    this.memoryCache.clear();
  }

  private getKey(key: string): string {
    return `${config.database.redisPrefix}${key}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl * 1000;
  }

  private cleanupMemoryCache(): void {
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.getKey(key);

    // Try Redis first
    if (this.useRedis && this.connected) {
      try {
        const value = await this.client.get(cacheKey);
        if (value) {
          const entry: CacheEntry<T> = JSON.parse(value);
          if (!this.isExpired(entry)) {
            logger.debug('Cache hit (Redis)', { key });
            return entry.data;
          } else {
            await this.client.del(cacheKey);
          }
        }
      } catch (error) {
        logger.warn('Redis get error, falling back to memory', { key, error });
      }
    }

    // Fallback to memory cache
    const entry = this.memoryCache.get(cacheKey);
    if (entry) {
      if (!this.isExpired(entry)) {
        logger.debug('Cache hit (memory)', { key });
        return entry.data;
      } else {
        this.memoryCache.delete(cacheKey);
      }
    }

    logger.debug('Cache miss', { key });
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const cacheKey = this.getKey(key);
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlSeconds,
    };

    // Try Redis first
    if (this.useRedis && this.connected) {
      try {
        await this.client.setEx(cacheKey, ttlSeconds, JSON.stringify(entry));
        logger.debug('Cache set (Redis)', { key, ttl: ttlSeconds });
        return;
      } catch (error) {
        logger.warn('Redis set error, falling back to memory', { key, error });
      }
    }

    // Fallback to memory cache
    this.memoryCache.set(cacheKey, entry);
    logger.debug('Cache set (memory)', { key, ttl: ttlSeconds });

    // Periodic cleanup for memory cache
    if (this.memoryCache.size % 100 === 0) {
      this.cleanupMemoryCache();
    }
  }

  async del(key: string): Promise<void> {
    const cacheKey = this.getKey(key);

    if (this.useRedis && this.connected) {
      try {
        await this.client.del(cacheKey);
      } catch (error) {
        logger.warn('Redis delete error', { key, error });
      }
    }

    this.memoryCache.delete(cacheKey);
    logger.debug('Cache delete', { key });
  }

  async flush(): Promise<void> {
    if (this.useRedis && this.connected) {
      try {
        const keys = await this.client.keys(`${config.database.redisPrefix}*`);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
      } catch (error) {
        logger.warn('Redis flush error', { error });
      }
    }

    this.memoryCache.clear();
    logger.info('Cache flushed');
  }

  async getStats(): Promise<{ redis: boolean; memoryKeys: number; connected: boolean }> {
    return {
      redis: this.useRedis,
      memoryKeys: this.memoryCache.size,
      connected: this.connected,
    };
  }

  // Specialized cache methods for common use cases
  async cacheNewsItems<T>(timeRange: string, items: T[]): Promise<void> {
    const key = `news:${timeRange}`;
    await this.set(key, items, config.news.maxAgeHours * 3600);
  }

  async getCachedNewsItems<T>(timeRange: string): Promise<T[] | null> {
    const key = `news:${timeRange}`;
    return await this.get<T[]>(key);
  }

  async cachePrices(coins: string[], prices: Record<string, any>): Promise<void> {
    const key = `prices:${coins.sort().join(',')}`;
    await this.set(key, prices, config.priceApi.cacheTtl);
  }

  async getCachedPrices(coins: string[]): Promise<Record<string, any> | null> {
    const key = `prices:${coins.sort().join(',')}`;
    return await this.get<Record<string, any>>(key);
  }

  async cacheAnalysis(queryHash: string, result: any): Promise<void> {
    const key = `analysis:${queryHash}`;
    await this.set(key, result, config.analysis.cacheAnalysisTtl);
  }

  async getCachedAnalysis(queryHash: string): Promise<any | null> {
    const key = `analysis:${queryHash}`;
    return await this.get(key);
  }
}

export const cacheManager = new CacheManager();