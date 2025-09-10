import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { 
  AnalysisResult, 
  MarketSignal, 
  BehavioralInsights, 
  RiskAssessment 
} from '../types/index.js';
import { cacheManager } from '../utils/cache.js';
import { SentimentFusionAnalyzer } from '../analyzers/sentiment-fusion.js';
import { BehavioralNetworkAnalyzer } from '../analyzers/behavioral-network.js';
import { MultiModalProcessor } from '../analyzers/multimodal-processor.js';
import { PredictiveImpactAnalyzer } from '../analyzers/predictive-impact.js';
import { QuantumCorrelator } from '../analyzers/quantum-correlator.js';
import { NewsAggregator } from '../services/news-aggregator.js';
import { PriceService } from '../services/price-service.js';
import { extractSymbolsFromQuery, normalizeSymbol } from '../utils/symbol-normalizer.js';
import crypto from 'crypto';

// Input validation schema
const AnalysisRequestSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  analysis_depth: z.enum(['quick', 'standard', 'deep']).default(config.analysis.defaultDepth),
  max_news_items: z.number().min(5).max(50).default(config.analysis.defaultMaxNewsItems),
  time_range: z.enum(['1h', '6h', '12h', '24h']).default(config.analysis.defaultTimeRange),
  include_prices: z.boolean().default(true),
  focus_coins: z.array(z.string()).optional(),
  stream_updates: z.boolean().default(false)
});

export class AnalyzeCryptoSentimentTool {
  private sentimentFusion: SentimentFusionAnalyzer;
  private behavioralNetwork: BehavioralNetworkAnalyzer;
  private multiModalProcessor: MultiModalProcessor;
  private predictiveImpact: PredictiveImpactAnalyzer;
  private quantumCorrelator: QuantumCorrelator;
  private newsAggregator: NewsAggregator;
  private priceService: PriceService;

  constructor() {
    this.sentimentFusion = new SentimentFusionAnalyzer();
    this.behavioralNetwork = new BehavioralNetworkAnalyzer();
    this.multiModalProcessor = new MultiModalProcessor();
    this.predictiveImpact = new PredictiveImpactAnalyzer();
    this.quantumCorrelator = new QuantumCorrelator();
    this.newsAggregator = new NewsAggregator();
    this.priceService = new PriceService();
  }

