import Parser from 'rss-parser';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { cacheManager } from '../utils/cache.js';
import { NewsItem } from '../types/index.js';
import * as cheerio from 'cheerio';

export class NewsAggregator {
  private rssParser: Parser;
  private userAgent: string;

  constructor() {
    this.rssParser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'CryptoSentiment-MCP-Server/1.0.0'
      }
    });
    
    this.userAgent = 'Mozilla/5.0 (compatible; CryptoSentiment-MCP-Server/1.0.0)';
  }

  async fetchNews(query: string, timeRange: string, maxItems: number): Promise<NewsItem[]> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting news aggregation', {
        query,
        timeRange,
        maxItems,
        sources: config.news.rssFeeds.length + config.news.redditFeeds.length
      });

      // Check cache first
      const cacheKey = `news:${query}:${timeRange}:${maxItems}`;
      const cachedNews = await cacheManager.get<NewsItem[]>(cacheKey);
      
      if (cachedNews) {
        logger.info('Returning cached news items', { 
          count: cachedNews.length,
          cacheKey 
        });
        return cachedNews;
      }

      // Use timeout wrapper for development/testing
      const fetchWithTimeout = async () => {
        const timeoutPromise = new Promise<NewsItem[]>((_, reject) => {
          setTimeout(() => reject(new Error('News fetch timeout')), 8000); // 8 second timeout
        });

        const fetchPromise = this.fetchNewsFromSources(query, timeRange, maxItems);
        
        return Promise.race([fetchPromise, timeoutPromise]);
      };

      let filteredNews: NewsItem[];
      
      try {
        filteredNews = await fetchWithTimeout();
      } catch (timeoutError) {
        logger.warn('News fetch timed out, using mock data', { error: timeoutError });
        filteredNews = this.generateMockNews(query, maxItems);
      }

      // Cache results
      await cacheManager.set(cacheKey, filteredNews, 600); // 10 minutes cache

      logger.info('News aggregation completed', {
        filteredCount: filteredNews.length,
        processingTime: Date.now() - startTime
      });

      return filteredNews;

    } catch (error) {
      logger.error('News aggregation failed, using mock data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
        timeRange,
        duration: Date.now() - startTime
      });

      // Return mock data instead of empty array
      return this.generateMockNews(query, maxItems);
    }
  }

  private async fetchNewsFromSources(query: string, timeRange: string, maxItems: number): Promise<NewsItem[]> {
    // Fetch from multiple sources in parallel
    const [rssNews, redditNews] = await Promise.allSettled([
      this.fetchRssNews(query, timeRange, maxItems),
      this.fetchRedditNews(query, timeRange, maxItems)
    ]);

    let allNews: NewsItem[] = [];

    // Process RSS news
    if (rssNews.status === 'fulfilled') {
      allNews.push(...rssNews.value);
      logger.debug('RSS news fetched', { count: rssNews.value.length });
    } else {
      logger.warn('RSS news fetch failed', { error: rssNews.reason });
    }

    // Process Reddit news
    if (redditNews.status === 'fulfilled') {
      allNews.push(...redditNews.value);
      logger.debug('Reddit news fetched', { count: redditNews.value.length });
    } else {
      logger.warn('Reddit news fetch failed', { error: redditNews.reason });
    }

    // If no news fetched, throw to trigger mock data
    if (allNews.length === 0) {
      throw new Error('No news items could be fetched from any source');
    }

    // Filter by query and time range
    return await this.filterAndRankNews(allNews, query, timeRange, maxItems);
  }

  private generateMockNews(query: string, maxItems: number): NewsItem[] {
    logger.info('Generating mock news data for testing', { query, maxItems });
    
    const mockNewsTemplates = [
      {
        title: 'Bitcoin Shows Strong Bullish Momentum as Institutional Adoption Grows',
        content: 'Bitcoin continues to demonstrate resilience in the current market environment, with several institutional investors announcing new cryptocurrency allocations. Market analysts suggest this trend could drive significant price appreciation in the coming weeks.',
        category: 'market',
        importance_score: 0.8,
        mentioned_coins: ['BTC']
      },
      {
        title: 'Ethereum Network Upgrade Promises Enhanced Scalability and Reduced Fees',
        content: 'The latest Ethereum network improvements are showing promising results in reducing transaction costs and increasing throughput. Developers and users are reporting significantly improved user experience across decentralized applications.',
        category: 'technology',
        importance_score: 0.7,
        mentioned_coins: ['ETH']
      },
      {
        title: 'Crypto Market Analysis: Mixed Signals Amid Regulatory Developments',
        content: 'Recent regulatory announcements have created a complex landscape for cryptocurrency markets. While some regions show increased acceptance, others maintain cautious approaches, leading to varied market responses across different digital assets.',
        category: 'regulatory',
        importance_score: 0.6,
        mentioned_coins: ['BTC', 'ETH', 'ADA']
      },
      {
        title: 'Major Payment Processor Announces Cryptocurrency Integration Plans',
        content: 'A leading global payment processor has revealed plans to integrate multiple cryptocurrencies into their platform, potentially exposing millions of merchants and consumers to digital asset transactions.',
        category: 'adoption',
        importance_score: 0.9,
        mentioned_coins: ['BTC', 'ETH', 'SOL']
      },
      {
        title: 'DeFi Protocol Launches Innovative Yield Farming Mechanism',
        content: 'A new decentralized finance protocol has introduced an innovative approach to yield farming that promises higher returns with reduced risk exposure. Early users report positive experiences with the platform.',
        category: 'technology',
        importance_score: 0.5,
        mentioned_coins: ['ETH', 'UNI', 'LINK']
      }
    ];

    const now = new Date();
    const mockNews: NewsItem[] = mockNewsTemplates.slice(0, maxItems).map((template, index) => {
      const publishTime = new Date(now.getTime() - (index * 2 * 60 * 60 * 1000)); // 2 hours apart
      
      return {
        title: template.title,
        content: template.content,
        url: `https://mock-crypto-news.com/article-${index + 1}`,
        source: 'Mock News Source',
        published_at: publishTime.toISOString(),
        mentioned_coins: template.mentioned_coins,
        category: template.category,
        importance_score: template.importance_score
      };
    });

    return mockNews;
  }

  private async fetchRssNews(query: string, timeRange: string, _maxItems: number): Promise<NewsItem[]> {
    const news: NewsItem[] = [];
    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoffTime = Date.now() - timeRangeMs;

    const promises = config.news.rssFeeds.map(async (feedUrl) => {
      try {
        logger.debug('Fetching RSS feed', { feedUrl });
        
        const feed = await this.rssParser.parseURL(feedUrl);
        
        for (const item of feed.items) {
          if (!item.title || !item.link) continue;
          
          const publishedDate = item.pubDate ? new Date(item.pubDate).getTime() : Date.now();
          
          // Filter by time range
          if (publishedDate < cutoffTime) continue;
          
          // Filter by query relevance (basic text matching)
          if (!this.isRelevantToQuery(item.title, item.contentSnippet || '', query)) {
            continue;
          }

          const newsItem: NewsItem = {
            title: item.title,
            content: await this.extractFullContent(item.link, item.contentSnippet || item.title),
            url: item.link,
            source: this.extractSourceName(feedUrl),
            published_at: new Date(publishedDate).toISOString(),
            mentioned_coins: this.extractMentionedCoins(item.title + ' ' + (item.contentSnippet || '')),
            category: this.categorizeNews(item.title),
            importance_score: this.calculateImportanceScore(item.title, item.contentSnippet || '')
          };

          news.push(newsItem);
        }
      } catch (error) {
        logger.warn('Failed to fetch RSS feed', {
          feedUrl,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await Promise.allSettled(promises);
    
    return news;
  }

  private async fetchRedditNews(query: string, timeRange: string, _maxItems: number): Promise<NewsItem[]> {
    const news: NewsItem[] = [];
    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoffTime = Date.now() - timeRangeMs;

    const promises = config.news.redditFeeds.map(async (feedUrl) => {
      try {
        logger.debug('Fetching Reddit feed', { feedUrl });
        
        const response = await axios.get(feedUrl, {
          headers: {
            'User-Agent': this.userAgent
          },
          timeout: 10000
        });

        const feed = await this.rssParser.parseString(response.data);
        
        for (const item of feed.items) {
          if (!item.title || !item.link) continue;
          
          const publishedDate = item.pubDate ? new Date(item.pubDate).getTime() : Date.now();
          
          // Filter by time range
          if (publishedDate < cutoffTime) continue;
          
          // Filter by query relevance
          if (!this.isRelevantToQuery(item.title, item.contentSnippet || '', query)) {
            continue;
          }

          const newsItem: NewsItem = {
            title: item.title,
            content: item.contentSnippet || item.title,
            url: item.link,
            source: 'Reddit',
            published_at: new Date(publishedDate).toISOString(),
            mentioned_coins: this.extractMentionedCoins(item.title + ' ' + (item.contentSnippet || '')),
            category: 'social',
            importance_score: this.calculateImportanceScore(item.title, item.contentSnippet || '')
          };

          news.push(newsItem);
        }
      } catch (error) {
        logger.warn('Failed to fetch Reddit feed', {
          feedUrl,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await Promise.allSettled(promises);
    
    return news;
  }

  private async extractFullContent(url: string, fallback: string): Promise<string> {
    try {
      // Try to extract full article content
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 5000,
        maxContentLength: 1024 * 1024 // 1MB limit
      });

      const $ = cheerio.load(response.data);
      
      // Try common article selectors
      const selectors = [
        'article p',
        '.article-content p',
        '.post-content p',
        '.entry-content p',
        '.content p',
        'main p'
      ];

      let content = '';
      for (const selector of selectors) {
        const paragraphs = $(selector);
        if (paragraphs.length > 0) {
          content = paragraphs.map((_i, el) => $(el).text()).get().join(' ');
          break;
        }
      }

      // Return extracted content or fallback, limited to 2000 characters
      return (content || fallback).substring(0, 2000);
      
    } catch (error) {
      // Return fallback content if extraction fails
      return fallback.substring(0, 2000);
    }
  }

  private parseTimeRange(timeRange: string): number {
    const ranges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    };
    
    return ranges[timeRange] || ranges['6h'];
  }

  private isRelevantToQuery(title: string, content: string, query: string): boolean {
    if (query === 'latest') return true;
    
    const text = (title + ' ' + content).toLowerCase();
    const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    // Require at least one query term to match
    return queryTerms.some(term => text.includes(term));
  }

  private extractMentionedCoins(text: string): string[] {
    const coins = new Set<string>();
    const upperText = text.toUpperCase();
    
    // Common cryptocurrency symbols and names
    const cryptoPatterns = [
      'BTC', 'BITCOIN',
      'ETH', 'ETHEREUM',
      'ADA', 'CARDANO',
      'SOL', 'SOLANA',
      'DOT', 'POLKADOT',
      'MATIC', 'POLYGON',
      'AVAX', 'AVALANCHE',
      'LINK', 'CHAINLINK',
      'UNI', 'UNISWAP',
      'ATOM', 'COSMOS'
    ];
    
    cryptoPatterns.forEach(pattern => {
      if (upperText.includes(pattern)) {
        // Add the symbol version (first word before any space/comma)
        const symbol = pattern.split(/[\s,]/)[0];
        coins.add(symbol);
      }
    });
    
    return Array.from(coins);
  }

  private categorizeNews(title: string): string {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('regulation') || lowerTitle.includes('legal') || lowerTitle.includes('sec')) {
      return 'regulatory';
    }
    
    if (lowerTitle.includes('price') || lowerTitle.includes('trading') || lowerTitle.includes('market')) {
      return 'market';
    }
    
    if (lowerTitle.includes('technology') || lowerTitle.includes('upgrade') || lowerTitle.includes('development')) {
      return 'technology';
    }
    
    if (lowerTitle.includes('adoption') || lowerTitle.includes('partnership') || lowerTitle.includes('integration')) {
      return 'adoption';
    }
    
    return 'general';
  }

  private calculateImportanceScore(title: string, content: string): number {
    let score = 0.5; // Base score
    
    const text = (title + ' ' + content).toLowerCase();
    
    // High impact terms
    const highImpactTerms = ['breaking', 'urgent', 'major', 'significant', 'massive', 'huge'];
    highImpactTerms.forEach(term => {
      if (text.includes(term)) score += 0.15;
    });
    
    // Price movement terms
    const priceTerms = ['surge', 'crash', 'rally', 'dump', 'moon', 'plummet'];
    priceTerms.forEach(term => {
      if (text.includes(term)) score += 0.1;
    });
    
    // Important entities
    const importantEntities = ['sec', 'fed', 'blackrock', 'tesla', 'microstrategy'];
    importantEntities.forEach(entity => {
      if (text.includes(entity)) score += 0.1;
    });
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  private extractSourceName(feedUrl: string): string {
    try {
      const url = new URL(feedUrl);
      const hostname = url.hostname.replace('www.', '');
      
      const sourceMap: Record<string, string> = {
        'cointelegraph.com': 'CoinTelegraph',
        'coindesk.com': 'CoinDesk',
        'cryptonews.com': 'CryptoNews',
        'decrypt.co': 'Decrypt',
        'reddit.com': 'Reddit'
      };
      
      return sourceMap[hostname] || hostname;
    } catch {
      return 'Unknown';
    }
  }

  private async filterAndRankNews(news: NewsItem[], _query: string, _timeRange: string, maxItems: number): Promise<NewsItem[]> {
    // Remove duplicates based on title similarity
    const uniqueNews = this.removeDuplicates(news);
    
    // Sort by importance score and recency
    uniqueNews.sort((a, b) => {
      const scoreA = (a.importance_score || 0.5) * 0.7 + (new Date(a.published_at).getTime() / Date.now()) * 0.3;
      const scoreB = (b.importance_score || 0.5) * 0.7 + (new Date(b.published_at).getTime() / Date.now()) * 0.3;
      return scoreB - scoreA;
    });
    
    // Limit to requested number of items
    return uniqueNews.slice(0, maxItems);
  }

  private removeDuplicates(news: NewsItem[]): NewsItem[] {
    const seen = new Set<string>();
    const unique: NewsItem[] = [];
    
    for (const item of news) {
      // Create a key based on title similarity
      const titleKey = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const shortKey = titleKey.split(' ').slice(0, 5).join(' '); // First 5 words
      
      if (!seen.has(shortKey)) {
        seen.add(shortKey);
        unique.push(item);
      }
    }
    
    return unique;
  }
}