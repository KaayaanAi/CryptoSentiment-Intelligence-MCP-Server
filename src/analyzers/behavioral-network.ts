import { logger } from '../utils/logger.js';
import { NewsItem } from '../types/index.js';

export class BehavioralNetworkAnalyzer {
  async analyze(newsItems: NewsItem[], options: {
    depth: 'quick' | 'standard' | 'deep';
    focusCoins?: string[];
  }): Promise<{
    whaleActivity: 'INCREASED_ACCUMULATION' | 'INCREASED_DISTRIBUTION' | 'NEUTRAL';
    socialSentiment: 'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED' | 'FEAR_TO_GREED_TRANSITION';
    influencerAlignment: number;
    volumePatterns: 'ACCUMULATION' | 'DISTRIBUTION' | 'SIDEWAYS';
    retailSentiment: 'BULLISH' | 'BEARISH' | 'MIXED';
    networkEffects: {
      viralPotential: number;
      cascadeRisk: number;
      herdBehavior: number;
    };
    behaviorPatterns: string[];
  }> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting behavioral network analysis', {
        newsCount: newsItems.length,
        depth: options.depth,
        focusCoins: options.focusCoins
      });

      // Analyze different behavioral aspects
      const [
        whaleActivity,
        socialSentiment,
        influencerAlignment,
        volumePatterns,
        retailSentiment,
        networkEffects,
        behaviorPatterns
      ] = await Promise.all([
        this.analyzeWhaleActivity(newsItems, options),
        this.analyzeSocialSentiment(newsItems, options),
        this.analyzeInfluencerAlignment(newsItems, options),
        this.analyzeVolumePatterns(newsItems, options),
        this.analyzeRetailSentiment(newsItems, options),
        this.analyzeNetworkEffects(newsItems, options),
        this.identifyBehaviorPatterns(newsItems, options)
      ]);

      logger.info('Behavioral network analysis completed', {
        processingTime: Date.now() - startTime,
        whaleActivity,
        socialSentiment,
        influencerAlignment
      });

      return {
        whaleActivity,
        socialSentiment,
        influencerAlignment,
        volumePatterns,
        retailSentiment,
        networkEffects,
        behaviorPatterns
      };

    } catch (error) {
      logger.error('Behavioral network analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      });

      return {
        whaleActivity: 'NEUTRAL',
        socialSentiment: 'NEUTRAL',
        influencerAlignment: 0.5,
        volumePatterns: 'SIDEWAYS',
        retailSentiment: 'MIXED',
        networkEffects: {
          viralPotential: 0.5,
          cascadeRisk: 0.5,
          herdBehavior: 0.5
        },
        behaviorPatterns: ['Analysis failed']
      };
    }
  }

  private async analyzeWhaleActivity(newsItems: NewsItem[], _options: any): Promise<'INCREASED_ACCUMULATION' | 'INCREASED_DISTRIBUTION' | 'NEUTRAL'> {
    // Keywords that indicate whale behavior
    const accumulationKeywords = [
      'whale', 'whales', 'large holder', 'institution', 'fund',
      'accumulating', 'buying', 'purchased', 'acquired', 'added',
      'blackrock', 'microstrategy', 'tesla', 'grayscale', 'coinbase',
      'institutional', 'adoption', 'allocation', 'investment'
    ];

    const distributionKeywords = [
      'selling', 'sold', 'dumped', 'liquidated', 'reduced',
      'profit-taking', 'distribution', 'offloading', 'exit',
      'mt gox', 'government', 'seized', 'auction'
    ];

    let accumulationScore = 0;
    let distributionScore = 0;

    for (const item of newsItems) {
      const text = (item.title + ' ' + item.content).toLowerCase();
      const importance = item.importance_score || 0.5;

      // Check for accumulation signals
      accumulationKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          accumulationScore += importance;
        }
      });

      // Check for distribution signals
      distributionKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          distributionScore += importance;
        }
      });
    }

    // Determine whale activity based on scores
    const threshold = 0.5;
    if (accumulationScore > distributionScore + threshold) {
      return 'INCREASED_ACCUMULATION';
    } else if (distributionScore > accumulationScore + threshold) {
      return 'INCREASED_DISTRIBUTION';
    } else {
      return 'NEUTRAL';
    }
  }

  private async analyzeSocialSentiment(newsItems: NewsItem[], _options: any): Promise<'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED' | 'FEAR_TO_GREED_TRANSITION'> {
    const fearKeywords = [
      'crash', 'dump', 'collapse', 'panic', 'fear', 'worried', 'concern',
      'bear market', 'bearish', 'selling pressure', 'liquidation',
      'fud', 'uncertainty', 'regulatory', 'ban', 'crackdown'
    ];

    const greedKeywords = [
      'moon', 'mooning', 'pump', 'rally', 'surge', 'explode',
      'bull market', 'bullish', 'fomo', 'all-time high', 'ath',
      'breakout', 'rocket', 'lambo', 'diamond hands', 'hodl'
    ];

    const transitionKeywords = [
      'bottom', 'reversal', 'turning point', 'shift', 'changing',
      'recovery', 'bounce', 'support level', 'oversold'
    ];

    let fearScore = 0;
    let greedScore = 0;
    let transitionScore = 0;

    for (const item of newsItems) {
      const text = (item.title + ' ' + item.content).toLowerCase();
      const importance = item.importance_score || 0.5;

      fearKeywords.forEach(keyword => {
        if (text.includes(keyword)) fearScore += importance;
      });

      greedKeywords.forEach(keyword => {
        if (text.includes(keyword)) greedScore += importance;
      });

      transitionKeywords.forEach(keyword => {
        if (text.includes(keyword)) transitionScore += importance;
      });
    }

    // Check for transition signals first
    if (transitionScore > 1.0) {
      return 'FEAR_TO_GREED_TRANSITION';
    }

    // Determine sentiment based on scores
    if (greedScore > fearScore) {
      return greedScore > 2.0 ? 'EXTREME_GREED' : 'GREED';
    } else if (fearScore > greedScore) {
      return fearScore > 2.0 ? 'EXTREME_FEAR' : 'FEAR';
    } else {
      return 'NEUTRAL';
    }
  }

  private async analyzeInfluencerAlignment(newsItems: NewsItem[], _options: any): Promise<number> {
    const influencerSources = [
      'elon musk', 'michael saylor', 'cathie wood', 'raoul pal',
      'anthony pompliano', 'andreas antonopoulos', 'vitalik buterin',
      'changpeng zhao', 'brian armstrong', 'barry silbert'
    ];

    let positiveInfluencerSignals = 0;
    let negativeInfluencerSignals = 0;
    let totalInfluencerMentions = 0;

    for (const item of newsItems) {
      const text = (item.title + ' ' + item.content).toLowerCase();
      
      for (const influencer of influencerSources) {
        if (text.includes(influencer)) {
          totalInfluencerMentions++;
          
          // Determine if the mention is positive or negative
          const sentimentWords = this.extractSentimentContext(text, influencer);
          if (sentimentWords.positive > sentimentWords.negative) {
            positiveInfluencerSignals++;
          } else if (sentimentWords.negative > sentimentWords.positive) {
            negativeInfluencerSignals++;
          }
        }
      }
    }

    if (totalInfluencerMentions === 0) {
      return 0.5; // Neutral alignment when no influencer signals
    }

    // Calculate alignment score (0-1, where 1 is fully aligned positive)
    return positiveInfluencerSignals / totalInfluencerMentions;
  }

  private extractSentimentContext(text: string, anchor: string): { positive: number; negative: number } {
    const anchorIndex = text.indexOf(anchor);
    if (anchorIndex === -1) return { positive: 0, negative: 0 };

    // Extract 100 characters before and after the anchor
    const start = Math.max(0, anchorIndex - 100);
    const end = Math.min(text.length, anchorIndex + anchor.length + 100);
    const context = text.substring(start, end);

    const positiveWords = ['bullish', 'positive', 'supports', 'believes', 'optimistic', 'buying', 'endorses'];
    const negativeWords = ['bearish', 'negative', 'warns', 'concerned', 'selling', 'criticizes', 'doubts'];

    let positive = 0;
    let negative = 0;

    positiveWords.forEach(word => {
      if (context.includes(word)) positive++;
    });

    negativeWords.forEach(word => {
      if (context.includes(word)) negative++;
    });

    return { positive, negative };
  }

  private async analyzeVolumePatterns(newsItems: NewsItem[], _options: any): Promise<'ACCUMULATION' | 'DISTRIBUTION' | 'SIDEWAYS'> {
    const accumulationPatterns = [
      'volume increase', 'high volume', 'buying volume', 'accumulation',
      'institutional buying', 'whale accumulation', 'strong demand'
    ];

    const distributionPatterns = [
      'selling volume', 'distribution', 'profit-taking', 'liquidation',
      'volume spike sell', 'dumping', 'heavy selling', 'exit liquidity'
    ];

    let accumulationCount = 0;
    let distributionCount = 0;

    for (const item of newsItems) {
      const text = (item.title + ' ' + item.content).toLowerCase();

      accumulationPatterns.forEach(pattern => {
        if (text.includes(pattern)) accumulationCount++;
      });

      distributionPatterns.forEach(pattern => {
        if (text.includes(pattern)) distributionCount++;
      });
    }

    if (accumulationCount > distributionCount) {
      return 'ACCUMULATION';
    } else if (distributionCount > accumulationCount) {
      return 'DISTRIBUTION';
    } else {
      return 'SIDEWAYS';
    }
  }

  private async analyzeRetailSentiment(newsItems: NewsItem[], _options: any): Promise<'BULLISH' | 'BEARISH' | 'MIXED'> {
    const retailSources = ['reddit', 'twitter', 'social media', 'retail', 'individual'];
    
    let bullishRetailSignals = 0;
    let bearishRetailSignals = 0;
    let totalRetailSignals = 0;

    for (const item of newsItems) {
      const text = (item.title + ' ' + item.content).toLowerCase();
      
      const hasRetailMention = retailSources.some(source => text.includes(source));
      if (!hasRetailMention) continue;

      totalRetailSignals++;

      // Analyze sentiment in retail contexts
      const bullishWords = ['buying', 'hodl', 'diamond hands', 'bullish', 'moon', 'pump'];
      const bearishWords = ['selling', 'panic', 'fearful', 'bearish', 'dump', 'crash'];

      let bullishCount = 0;
      let bearishCount = 0;

      bullishWords.forEach(word => {
        if (text.includes(word)) bullishCount++;
      });

      bearishWords.forEach(word => {
        if (text.includes(word)) bearishCount++;
      });

      if (bullishCount > bearishCount) {
        bullishRetailSignals++;
      } else if (bearishCount > bullishCount) {
        bearishRetailSignals++;
      }
    }

    if (totalRetailSignals === 0) return 'MIXED';

    const bullishRatio = bullishRetailSignals / totalRetailSignals;
    const bearishRatio = bearishRetailSignals / totalRetailSignals;

    if (bullishRatio > 0.6) return 'BULLISH';
    if (bearishRatio > 0.6) return 'BEARISH';
    return 'MIXED';
  }

  private async analyzeNetworkEffects(newsItems: NewsItem[], _options: any): Promise<{
    viralPotential: number;
    cascadeRisk: number;
    herdBehavior: number;
  }> {
    let viralIndicators = 0;
    let cascadeIndicators = 0;
    let herdIndicators = 0;

    const viralKeywords = ['viral', 'trending', 'social media', 'twitter', 'reddit', 'telegram'];
    const cascadeKeywords = ['contagion', 'spillover', 'domino', 'chain reaction', 'correlation'];
    const herdKeywords = ['fomo', 'everyone', 'crowd', 'mainstream', 'mass adoption', 'retail'];

    for (const item of newsItems) {
      const text = (item.title + ' ' + item.content).toLowerCase();

      viralKeywords.forEach(keyword => {
        if (text.includes(keyword)) viralIndicators++;
      });

      cascadeKeywords.forEach(keyword => {
        if (text.includes(keyword)) cascadeIndicators++;
      });

      herdKeywords.forEach(keyword => {
        if (text.includes(keyword)) herdIndicators++;
      });
    }

    const maxIndicators = newsItems.length;

    return {
      viralPotential: Math.min(viralIndicators / maxIndicators, 1.0),
      cascadeRisk: Math.min(cascadeIndicators / maxIndicators, 1.0),
      herdBehavior: Math.min(herdIndicators / maxIndicators, 1.0)
    };
  }

  private async identifyBehaviorPatterns(newsItems: NewsItem[], _options: any): Promise<string[]> {
    const patterns: string[] = [];
    
    // Pattern detection based on news analysis
    const textContent = newsItems.map(item => item.title + ' ' + item.content).join(' ').toLowerCase();

    // Identify common behavioral patterns
    if (textContent.includes('institutional') && textContent.includes('adoption')) {
      patterns.push('Institutional adoption wave driving market confidence');
    }

    if (textContent.includes('retail') && textContent.includes('fomo')) {
      patterns.push('Retail FOMO cycle beginning to emerge');
    }

    if (textContent.includes('whale') && textContent.includes('accumulation')) {
      patterns.push('Whale accumulation pattern detected');
    }

    if (textContent.includes('liquidation') && textContent.includes('cascade')) {
      patterns.push('Liquidation cascade risk elevated');
    }

    if (textContent.includes('social media') && textContent.includes('viral')) {
      patterns.push('Social media amplification effect in progress');
    }

    if (textContent.includes('regulation') && textContent.includes('uncertainty')) {
      patterns.push('Regulatory uncertainty creating market hesitation');
    }

    if (textContent.includes('technical') && textContent.includes('breakout')) {
      patterns.push('Technical breakout driving algorithmic trading');
    }

    // Default pattern if none detected
    if (patterns.length === 0) {
      patterns.push('Standard market behavior patterns observed');
    }

    return patterns.slice(0, 5); // Limit to 5 patterns
  }
}