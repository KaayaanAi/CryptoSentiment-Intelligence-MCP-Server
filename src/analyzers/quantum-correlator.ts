import { logger } from '../utils/logger.js';
import { NewsItem } from '../types/index.js';

export class QuantumCorrelator {
  async analyze(newsItems: NewsItem[], options: {
    depth: 'quick' | 'standard' | 'deep';
    correlationDepth: 'standard' | 'full';
  }): Promise<{
    crossSectorCorrelations: Array<{
      sector: string;
      correlation: number;
      impactVector: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
      confidence: number;
    }>;
    geopoliticalRipples: Array<{
      event: string;
      region: string;
      rippleEffect: number;
      cryptoImpact: 'HIGH' | 'MEDIUM' | 'LOW';
      timeline: string;
    }>;
    macroEconomicAlignments: {
      inflationCorrelation: number;
      stockMarketCorrelation: number;
      bondYieldCorrelation: number;
      commodityCorrelation: number;
      currencyCorrelation: number;
    };
    eventCascadeAnalysis: {
      cascadeProbability: number;
      potentialTriggers: string[];
      amplificationFactors: string[];
      systemicRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    };
    temporalCorrelations: {
      pastEventMatches: Array<{
        historicalEvent: string;
        similarity: number;
        outcome: string;
        timeframe: string;
      }>;
      seasonalPatterns: string[];
      cyclePosition: 'EARLY' | 'MID' | 'LATE' | 'TRANSITION';
    };
  }> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting quantum correlation analysis', {
        newsCount: newsItems.length,
        depth: options.depth,
        correlationDepth: options.correlationDepth
      });

      // Execute all correlation analyses in parallel
      const [
        crossSectorCorrelations,
        geopoliticalRipples,
        macroEconomicAlignments,
        eventCascadeAnalysis,
        temporalCorrelations
      ] = await Promise.all([
        this.analyzeCrossSectorCorrelations(newsItems, options),
        this.analyzeGeopoliticalRipples(newsItems, options),
        this.analyzeMacroEconomicAlignments(newsItems, options),
        this.analyzeEventCascades(newsItems, options),
        this.analyzeTemporalCorrelations(newsItems, options)
      ]);

      logger.info('Quantum correlation analysis completed', {
        processingTime: Date.now() - startTime,
        crossSectorCorrelations: crossSectorCorrelations.length,
        geopoliticalEvents: geopoliticalRipples.length,
        systemicRisk: eventCascadeAnalysis.systemicRisk
      });

      return {
        crossSectorCorrelations,
        geopoliticalRipples,
        macroEconomicAlignments,
        eventCascadeAnalysis,
        temporalCorrelations
      };

    } catch (error) {
      logger.error('Quantum correlation analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      });

      return this.getDefaultCorrelationResult();
    }
  }

  private async analyzeCrossSectorCorrelations(newsItems: NewsItem[], _options: any): Promise<Array<{
    sector: string;
    correlation: number;
    impactVector: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    confidence: number;
  }>> {
    const sectors = [
      'technology', 'finance', 'gaming', 'healthcare', 'energy',
      'real-estate', 'supply-chain', 'media', 'automotive', 'retail'
    ];

    const correlations: Array<any> = [];

    for (const sector of sectors) {
      const sectorMentions = this.findSectorMentions(newsItems, sector);
      
      if (sectorMentions.length === 0) continue;

      // Calculate correlation strength based on mention frequency and sentiment
      const correlation = this.calculateSectorCorrelation(sectorMentions);
      const impactVector = this.determineSectorImpact(sectorMentions);
      const confidence = this.assessSectorConfidence(sectorMentions, newsItems.length);

      correlations.push({
        sector,
        correlation,
        impactVector,
        confidence
      });
    }

    return correlations.sort((a, b) => b.correlation - a.correlation);
  }

  private findSectorMentions(newsItems: NewsItem[], sector: string): NewsItem[] {
    const sectorKeywords: Record<string, string[]> = {
      technology: ['tech', 'ai', 'artificial intelligence', 'software', 'cloud', 'digital'],
      finance: ['bank', 'financial', 'payment', 'lending', 'investment', 'trading'],
      gaming: ['game', 'gaming', 'nft', 'metaverse', 'virtual', 'play-to-earn'],
      healthcare: ['health', 'medical', 'pharma', 'telemedicine', 'biotech'],
      energy: ['energy', 'oil', 'renewable', 'solar', 'mining', 'carbon'],
      'real-estate': ['real estate', 'property', 'housing', 'mortgage', 'reit'],
      'supply-chain': ['supply chain', 'logistics', 'shipping', 'manufacturing'],
      media: ['media', 'streaming', 'content', 'entertainment', 'social'],
      automotive: ['car', 'automotive', 'tesla', 'electric vehicle', 'transport'],
      retail: ['retail', 'ecommerce', 'shopping', 'consumer', 'marketplace']
    };

    const keywords = sectorKeywords[sector] || [];
    
    return newsItems.filter(item => {
      const text = (item.title + ' ' + item.content).toLowerCase();
      return keywords.some(keyword => text.includes(keyword));
    });
  }

  private calculateSectorCorrelation(mentions: NewsItem[]): number {
    // Higher correlation for more mentions and higher importance scores
    const avgImportance = mentions.reduce((sum, item) => 
      sum + (item.importance_score || 0.5), 0) / mentions.length;
    
    const mentionWeight = Math.min(mentions.length / 5, 1.0); // Normalize by 5 mentions
    
    return Math.min(avgImportance * mentionWeight, 1.0);
  }

  private determineSectorImpact(mentions: NewsItem[]): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    const positiveKeywords = ['growth', 'adoption', 'partnership', 'innovation', 'expansion'];
    const negativeKeywords = ['decline', 'problem', 'issue', 'concern', 'challenge'];

    let positiveScore = 0;
    let negativeScore = 0;

    mentions.forEach(item => {
      const text = (item.title + ' ' + item.content).toLowerCase();
      
      positiveKeywords.forEach(keyword => {
        if (text.includes(keyword)) positiveScore++;
      });
      
      negativeKeywords.forEach(keyword => {
        if (text.includes(keyword)) negativeScore++;
      });
    });

    if (positiveScore > negativeScore) return 'POSITIVE';
    if (negativeScore > positiveScore) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  private assessSectorConfidence(mentions: NewsItem[], totalNews: number): number {
    const mentionRatio = mentions.length / totalNews;
    const avgImportance = mentions.reduce((sum, item) => 
      sum + (item.importance_score || 0.5), 0) / mentions.length;
    
    return Math.min(mentionRatio * 2 + avgImportance * 0.5, 1.0);
  }

  private async analyzeGeopoliticalRipples(newsItems: NewsItem[], _options: any): Promise<Array<{
    event: string;
    region: string;
    rippleEffect: number;
    cryptoImpact: 'HIGH' | 'MEDIUM' | 'LOW';
    timeline: string;
  }>> {
    const geopoliticalKeywords = [
      'government', 'regulation', 'policy', 'sanctions', 'trade war',
      'central bank', 'fed', 'ecb', 'china', 'russia', 'eu', 'us'
    ];

    const regions: Record<string, string[]> = {
      'North America': ['us', 'usa', 'united states', 'america', 'fed', 'canada'],
      'Europe': ['eu', 'europe', 'ecb', 'germany', 'france', 'uk', 'britain'],
      'Asia': ['china', 'japan', 'korea', 'india', 'asia', 'pboc'],
      'Global': ['global', 'worldwide', 'international', 'g7', 'g20', 'imf']
    };

    const ripples: Array<any> = [];

    const geopoliticalNews = newsItems.filter(item => {
      const text = (item.title + ' ' + item.content).toLowerCase();
      return geopoliticalKeywords.some(keyword => text.includes(keyword));
    });

    for (const item of geopoliticalNews) {
      const text = (item.title + ' ' + item.content).toLowerCase();
      
      // Determine region
      let region = 'Unknown';
      for (const [regionName, keywords] of Object.entries(regions)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          region = regionName;
          break;
        }
      }

      const rippleEffect = this.calculateRippleEffect(item);
      const cryptoImpact = this.assessCryptoImpact(item);
      const timeline = this.estimateTimeline(item);

      ripples.push({
        event: item.title,
        region,
        rippleEffect,
        cryptoImpact,
        timeline
      });
    }

    return ripples.slice(0, 10); // Limit to top 10 geopolitical events
  }

  private calculateRippleEffect(item: NewsItem): number {
    const impactKeywords = [
      'ban', 'approve', 'regulate', 'sanction', 'policy', 'law',
      'global', 'massive', 'significant', 'major', 'unprecedented'
    ];

    const text = (item.title + ' ' + item.content).toLowerCase();
    let rippleScore = item.importance_score || 0.5;

    impactKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        rippleScore += 0.1;
      }
    });

    return Math.min(rippleScore, 1.0);
  }

  private assessCryptoImpact(item: NewsItem): 'HIGH' | 'MEDIUM' | 'LOW' {
    const highImpactKeywords = ['ban', 'illegal', 'prohibit', 'approve', 'etf', 'legal tender'];
    const mediumImpactKeywords = ['regulate', 'policy', 'framework', 'guidance', 'oversight'];
    
    const text = (item.title + ' ' + item.content).toLowerCase();
    
    if (highImpactKeywords.some(keyword => text.includes(keyword))) {
      return 'HIGH';
    }
    
    if (mediumImpactKeywords.some(keyword => text.includes(keyword))) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  private estimateTimeline(item: NewsItem): string {
    const text = (item.title + ' ' + item.content).toLowerCase();
    
    if (text.includes('immediate') || text.includes('now') || text.includes('today')) {
      return 'Immediate (0-7 days)';
    }
    
    if (text.includes('soon') || text.includes('weeks') || text.includes('month')) {
      return 'Short-term (1-3 months)';
    }
    
    if (text.includes('year') || text.includes('2024') || text.includes('2025')) {
      return 'Medium-term (3-12 months)';
    }
    
    return 'Long-term (1+ years)';
  }

  private async analyzeMacroEconomicAlignments(newsItems: NewsItem[], _options: any): Promise<{
    inflationCorrelation: number;
    stockMarketCorrelation: number;
    bondYieldCorrelation: number;
    commodityCorrelation: number;
    currencyCorrelation: number;
  }> {
    const macroKeywords = {
      inflation: ['inflation', 'cpi', 'consumer price', 'price increase', 'monetary policy'],
      stocks: ['stock market', 'nasdaq', 's&p', 'dow jones', 'equity', 'shares'],
      bonds: ['bond', 'yield', 'treasury', 'interest rate', 'fed rate'],
      commodities: ['gold', 'oil', 'commodity', 'precious metals', 'crude'],
      currency: ['dollar', 'usd', 'euro', 'currency', 'forex', 'exchange rate']
    };

    const correlations: Record<string, number> = {};

    for (const [category, keywords] of Object.entries(macroKeywords)) {
      let mentionCount = 0;
      let totalImportance = 0;

      newsItems.forEach(item => {
        const text = (item.title + ' ' + item.content).toLowerCase();
        const hasMention = keywords.some(keyword => text.includes(keyword));
        
        if (hasMention) {
          mentionCount++;
          totalImportance += (item.importance_score || 0.5);
        }
      });

      if (mentionCount > 0) {
        const avgImportance = totalImportance / mentionCount;
        const mentionFrequency = mentionCount / newsItems.length;
        correlations[category] = Math.min(avgImportance * mentionFrequency * 2, 1.0);
      } else {
        correlations[category] = 0.1; // Baseline correlation
      }
    }

    return {
      inflationCorrelation: correlations.inflation || 0.1,
      stockMarketCorrelation: correlations.stocks || 0.1,
      bondYieldCorrelation: correlations.bonds || 0.1,
      commodityCorrelation: correlations.commodities || 0.1,
      currencyCorrelation: correlations.currency || 0.1
    };
  }

  private async analyzeEventCascades(newsItems: NewsItem[], _options: any): Promise<{
    cascadeProbability: number;
    potentialTriggers: string[];
    amplificationFactors: string[];
    systemicRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }> {
    const cascadeTriggers = [
      'liquidation', 'margin call', 'deleveraging', 'contagion',
      'bank run', 'credit crunch', 'default', 'bankruptcy'
    ];

    const amplificationFactors = [
      'high leverage', 'interconnected', 'systemic', 'too big to fail',
      'derivative', 'algorithmic trading', 'flash crash', 'correlation'
    ];

    let cascadeScore = 0;
    const foundTriggers: string[] = [];
    const foundAmplifiers: string[] = [];

    newsItems.forEach(item => {
      const text = (item.title + ' ' + item.content).toLowerCase();
      const importance = item.importance_score || 0.5;

      cascadeTriggers.forEach(trigger => {
        if (text.includes(trigger)) {
          cascadeScore += importance;
          if (!foundTriggers.includes(trigger)) {
            foundTriggers.push(trigger);
          }
        }
      });

      amplificationFactors.forEach(factor => {
        if (text.includes(factor)) {
          cascadeScore += importance * 0.5;
          if (!foundAmplifiers.includes(factor)) {
            foundAmplifiers.push(factor);
          }
        }
      });
    });

    const cascadeProbability = Math.min(cascadeScore / newsItems.length, 1.0);
    
    let systemicRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (cascadeProbability > 0.8) {
      systemicRisk = 'CRITICAL';
    } else if (cascadeProbability > 0.6) {
      systemicRisk = 'HIGH';
    } else if (cascadeProbability > 0.3) {
      systemicRisk = 'MEDIUM';
    } else {
      systemicRisk = 'LOW';
    }

    return {
      cascadeProbability,
      potentialTriggers: foundTriggers,
      amplificationFactors: foundAmplifiers,
      systemicRisk
    };
  }

  private async analyzeTemporalCorrelations(newsItems: NewsItem[], _options: any): Promise<{
    pastEventMatches: Array<{
      historicalEvent: string;
      similarity: number;
      outcome: string;
      timeframe: string;
    }>;
    seasonalPatterns: string[];
    cyclePosition: 'EARLY' | 'MID' | 'LATE' | 'TRANSITION';
  }> {
    // Historical crypto events for pattern matching
    const historicalEvents = [
      {
        event: 'COVID-19 Market Crash (March 2020)',
        keywords: ['pandemic', 'crash', 'liquidity', 'uncertainty'],
        outcome: 'Sharp decline followed by strong recovery',
        timeframe: '3-6 months recovery'
      },
      {
        event: 'China Crypto Ban (2021)',
        keywords: ['china', 'ban', 'mining', 'regulation'],
        outcome: 'Temporary decline, mining migration',
        timeframe: '6-12 months adjustment'
      },
      {
        event: 'FTX Collapse (November 2022)',
        keywords: ['exchange', 'bankruptcy', 'contagion', 'trust'],
        outcome: 'Market consolidation, increased regulation',
        timeframe: '12+ months recovery'
      },
      {
        event: 'Bitcoin ETF Approvals (2024)',
        keywords: ['etf', 'sec', 'approval', 'institutional'],
        outcome: 'Institutional adoption surge',
        timeframe: '3-9 months impact'
      }
    ];

    const pastEventMatches: Array<any> = [];

    for (const historicalEvent of historicalEvents) {
      let similarity = 0;
      let matchCount = 0;

      newsItems.forEach(item => {
        const text = (item.title + ' ' + item.content).toLowerCase();
        
        historicalEvent.keywords.forEach(keyword => {
          if (text.includes(keyword)) {
            similarity += (item.importance_score || 0.5);
            matchCount++;
          }
        });
      });

      if (matchCount > 0) {
        similarity = (similarity / matchCount) * (matchCount / historicalEvent.keywords.length);
        
        if (similarity > 0.3) {
          pastEventMatches.push({
            historicalEvent: historicalEvent.event,
            similarity: Math.min(similarity, 1.0),
            outcome: historicalEvent.outcome,
            timeframe: historicalEvent.timeframe
          });
        }
      }
    }

    // Seasonal patterns (simplified)
    const currentMonth = new Date().getMonth();
    const seasonalPatterns = this.identifySeasonalPatterns(currentMonth);

    // Cycle position (simplified market cycle analysis)
    const cyclePosition = this.determineCyclePosition(newsItems);

    return {
      pastEventMatches: pastEventMatches.sort((a, b) => b.similarity - a.similarity),
      seasonalPatterns,
      cyclePosition
    };
  }

  private identifySeasonalPatterns(month: number): string[] {
    const patterns: string[] = [];

    // Q1 patterns
    if (month >= 0 && month <= 2) {
      patterns.push('Q1: Institutional rebalancing period');
      patterns.push('Tax season selling pressure (US)');
    }

    // Q2 patterns
    if (month >= 3 && month <= 5) {
      patterns.push('Q2: Conference season (institutional interest)');
      patterns.push('Regulatory clarity season');
    }

    // Q3 patterns
    if (month >= 6 && month <= 8) {
      patterns.push('Q3: Summer trading lull');
      patterns.push('Preparation for Q4 institutional flows');
    }

    // Q4 patterns
    if (month >= 9 && month <= 11) {
      patterns.push('Q4: Year-end institutional positioning');
      patterns.push('Holiday trading volumes');
    }

    return patterns;
  }

  private determineCyclePosition(newsItems: NewsItem[]): 'EARLY' | 'MID' | 'LATE' | 'TRANSITION' {
    const earlyBullKeywords = ['bottom', 'accumulation', 'oversold', 'value'];
    const midBullKeywords = ['rally', 'breakout', 'momentum', 'fomo'];
    const lateBullKeywords = ['euphoria', 'mania', 'bubble', 'parabolic'];
    const transitionKeywords = ['correction', 'pullback', 'reversal', 'uncertainty'];

    let earlyScore = 0;
    let midScore = 0;
    let lateScore = 0;
    let transitionScore = 0;

    newsItems.forEach(item => {
      const text = (item.title + ' ' + item.content).toLowerCase();

      earlyBullKeywords.forEach(keyword => {
        if (text.includes(keyword)) earlyScore++;
      });

      midBullKeywords.forEach(keyword => {
        if (text.includes(keyword)) midScore++;
      });

      lateBullKeywords.forEach(keyword => {
        if (text.includes(keyword)) lateScore++;
      });

      transitionKeywords.forEach(keyword => {
        if (text.includes(keyword)) transitionScore++;
      });
    });

    // const scores = { earlyScore, midScore, lateScore, transitionScore };
    const maxScore = Math.max(earlyScore, midScore, lateScore, transitionScore);

    if (maxScore === earlyScore) return 'EARLY';
    if (maxScore === midScore) return 'MID';
    if (maxScore === lateScore) return 'LATE';
    return 'TRANSITION';
  }

  private getDefaultCorrelationResult() {
    return {
      crossSectorCorrelations: [],
      geopoliticalRipples: [],
      macroEconomicAlignments: {
        inflationCorrelation: 0.5,
        stockMarketCorrelation: 0.5,
        bondYieldCorrelation: 0.5,
        commodityCorrelation: 0.5,
        currencyCorrelation: 0.5
      },
      eventCascadeAnalysis: {
        cascadeProbability: 0.3,
        potentialTriggers: [],
        amplificationFactors: [],
        systemicRisk: 'MEDIUM' as const
      },
      temporalCorrelations: {
        pastEventMatches: [],
        seasonalPatterns: ['Analysis unavailable'],
        cyclePosition: 'TRANSITION' as const
      }
    };
  }
}