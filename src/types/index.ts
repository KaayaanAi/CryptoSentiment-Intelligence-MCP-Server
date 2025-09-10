export interface ServerConfig {
  protocols: {
    stdio: boolean;
    http: boolean;
    websocket: boolean;
    rest: boolean;
  };
  server: {
    host: string;
    port: number;
    timeout: number;
    maxConnections: number;
  };
  security: {
    apiKeyHeader: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    corsOrigins: string;
    jwtSecret: string;
  };
  database: {
    mongodbUrl: string;
    redisUrl: string;
    redisPrefix: string;
  };
  aiProvider: {
    openRouterApiKey: string;
    openRouterBaseUrl: string;
    defaultModel: string;
    backupModel: string;
    timeout: number;
    maxTokens: number;
  };
  priceApi: {
    coinGeckoApiKey?: string;
    coinGeckoBaseUrl: string;
    binanceBaseUrl: string;
    cacheTtl: number;
  };
  news: {
    fetchInterval: number;
    maxAgeHours: number;
    rssFeeds: string[];
    redditFeeds: string[];
  };
  analysis: {
    defaultDepth: 'quick' | 'standard' | 'deep';
    defaultTimeRange: '1h' | '6h' | '12h' | '24h';
    defaultMaxNewsItems: number;
    sentimentConfidenceThreshold: number;
    cacheAnalysisTtl: number;
  };
}

export interface UnifiedAnalysisRequest {
  query: string;
  analysis_depth?: 'quick' | 'standard' | 'deep';
  max_news_items?: number;
  time_range?: '1h' | '6h' | '12h' | '24h';
  include_prices?: boolean;
  focus_coins?: string[];
}

export interface CoinPrice {
  symbol: string;
  current: number;
  change_24h: number;
  market_cap?: number;
  volume_24h?: number;
  last_updated: string;
}

export interface NewsItem {
  title: string;
  content: string;
  url: string;
  source: string;
  published_at: string;
  sentiment_score?: number;
  mentioned_coins?: string[];
  category?: string;
  importance_score?: number;
}

export interface MarketSignal {
  headline: string;
  sentiment: 'STRONGLY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'STRONGLY_NEGATIVE';
  affected_coins: string[];
  impact_prediction: {
    timeframe: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
    magnitude: 'LOW' | 'MEDIUM' | 'HIGH';
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  price_context?: Record<string, CoinPrice>;
  ai_analysis: string;
  recommendation: 'STRONG_BUY_SIGNAL' | 'BUY_SIGNAL' | 'HOLD' | 'SELL_SIGNAL' | 'STRONG_SELL_SIGNAL';
  confidence_score: number;
}

export interface BehavioralInsights {
  whale_activity: 'INCREASED_ACCUMULATION' | 'INCREASED_DISTRIBUTION' | 'NEUTRAL';
  social_sentiment: 'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED' | 'FEAR_TO_GREED_TRANSITION';
  influencer_alignment: number;
  volume_patterns: 'ACCUMULATION' | 'DISTRIBUTION' | 'SIDEWAYS';
  retail_sentiment: 'BULLISH' | 'BEARISH' | 'MIXED';
}

export interface RiskAssessment {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
  mitigation: string;
  probability: number;
  impact_severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'SEVERE';
}

export interface AnalysisResult {
  overall_sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence_score: number;
  processing_time_ms: number;
  analysis_timestamp: string;
  market_signals: MarketSignal[];
  behavioral_insights: BehavioralInsights;
  risk_assessment: RiskAssessment;
  actionable_recommendations: string[];
  data_sources_count: number;
  ai_model_used: string;
}

export interface AIProvider {
  name: string;
  analyze(prompt: string, model?: string): Promise<string>;
  isAvailable(): Promise<boolean>;
  getRemainingQuota(): Promise<number>;
  getLatency(): Promise<number>;
  getCost(tokens: number): number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface MCPMessage {
  jsonrpc: '2.0';
  id: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface WebSocketConnection {
  id: string;
  ws: any;
  subscriptions: string[];
  lastPing: number;
  authenticated: boolean;
}

export interface ErrorContext {
  protocol: 'stdio' | 'http' | 'websocket' | 'rest';
  method?: string;
  requestId?: string | number;
  userId?: string;
  timestamp: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: boolean;
    redis: boolean;
    aiProvider: boolean;
    newsFeeds: boolean;
    priceApi: boolean;
  };
  metrics: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    totalRequests: number;
    errorRate: number;
  };
}

export interface Metrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    average_response_time: number;
  };
  protocols: {
    stdio: number;
    http: number;
    websocket: number;
    rest: number;
  };
  analysis: {
    total_analyses: number;
    average_processing_time: number;
    cache_hit_rate: number;
  };
  external_apis: {
    news_fetch_success_rate: number;
    price_fetch_success_rate: number;
    ai_provider_success_rate: number;
  };
}