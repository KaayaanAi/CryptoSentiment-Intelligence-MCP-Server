import { logger } from '../utils/logger.js';
import { aiProcessor } from '../services/ai-processor.js';
import { NewsItem } from '../types/index.js';

export class SentimentFusionAnalyzer {
  async analyze(newsItems: NewsItem[], options: {
    depth: 'quick' | 'standard' | 'deep';
    priceContext?: Record<string, any>;
  }): Promise<{
    overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    signals: Array<{
      headline: string;
      sentiment: 'STRONGLY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'STRONGLY_NEGATIVE';
      magnitude: 'HIGH' | 'MEDIUM' | 'LOW';
      direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      analysis: string;
      recommendation: 'STRONG_BUY_SIGNAL' | 'BUY_SIGNAL' | 'HOLD' | 'SELL_SIGNAL' | 'STRONG_SELL_SIGNAL';
      confidence: number;
    }>;
    marketMood: string;
    consensusStrength: number;
  }> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting sentiment fusion analysis', {
        newsCount: newsItems.length,
        depth: options.depth
      });

      // Determine how many items to analyze based on depth
      const analysisLimit = this.getAnalysisLimit(options.depth);
      const itemsToAnalyze = newsItems.slice(0, analysisLimit);

      // Multi-source sentiment analysis
      const sentimentPromises = itemsToAnalyze.map(async (item, index) => {
        try {
          const sentimentResult = await aiProcessor.analyzeSentiment(
            `${item.title} ${item.content.substring(0, 500)}`
          );

          const impactResult = await aiProcessor.analyzeImpact(item.title, item.content);

          return {
            index,
            headline: item.title,
            sentiment: this.mapSentimentToScale(sentimentResult.sentiment, sentimentResult.confidence),
            magnitude: impactResult.impact,
            direction: impactResult.direction,
            analysis: sentimentResult.reasoning,
            recommendation: this.generateRecommendation(
              sentimentResult.sentiment,
              impactResult.impact,
              impactResult.direction
            ),
            confidence: sentimentResult.confidence,
            source: item.source,
            importance: item.importance_score || 0.5
          };
        } catch (error) {
          logger.warn('Individual sentiment analysis failed', {
            headline: item.title,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          return {
            index,
            headline: item.title,
            sentiment: 'NEUTRAL' as const,
            magnitude: 'MEDIUM' as const,
            direction: 'NEUTRAL' as const,
            analysis: 'Sentiment analysis failed',
            recommendation: 'HOLD' as const,
            confidence: 0.1,
            source: item.source,
            importance: 0.1
          };
        }
      });

      const signals = await Promise.all(sentimentPromises);

      // Calculate overall sentiment through fusion
      const fusionResult = this.fuseSentiments(signals, options.priceContext);

      logger.info('Sentiment fusion analysis completed', {
        processingTime: Date.now() - startTime,
        signalsAnalyzed: signals.length,
        overallSentiment: fusionResult.overallSentiment,
        confidence: fusionResult.confidence
      });

      return fusionResult;

    } catch (error) {
      logger.error('Sentiment fusion analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      });

      return {
        overallSentiment: 'NEUTRAL',
        confidence: 0,
        signals: [],
        marketMood: 'Analysis failed',
        consensusStrength: 0
      };
    }
  }

  private getAnalysisLimit(depth: string): number {
    switch (depth) {
      case 'quick': return 5;
      case 'standard': return 12;
      case 'deep': return 20;
      default: return 10;
    }
  }

  private mapSentimentToScale(
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
    confidence: number
  ): 'STRONGLY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'STRONGLY_NEGATIVE' {
    if (sentiment === 'NEUTRAL') return 'NEUTRAL';
    
    if (sentiment === 'POSITIVE') {
      return confidence > 0.8 ? 'STRONGLY_POSITIVE' : 'POSITIVE';
    }
    
    if (sentiment === 'NEGATIVE') {
      return confidence > 0.8 ? 'STRONGLY_NEGATIVE' : 'NEGATIVE';
    }
    
    return 'NEUTRAL';
  }

  private generateRecommendation(
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
    impact: 'HIGH' | 'MEDIUM' | 'LOW',
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  ): 'STRONG_BUY_SIGNAL' | 'BUY_SIGNAL' | 'HOLD' | 'SELL_SIGNAL' | 'STRONG_SELL_SIGNAL' {
    // Strong signals require both high sentiment confidence and high impact
    if (sentiment === 'POSITIVE' && direction === 'BULLISH') {
      return impact === 'HIGH' ? 'STRONG_BUY_SIGNAL' : 'BUY_SIGNAL';
    }
    
    if (sentiment === 'NEGATIVE' && direction === 'BEARISH') {
      return impact === 'HIGH' ? 'STRONG_SELL_SIGNAL' : 'SELL_SIGNAL';
    }
    
    // Weak or conflicting signals default to hold
    return 'HOLD';
  }

  private fuseSentiments(
    signals: Array<{
      sentiment: string;
      magnitude: string;
      direction: string;
      confidence: number;
      importance: number;
    }>,
    priceContext?: Record<string, any>
  ): {
    overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    signals: any[];
    marketMood: string;
    consensusStrength: number;
  } {
    if (signals.length === 0) {
      return {
        overallSentiment: 'NEUTRAL',
        confidence: 0,
        signals: [],
        marketMood: 'No data available',
        consensusStrength: 0
      };
    }

    // Weighted sentiment scoring
    let bullishScore = 0;
    let bearishScore = 0;
    let neutralScore = 0;
    let totalWeight = 0;

    signals.forEach(signal => {
      const weight = signal.confidence * signal.importance;
      totalWeight += weight;

      switch (signal.sentiment) {
        case 'STRONGLY_POSITIVE':
          bullishScore += weight * 2;
          break;
        case 'POSITIVE':
          bullishScore += weight * 1;
          break;
        case 'STRONGLY_NEGATIVE':
          bearishScore += weight * 2;
          break;
        case 'NEGATIVE':
          bearishScore += weight * 1;
          break;
        case 'NEUTRAL':
          neutralScore += weight;
          break;
      }
    });

    // Normalize scores
    if (totalWeight > 0) {
      bullishScore /= totalWeight;
      bearishScore /= totalWeight;
      neutralScore /= totalWeight;
    }

    // Price momentum adjustment
    if (priceContext) {
      const priceInfluence = this.calculatePriceInfluence(priceContext);
      bullishScore *= priceInfluence.bullishMultiplier;
      bearishScore *= priceInfluence.bearishMultiplier;
    }

    // Determine overall sentiment
    let overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    let confidence: number;

    if (bullishScore > bearishScore && bullishScore > neutralScore) {
      overallSentiment = 'BULLISH';
      confidence = bullishScore;
    } else if (bearishScore > bullishScore && bearishScore > neutralScore) {
      overallSentiment = 'BEARISH';
      confidence = bearishScore;
    } else {
      overallSentiment = 'NEUTRAL';
      confidence = neutralScore;
    }

    // Calculate consensus strength (how much signals agree)
    const maxScore = Math.max(bullishScore, bearishScore, neutralScore);
    const consensusStrength = maxScore / (bullishScore + bearishScore + neutralScore + 0.001);

    // Generate market mood description
    const marketMood = this.generateMarketMood(
      overallSentiment,
      confidence,
      consensusStrength,
      signals.length
    );

    return {
      overallSentiment,
      confidence: Math.min(confidence, 1.0),
      signals: signals.map(s => ({
        headline: (s as any).headline,
        sentiment: s.sentiment,
        magnitude: s.magnitude,
        direction: s.direction,
        analysis: (s as any).analysis,
        recommendation: (s as any).recommendation,
        confidence: s.confidence
      })),
      marketMood,
      consensusStrength: Math.min(consensusStrength, 1.0)
    };
  }

  private calculatePriceInfluence(priceContext: Record<string, any>): {
    bullishMultiplier: number;
    bearishMultiplier: number;
  } {
    let totalChange = 0;
    let coinCount = 0;

    Object.values(priceContext).forEach((coinData: any) => {
      if (coinData.change_24h !== undefined) {
        totalChange += coinData.change_24h;
        coinCount++;
      }
    });

    if (coinCount === 0) {
      return { bullishMultiplier: 1.0, bearishMultiplier: 1.0 };
    }

    const avgChange = totalChange / coinCount;

    // Adjust sentiment based on price momentum
    if (avgChange > 0) {
      // Prices rising - amplify bullish sentiment slightly, dampen bearish
      return {
        bullishMultiplier: 1.0 + Math.min(avgChange / 100, 0.2),
        bearishMultiplier: 1.0 - Math.min(avgChange / 200, 0.1)
      };
    } else {
      // Prices falling - amplify bearish sentiment slightly, dampen bullish
      return {
        bullishMultiplier: 1.0 + Math.max(avgChange / 200, -0.1),
        bearishMultiplier: 1.0 - Math.max(avgChange / 100, -0.2)
      };
    }
  }

  private generateMarketMood(
    sentiment: string,
    confidence: number,
    consensus: number,
    signalCount: number
  ): string {
    const strengthAdjectives = confidence > 0.8 ? 'Strong' : confidence > 0.6 ? 'Moderate' : 'Weak';
    const consensusAdjectives = consensus > 0.8 ? 'unified' : consensus > 0.6 ? 'mostly aligned' : 'mixed';
    
    if (sentiment === 'BULLISH') {
      return `${strengthAdjectives} bullish sentiment with ${consensusAdjectives} signals from ${signalCount} news sources`;
    } else if (sentiment === 'BEARISH') {
      return `${strengthAdjectives} bearish sentiment with ${consensusAdjectives} signals from ${signalCount} news sources`;
    } else {
      return `${strengthAdjectives} neutral sentiment with ${consensusAdjectives} signals from ${signalCount} news sources`;
    }
  }
}