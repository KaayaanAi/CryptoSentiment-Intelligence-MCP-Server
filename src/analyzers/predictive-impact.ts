import { logger } from '../utils/logger.js';
import { NewsItem } from '../types/index.js';
import { aiProcessor } from '../services/ai-processor.js';

export class PredictiveImpactAnalyzer {
  async analyze(
    newsItems: NewsItem[], 
    priceData: Record<string, any>, 
    options: {
      depth: 'quick' | 'standard' | 'deep';
      timeHorizon: '1h' | '6h' | '12h' | '24h';
    }
  ): Promise<{
    impactPredictions: Array<{
      event: string;
      probability: number;
      magnitude: 'LOW' | 'MEDIUM' | 'HIGH';
      timeframe: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
      affectedAssets: string[];
      confidence: number;
      reasoning: string;
    }>;
    marketMovementForecast: {
      direction: 'UP' | 'DOWN' | 'SIDEWAYS';
      probability: number;
      priceTargets: Record<string, { high: number; low: number }>;
      volatilityExpectation: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    catalystAnalysis: {
      positiveCatalysts: string[];
      negativeCatalysts: string[];
      wildcardEvents: string[];
    };
    correlationInsights: {
      newsToPrice: number;
      crossAssetCorrelation: number;
      marketSentimentAlignment: number;
    };
  }> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting predictive impact analysis', {
        newsCount: newsItems.length,
        depth: options.depth,
        timeHorizon: options.timeHorizon,
        priceDataAvailable: Object.keys(priceData).length > 0
      });

      // Analyze different predictive aspects
      const [
        impactPredictions,
        marketMovementForecast,
        catalystAnalysis,
        correlationInsights
      ] = await Promise.all([
        this.generateImpactPredictions(newsItems, priceData, options),
        this.forecastMarketMovement(newsItems, priceData, options),
        this.analyzeCatalysts(newsItems, options),
        this.calculateCorrelations(newsItems, priceData, options)
      ]);

      logger.info('Predictive impact analysis completed', {
        processingTime: Date.now() - startTime,
        predictionsGenerated: impactPredictions.length,
        marketDirection: marketMovementForecast.direction
      });

      return {
        impactPredictions,
        marketMovementForecast,
        catalystAnalysis,
        correlationInsights
      };

    } catch (error) {
      logger.error('Predictive impact analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      });

      return {
        impactPredictions: [],
        marketMovementForecast: {
          direction: 'SIDEWAYS',
          probability: 0.3,
          priceTargets: {},
          volatilityExpectation: 'MEDIUM'
        },
        catalystAnalysis: {
          positiveCatalysts: [],
          negativeCatalysts: [],
          wildcardEvents: []
        },
        correlationInsights: {
          newsToPrice: 0.5,
          crossAssetCorrelation: 0.5,
          marketSentimentAlignment: 0.5
        }
      };
    }
  }

  private async generateImpactPredictions(
    newsItems: NewsItem[], 
    priceData: Record<string, any>, 
    _options: any
  ): Promise<Array<{
    event: string;
    probability: number;
    magnitude: 'LOW' | 'MEDIUM' | 'HIGH';
    timeframe: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
    affectedAssets: string[];
    confidence: number;
    reasoning: string;
  }>> {
    const predictions: any[] = [];
    
    // Categorize news by impact potential
    const highImpactNews = newsItems.filter(item => 
      (item.importance_score || 0.5) > 0.7 || 
      this.isHighImpactEvent(item)
    );

    for (const item of highImpactNews.slice(0, 5)) {
      try {
        // Use AI to analyze potential impact
        const impactResult = await aiProcessor.analyzeImpact(item.title, item.content);
        
        const prediction = {
          event: item.title,
          probability: this.calculateEventProbability(item, impactResult),
          magnitude: impactResult.impact,
          timeframe: impactResult.timeframe,
          affectedAssets: impactResult.affectedCoins,
          confidence: this.assessPredictionConfidence(item, impactResult),
          reasoning: impactResult.reasoning
        };

        predictions.push(prediction);

      } catch (error) {
        logger.warn('Failed to generate prediction for news item', {
          title: item.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Add market-wide predictions based on overall sentiment
    const marketWidePrediction = this.generateMarketWidePrediction(newsItems, priceData);
    if (marketWidePrediction) {
      predictions.push(marketWidePrediction);
    }

    return predictions;
  }

  private isHighImpactEvent(item: NewsItem): boolean {
    const highImpactKeywords = [
      'regulation', 'sec', 'fed', 'treasury', 'government',
      'blackrock', 'etf', 'institutional', 'adoption',
      'hack', 'exploit', 'security', 'breach',
      'upgrade', 'fork', 'consensus', 'protocol',
      'lawsuit', 'court', 'legal', 'ban',
      'partnership', 'integration', 'launch'
    ];

    const text = (item.title + ' ' + item.content).toLowerCase();
    return highImpactKeywords.some(keyword => text.includes(keyword));
  }

  private calculateEventProbability(item: NewsItem, impactResult: any): number {
    let baseProbability = 0.5;
    
    // Adjust based on source credibility
    const credibleSources = ['coindesk', 'bloomberg', 'reuters', 'coinbase'];
    if (credibleSources.some(source => item.source.toLowerCase().includes(source))) {
      baseProbability += 0.2;
    }
    
    // Adjust based on impact magnitude
    switch (impactResult.impact) {
      case 'HIGH':
        baseProbability += 0.1;
        break;
      case 'MEDIUM':
        baseProbability += 0.05;
        break;
      case 'LOW':
        baseProbability -= 0.05;
        break;
    }
    
    // Adjust based on timeframe (shorter timeframe = higher probability)
    switch (impactResult.timeframe) {
      case 'SHORT_TERM':
        baseProbability += 0.1;
        break;
      case 'MEDIUM_TERM':
        baseProbability += 0.05;
        break;
      case 'LONG_TERM':
        baseProbability -= 0.05;
        break;
    }
    
    return Math.max(0.1, Math.min(0.9, baseProbability));
  }

  private assessPredictionConfidence(item: NewsItem, _impactResult: any): number {
    let confidence = 0.5;
    
    // Higher confidence for established news sources
    if (item.source.includes('CoinDesk') || item.source.includes('CoinTelegraph')) {
      confidence += 0.2;
    }
    
    // Higher confidence for specific, actionable information
    if (item.content.includes('confirmed') || item.content.includes('official')) {
      confidence += 0.15;
    }
    
    // Lower confidence for speculative content
    if (item.content.includes('rumor') || item.content.includes('speculation')) {
      confidence -= 0.2;
    }
    
    // Adjust based on content length (more detail = higher confidence)
    const contentLength = item.content.length;
    if (contentLength > 1000) {
      confidence += 0.1;
    } else if (contentLength < 200) {
      confidence -= 0.1;
    }
    
    return Math.max(0.1, Math.min(0.9, confidence));
  }

  private generateMarketWidePrediction(
    newsItems: NewsItem[], 
    priceData: Record<string, any>
  ): any {
    const overallSentiment = this.calculateOverallNewsSentiment(newsItems);
    
    if (Math.abs(overallSentiment) > 0.3) {
      return {
        event: 'Market-wide sentiment shift based on news aggregate',
        probability: Math.abs(overallSentiment),
        magnitude: Math.abs(overallSentiment) > 0.6 ? 'HIGH' : 'MEDIUM',
        timeframe: 'SHORT_TERM',
        affectedAssets: Object.keys(priceData),
        confidence: 0.7,
        reasoning: `Aggregate news sentiment indicates ${overallSentiment > 0 ? 'positive' : 'negative'} market direction`
      };
    }
    
    return null;
  }

  private calculateOverallNewsSentiment(newsItems: NewsItem[]): number {
    const positiveWords = ['bull', 'rise', 'gain', 'up', 'growth', 'positive', 'surge'];
    const negativeWords = ['bear', 'fall', 'drop', 'down', 'decline', 'negative', 'crash'];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    newsItems.forEach(item => {
      const text = (item.title + ' ' + item.content).toLowerCase();
      const importance = item.importance_score || 0.5;
      
      positiveWords.forEach(word => {
        const count = (text.match(new RegExp(word, 'g')) || []).length;
        positiveScore += count * importance;
      });
      
      negativeWords.forEach(word => {
        const count = (text.match(new RegExp(word, 'g')) || []).length;
        negativeScore += count * importance;
      });
    });
    
    const totalScore = positiveScore + negativeScore;
    return totalScore > 0 ? (positiveScore - negativeScore) / totalScore : 0;
  }

  private async forecastMarketMovement(
    newsItems: NewsItem[], 
    priceData: Record<string, any>, 
    _options: any
  ): Promise<{
    direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    probability: number;
    priceTargets: Record<string, { high: number; low: number }>;
    volatilityExpectation: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    // Analyze current price momentum
    const priceMomentum = this.analyzePriceMomentum(priceData);
    
    // Analyze news sentiment
    const newsSentiment = this.calculateOverallNewsSentiment(newsItems);
    
    // Combine signals to forecast direction
    const combinedSignal = (priceMomentum * 0.6) + (newsSentiment * 0.4);
    
    let direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    let probability: number;
    
    if (combinedSignal > 0.2) {
      direction = 'UP';
      probability = Math.min(0.8, 0.5 + Math.abs(combinedSignal));
    } else if (combinedSignal < -0.2) {
      direction = 'DOWN';
      probability = Math.min(0.8, 0.5 + Math.abs(combinedSignal));
    } else {
      direction = 'SIDEWAYS';
      probability = 0.6;
    }
    
    // Generate price targets
    const priceTargets = this.generatePriceTargets(priceData, direction, combinedSignal);
    
    // Assess volatility expectation
    const volatilityExpectation = this.assessVolatilityExpectation(newsItems, _options);
    
    return {
      direction,
      probability,
      priceTargets,
      volatilityExpectation
    };
  }

  private analyzePriceMomentum(priceData: Record<string, any>): number {
    if (Object.keys(priceData).length === 0) return 0;
    
    let totalMomentum = 0;
    let count = 0;
    
    Object.values(priceData).forEach((coinData: any) => {
      if (coinData.change_24h !== undefined) {
        totalMomentum += coinData.change_24h / 100; // Convert percentage to decimal
        count++;
      }
    });
    
    return count > 0 ? totalMomentum / count : 0;
  }

  private generatePriceTargets(
    priceData: Record<string, any>, 
    direction: string, 
    signal: number
  ): Record<string, { high: number; low: number }> {
    const targets: Record<string, { high: number; low: number }> = {};
    
    Object.entries(priceData).forEach(([symbol, data]: [string, any]) => {
      if (!data.current) return;
      
      const currentPrice = data.current;
      const volatility = Math.abs(signal) * 0.1; // Base volatility on signal strength
      
      let targetMultiplier = 1.0;
      if (direction === 'UP') {
        targetMultiplier = 1 + volatility;
      } else if (direction === 'DOWN') {
        targetMultiplier = 1 - volatility;
      }
      
      targets[symbol] = {
        high: currentPrice * (targetMultiplier + volatility),
        low: currentPrice * (targetMultiplier - volatility)
      };
    });
    
    return targets;
  }

  private assessVolatilityExpectation(newsItems: NewsItem[], _options: any): 'LOW' | 'MEDIUM' | 'HIGH' {
    const volatilityKeywords = [
      'volatile', 'volatility', 'swing', 'fluctuation',
      'uncertainty', 'risk', 'unstable', 'turbulent'
    ];
    
    const highVolatilityEvents = [
      'regulation', 'hack', 'fork', 'upgrade', 'lawsuit',
      'sec', 'government', 'ban', 'crisis'
    ];
    
    let volatilityScore = 0;
    
    newsItems.forEach(item => {
      const text = (item.title + ' ' + item.content).toLowerCase();
      
      volatilityKeywords.forEach(keyword => {
        if (text.includes(keyword)) volatilityScore += 0.5;
      });
      
      highVolatilityEvents.forEach(event => {
        if (text.includes(event)) volatilityScore += 1.0;
      });
    });
    
    const avgVolatilityScore = volatilityScore / newsItems.length;
    
    if (avgVolatilityScore > 1.0) return 'HIGH';
    if (avgVolatilityScore > 0.5) return 'MEDIUM';
    return 'LOW';
  }

  private async analyzeCatalysts(newsItems: NewsItem[], _options: any): Promise<{
    positiveCatalysts: string[];
    negativeCatalysts: string[];
    wildcardEvents: string[];
  }> {
    const positiveCatalysts: string[] = [];
    const negativeCatalysts: string[] = [];
    const wildcardEvents: string[] = [];
    
    const positivePatterns = [
      'adoption', 'partnership', 'integration', 'upgrade',
      'institutional', 'etf approval', 'mainstream', 'bullish'
    ];
    
    const negativePatterns = [
      'regulation', 'ban', 'hack', 'exploit', 'lawsuit',
      'crackdown', 'restriction', 'concern', 'bearish'
    ];
    
    const wildcardPatterns = [
      'unprecedented', 'first time', 'never before', 'surprise',
      'unexpected', 'breakthrough', 'revolutionary'
    ];
    
    newsItems.forEach(item => {
      const text = (item.title + ' ' + item.content).toLowerCase();
      
      // Check for positive catalysts
      positivePatterns.forEach(pattern => {
        if (text.includes(pattern)) {
          positiveCatalysts.push(`${item.title.substring(0, 100)}...`);
        }
      });
      
      // Check for negative catalysts
      negativePatterns.forEach(pattern => {
        if (text.includes(pattern)) {
          negativeCatalysts.push(`${item.title.substring(0, 100)}...`);
        }
      });
      
      // Check for wildcard events
      wildcardPatterns.forEach(pattern => {
        if (text.includes(pattern)) {
          wildcardEvents.push(`${item.title.substring(0, 100)}...`);
        }
      });
    });
    
    return {
      positiveCatalysts: [...new Set(positiveCatalysts)].slice(0, 5),
      negativeCatalysts: [...new Set(negativeCatalysts)].slice(0, 5),
      wildcardEvents: [...new Set(wildcardEvents)].slice(0, 3)
    };
  }

  private async calculateCorrelations(
    newsItems: NewsItem[], 
    priceData: Record<string, any>, 
    _options: any
  ): Promise<{
    newsToPrice: number;
    crossAssetCorrelation: number;
    marketSentimentAlignment: number;
  }> {
    // Simplified correlation analysis
    // In production, this would use statistical methods with historical data
    
    const newsVolume = newsItems.length;
    // const priceVolatility = this.calculatePriceVolatility(priceData);
    
    // News-to-price correlation (higher news volume typically correlates with price movement)
    const newsToPrice = Math.min(0.9, Math.max(0.1, newsVolume / 20));
    
    // Cross-asset correlation (how similar the price movements are)
    const crossAssetCorrelation = this.calculateCrossAssetCorrelation(priceData);
    
    // Market sentiment alignment (how well news sentiment matches price direction)
    const newsSentiment = this.calculateOverallNewsSentiment(newsItems);
    const priceMomentum = this.analyzePriceMomentum(priceData);
    const marketSentimentAlignment = 1 - Math.abs(newsSentiment - priceMomentum);
    
    return {
      newsToPrice: Math.max(0, Math.min(1, newsToPrice)),
      crossAssetCorrelation: Math.max(0, Math.min(1, crossAssetCorrelation)),
      marketSentimentAlignment: Math.max(0, Math.min(1, marketSentimentAlignment))
    };
  }

  // Utility method for calculating price volatility - currently unused but may be useful for future enhancements
  // private _calculatePriceVolatility(priceData: Record<string, any>): number {
  //   if (Object.keys(priceData).length === 0) return 0;
  //   
  //   const changes = Object.values(priceData)
  //     .map((data: any) => Math.abs(data.change_24h || 0))
  //     .filter(change => change > 0);
  //   
  //   if (changes.length === 0) return 0;
  //   
  //   const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
  //   return Math.min(1, avgChange / 10); // Normalize to 0-1 range
  // }

  private calculateCrossAssetCorrelation(priceData: Record<string, any>): number {
    const changes = Object.values(priceData)
      .map((data: any) => data.change_24h || 0)
      .filter(change => change !== 0);
    
    if (changes.length < 2) return 0.5;
    
    // Simple correlation: if most assets move in same direction, correlation is high
    const positiveChanges = changes.filter(change => change > 0).length;
    const negativeChanges = changes.filter(change => change < 0).length;
    
    const dominantDirection = Math.max(positiveChanges, negativeChanges);
    return dominantDirection / changes.length;
  }
}