  async execute(
    args: Record<string, unknown>, 
    progressCallback?: (progress: number, step: string) => void
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const requestId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Validate input parameters
      const validatedArgs = AnalysisRequestSchema.parse(args);
      
      logger.info('Starting crypto sentiment analysis', {
        requestId,
        query: validatedArgs.query,
        depth: validatedArgs.analysis_depth,
        timeRange: validatedArgs.time_range,
        maxItems: validatedArgs.max_news_items
      });

      // Generate cache key for analysis results
      const cacheKey = this.generateCacheKey(validatedArgs);
      
      // Try to get cached results first
      const cachedResult = await cacheManager.getCachedAnalysis(cacheKey);
      if (cachedResult) {
        logger.info('Returning cached analysis result', { requestId, cacheKey });
        return cachedResult;
      }

      // Progress tracking
      // let currentProgress = 0;
      const updateProgress = (step: string, progress: number) => {
        // currentProgress = progress;
        if (progressCallback) {
          progressCallback(progress, step);
        }
        logger.debug('Analysis progress', { requestId, step, progress });
      };

      updateProgress('Initializing analysis components', 5);

      // Phase 1: News Data Collection
      updateProgress('Aggregating news from multiple sources', 10);
      const newsItems = await this.newsAggregator.fetchNews(
        validatedArgs.query,
        validatedArgs.time_range,
        validatedArgs.max_news_items
      );

      if (newsItems.length === 0) {
        throw new Error('No news items found for the specified query and time range');
      }

      updateProgress(`Collected ${newsItems.length} news items`, 20);

      // Phase 2: Price Data Collection (if requested)
      let priceData: Record<string, any> = {};
      if (validatedArgs.include_prices) {
        updateProgress('Fetching cryptocurrency prices', 25);
        
        // Extract mentioned coins from news or use focus_coins
        const mentionedCoins = validatedArgs.focus_coins || 
          this.extractMentionedCoins(newsItems);
        
        if (mentionedCoins.length > 0) {
          priceData = await this.priceService.getMultiplePrices(mentionedCoins);
          updateProgress(`Fetched prices for ${Object.keys(priceData).length} coins`, 30);
        }
      }

      // Phase 3: Parallel Analysis Execution
      updateProgress('Running parallel AI analysis frameworks', 35);
      
      const analysisPromises = await this.executeParallelAnalysis(
        newsItems,
        priceData,
        validatedArgs,
        updateProgress
      );

      // Phase 4: Results Aggregation
      updateProgress('Aggregating analysis results', 85);
      const finalResult = await this.aggregateResults(
        analysisPromises,
        newsItems,
        priceData,
        validatedArgs,
        startTime
      );

      updateProgress('Caching results', 95);
      
      // Cache the final result
      await cacheManager.cacheAnalysis(cacheKey, finalResult);

      updateProgress('Analysis complete', 100);
      
      logger.info('Crypto sentiment analysis completed', {
        requestId,
        processingTimeMs: finalResult.processing_time_ms,
        overallSentiment: finalResult.overall_sentiment,
        confidenceScore: finalResult.confidence_score,
        marketSignalsCount: finalResult.market_signals.length
      });

      return finalResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      logger.error('Crypto sentiment analysis failed', {
        requestId,
        error: errorMessage,
        duration: Date.now() - startTime
      });

      // Return error result in expected format
      return {
        overall_sentiment: 'NEUTRAL',
        confidence_score: 0,
        processing_time_ms: Date.now() - startTime,
        analysis_timestamp: new Date().toISOString(),
        market_signals: [],
        behavioral_insights: {
          whale_activity: 'NEUTRAL',
          social_sentiment: 'NEUTRAL',
          influencer_alignment: 0,
          volume_patterns: 'SIDEWAYS',
          retail_sentiment: 'MIXED'
        },
        risk_assessment: {
          level: 'HIGH',
          factors: ['analysis_error'],
          mitigation: 'Retry analysis or contact support',
          probability: 1,
          impact_severity: 'MAJOR'
        },
        actionable_recommendations: [
          `❌ Analysis failed: ${errorMessage}`,
          '🔄 Please try again with different parameters',
          '📞 Contact support if the issue persists'
        ],
        data_sources_count: 0,
        ai_model_used: 'error'
      };
    }
  }

  private async executeParallelAnalysis(
    newsItems: any[],
    priceData: Record<string, any>,
    validatedArgs: any,
    updateProgress: (step: string, progress: number) => void
  ) {
    const analysisDepth = validatedArgs.analysis_depth;
    
    // Execute all 5 analysis frameworks in parallel
    const analysisPromises = await Promise.allSettled([
      // 1. Sentiment Fusion Analysis
      this.sentimentFusion.analyze(newsItems, {
        depth: analysisDepth,
        priceContext: priceData
      }).then(result => {
        updateProgress('Sentiment fusion analysis complete', 45);
        return { type: 'sentiment', result };
      }),

      // 2. Behavioral Network Analysis
      this.behavioralNetwork.analyze(newsItems, {
        depth: analysisDepth,
        focusCoins: validatedArgs.focus_coins
      }).then(result => {
        updateProgress('Behavioral network analysis complete', 55);
        return { type: 'behavioral', result };
      }),

      // 3. Multi-Modal Processing
      this.multiModalProcessor.analyze(newsItems, {
        depth: analysisDepth,
        includeImages: analysisDepth !== 'quick'
      }).then(result => {
        updateProgress('Multi-modal processing complete', 65);
        return { type: 'multimodal', result };
      }),

      // 4. Predictive Impact Modeling
      this.predictiveImpact.analyze(newsItems, priceData, {
        depth: analysisDepth,
        timeHorizon: validatedArgs.time_range
      }).then(result => {
        updateProgress('Predictive impact analysis complete', 75);
        return { type: 'predictive', result };
      }),

      // 5. Quantum-Speed Event Correlation
      this.quantumCorrelator.analyze(newsItems, {
        depth: analysisDepth,
        correlationDepth: analysisDepth === 'deep' ? 'full' : 'standard'
      }).then(result => {
        updateProgress('Quantum correlation analysis complete', 80);
        return { type: 'correlation', result };
      })
    ]);

    return analysisPromises;
  }

  private async aggregateResults(
    analysisPromises: PromiseSettledResult<any>[],
    newsItems: any[],
    priceData: Record<string, any>,
    validatedArgs: any,
    startTime: number
  ): Promise<AnalysisResult> {
    // Process analysis results
    const results: Record<string, any> = {};
    let successfulAnalyses = 0;

    for (const promise of analysisPromises) {
      if (promise.status === 'fulfilled') {
        results[promise.value.type] = promise.value.result;
        successfulAnalyses++;
      } else {
        logger.warn('Analysis component failed', { 
          error: promise.reason,
          component: 'unknown'
        });
      }
    }

    // Generate market signals from all analysis components
    const marketSignals = this.generateMarketSignals(results, priceData, newsItems);

    // Aggregate behavioral insights
    const behavioralInsights = this.aggregateBehavioralInsights(results);

    // Calculate overall sentiment and confidence
    const { overallSentiment, confidenceScore } = this.calculateOverallSentiment(results, successfulAnalyses);

    // Generate risk assessment
    const riskAssessment = this.generateRiskAssessment(results, marketSignals);

    // Generate actionable recommendations
    const recommendations = this.generateRecommendations(
      overallSentiment,
      marketSignals,
      riskAssessment,
      validatedArgs.query
    );

    return {
      overall_sentiment: overallSentiment,
      confidence_score: confidenceScore,
      processing_time_ms: Date.now() - startTime,
      analysis_timestamp: new Date().toISOString(),
      market_signals: marketSignals,
      behavioral_insights: behavioralInsights,
      risk_assessment: riskAssessment,
      actionable_recommendations: recommendations,
      data_sources_count: newsItems.length,
      ai_model_used: config.aiProvider.defaultModel
    };
  }

  private generateCacheKey(args: any): string {
    const keyData = {
      query: args.query.toLowerCase(),
      depth: args.analysis_depth,
      timeRange: args.time_range,
      maxItems: args.max_news_items,
      includePrices: args.include_prices,
      focusCoins: args.focus_coins?.sort()
    };
    
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  }

  private extractMentionedCoins(newsItems: any[]): string[] {
    const mentionedCoins = new Set<string>();
    
    for (const item of newsItems) {
      const text = (item.title + ' ' + (item.content || '')).toLowerCase();
      
      // Extract symbols using the new normalizer
      const extractedSymbols = extractSymbolsFromQuery(text);
      extractedSymbols.forEach(symbolInfo => {
        if (symbolInfo.confidence >= 0.5) {
          mentionedCoins.add(symbolInfo.symbol);
        }
      });
      
      // Extract from item.mentioned_coins if available (normalize these too)
      if (item.mentioned_coins && Array.isArray(item.mentioned_coins)) {
        item.mentioned_coins.forEach((coin: string) => {
          const normalized = normalizeSymbol(coin);
          if (normalized.confidence >= 0.5) {
            mentionedCoins.add(normalized.symbol);
          }
        });
      }
    }
    
    // Ensure we always have at least BTC if no coins found
    if (mentionedCoins.size === 0) {
      mentionedCoins.add('BTC');
    }
    
    return Array.from(mentionedCoins).slice(0, 10); // Limit to 10 coins
  }

  private generateMarketSignals(results: Record<string, any>, priceData: Record<string, any>, newsItems: any[]): MarketSignal[] {
    const signals: MarketSignal[] = [];
    
    // Generate signals from top news items with analysis insights
    const topNews = newsItems.slice(0, 5);
    
    for (const news of topNews) {
      // Extract sentiment from sentiment analysis
      const sentimentResult = results.sentiment?.signals?.find((s: any) => 
        s.headline === news.title
      );
      
      const signal: MarketSignal = {
        headline: news.title,
        sentiment: sentimentResult?.sentiment || this.inferSentimentFromTitle(news.title),
        affected_coins: news.mentioned_coins || this.extractMentionedCoins([news]),
        impact_prediction: {
          timeframe: 'SHORT_TERM',
          magnitude: sentimentResult?.magnitude || 'MEDIUM',
          direction: sentimentResult?.direction || 'NEUTRAL'
        },
        price_context: this.buildPriceContext(news.mentioned_coins || [], priceData),
        ai_analysis: sentimentResult?.analysis || `Analysis of ${news.source} report on ${news.title.substring(0, 100)}...`,
        recommendation: sentimentResult?.recommendation || 'HOLD',
        confidence_score: sentimentResult?.confidence || 0.7
      };
      
      signals.push(signal);
    }
    
    return signals;
  }

  private aggregateBehavioralInsights(results: Record<string, any>): BehavioralInsights {
    const behavioral = results.behavioral || {};
    
    return {
      whale_activity: behavioral.whaleActivity || 'NEUTRAL',
      social_sentiment: behavioral.socialSentiment || 'NEUTRAL',
      influencer_alignment: behavioral.influencerAlignment || 0.5,
      volume_patterns: behavioral.volumePatterns || 'SIDEWAYS',
      retail_sentiment: behavioral.retailSentiment || 'MIXED'
    };
  }

  private calculateOverallSentiment(results: Record<string, any>, successfulAnalyses: number): { overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL', confidenceScore: number } {
    if (successfulAnalyses === 0) {
      return { overallSentiment: 'NEUTRAL', confidenceScore: 0 };
    }
    
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    
    // Count sentiments from different analysis components
    Object.values(results).forEach((result: any) => {
      if (result.overallSentiment) {
        switch (result.overallSentiment) {
          case 'BULLISH':
            bullishCount++;
            break;
          case 'BEARISH':
            bearishCount++;
            break;
          case 'NEUTRAL':
            neutralCount++;
            break;
        }
      }
    });
    
    // Determine overall sentiment
    let overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    if (bullishCount > bearishCount && bullishCount > neutralCount) {
      overallSentiment = 'BULLISH';
    } else if (bearishCount > bullishCount && bearishCount > neutralCount) {
      overallSentiment = 'BEARISH';
    } else {
      overallSentiment = 'NEUTRAL';
    }
    
    // Calculate confidence based on consensus and successful analyses
    const totalVotes = bullishCount + bearishCount + neutralCount;
    const consensusStrength = totalVotes > 0 ? Math.max(bullishCount, bearishCount, neutralCount) / totalVotes : 0;
    const analysisCompleteness = successfulAnalyses / 5; // 5 total analysis components
    
    const confidenceScore = Math.round((consensusStrength * analysisCompleteness) * 100) / 100;
    
    return { overallSentiment, confidenceScore };
  }

  private generateRiskAssessment(_results: Record<string, any>, marketSignals: MarketSignal[]): RiskAssessment {
    const riskFactors: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    
    // Analyze risk factors from signals
    const highImpactSignals = marketSignals.filter(s => s.impact_prediction.magnitude === 'HIGH');
    const negativeSignals = marketSignals.filter(s => s.sentiment.includes('NEGATIVE'));
    
    if (highImpactSignals.length > 2) {
      riskFactors.push('high_volatility_expected');
      riskLevel = 'HIGH';
    }
    
    if (negativeSignals.length > marketSignals.length / 2) {
      riskFactors.push('negative_sentiment_dominance');
      if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM';
    }
    
    // Add general crypto risk factors
    riskFactors.push('crypto_market_volatility', 'regulatory_uncertainty');
    
    return {
      level: riskLevel,
      factors: riskFactors,
      mitigation: 'Diversify portfolio, use stop-losses, monitor news closely',
      probability: 0.6,
      impact_severity: riskLevel === 'HIGH' ? 'MAJOR' : 'MODERATE'
    };
  }

  private generateRecommendations(
    sentiment: string,
    _signals: MarketSignal[],
    risk: RiskAssessment,
    query: string
  ): string[] {
    const recommendations: string[] = [];
    
    // Base recommendations on overall sentiment
    if (sentiment === 'BULLISH') {
      recommendations.push('🟢 Market sentiment is bullish - Consider gradual position building');
      recommendations.push('📈 Monitor for confirmation signals before increasing exposure');
    } else if (sentiment === 'BEARISH') {
      recommendations.push('🔴 Market sentiment is bearish - Exercise caution');
      recommendations.push('📉 Consider defensive strategies and capital preservation');
    } else {
      recommendations.push('🟡 Mixed market signals - Wait for clearer direction');
      recommendations.push('⚖️ Consider range-bound trading strategies');
    }
    
    // Add risk-based recommendations
    if (risk.level === 'HIGH' || risk.level === 'CRITICAL') {
      recommendations.push('⚠️ High risk detected - Use smaller position sizes');
      recommendations.push('🛡️ Implement strict risk management protocols');
    }
    
    // Add query-specific recommendations
    if (query.toLowerCase().includes('bitcoin') || query.toLowerCase().includes('btc')) {
      recommendations.push('₿ Monitor Bitcoin dominance for market direction cues');
    }
    
    return recommendations;
  }

  private inferSentimentFromTitle(title: string): 'STRONGLY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'STRONGLY_NEGATIVE' {
    const lowerTitle = title.toLowerCase();
    
    const stronglyPositive = ['surge', 'rally', 'boom', 'soar', 'explode', 'moon'];
    const positive = ['rise', 'gain', 'up', 'bull', 'growth', 'increase'];
    const negative = ['fall', 'drop', 'down', 'bear', 'decline', 'crash'];
    const stronglyNegative = ['plummet', 'collapse', 'tank', 'dump', 'disaster'];
    
    if (stronglyPositive.some(word => lowerTitle.includes(word))) return 'STRONGLY_POSITIVE';
    if (positive.some(word => lowerTitle.includes(word))) return 'POSITIVE';
    if (stronglyNegative.some(word => lowerTitle.includes(word))) return 'STRONGLY_NEGATIVE';
    if (negative.some(word => lowerTitle.includes(word))) return 'NEGATIVE';
    
    return 'NEUTRAL';
  }

  private buildPriceContext(coins: string[], priceData: Record<string, any>): Record<string, any> {
    const context: Record<string, any> = {};
    
    for (const coin of coins) {
      if (priceData[coin]) {
        context[coin] = priceData[coin];
      }
    }
    
    return context;
  }
}

export const analyzeCryptoSentimentTool = new AnalyzeCryptoSentimentTool();