import { logger } from '../utils/logger.js';
import { NewsItem } from '../types/index.js';
import * as cheerio from 'cheerio';
import axios from 'axios';

export class MultiModalProcessor {
  async analyze(newsItems: NewsItem[], options: {
    depth: 'quick' | 'standard' | 'deep';
    includeImages?: boolean;
  }): Promise<{
    textAnalysis: {
      keyPhrases: string[];
      emotionalTone: 'excited' | 'cautious' | 'fearful' | 'optimistic' | 'neutral';
      urgencyLevel: 'low' | 'medium' | 'high';
      technicalComplexity: 'simple' | 'moderate' | 'complex';
    };
    imageAnalysis: {
      chartsDetected: number;
      infographicsFound: number;
      visualSentiment: 'positive' | 'negative' | 'neutral';
      technicalPatterns: string[];
    };
    multiModalInsights: {
      contentQuality: number;
      credibilityScore: number;
      virality: number;
      comprehensiveness: number;
    };
    contentTypes: string[];
    mediaRichness: number;
  }> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting multi-modal processing', {
        newsCount: newsItems.length,
        depth: options.depth,
        includeImages: options.includeImages
      });

      // Process different modalities in parallel
      const [textAnalysis, imageAnalysis, contentAnalysis] = await Promise.all([
        this.analyzeTextContent(newsItems, options),
        options.includeImages ? this.analyzeImageContent(newsItems, options) : this.getEmptyImageAnalysis(),
        this.analyzeContentStructure(newsItems, options)
      ]);

      const multiModalInsights = this.synthesizeMultiModalInsights(
        textAnalysis,
        imageAnalysis,
        contentAnalysis
      );

      const contentTypes = this.identifyContentTypes(newsItems);
      const mediaRichness = this.calculateMediaRichness(newsItems, imageAnalysis);

      logger.info('Multi-modal processing completed', {
        processingTime: Date.now() - startTime,
        textKeyPhrases: textAnalysis.keyPhrases.length,
        chartsDetected: imageAnalysis.chartsDetected,
        contentQuality: multiModalInsights.contentQuality
      });

      return {
        textAnalysis,
        imageAnalysis,
        multiModalInsights,
        contentTypes,
        mediaRichness
      };

    } catch (error) {
      logger.error('Multi-modal processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      });

      return {
        textAnalysis: {
          keyPhrases: [],
          emotionalTone: 'neutral',
          urgencyLevel: 'low',
          technicalComplexity: 'simple'
        },
        imageAnalysis: this.getEmptyImageAnalysis(),
        multiModalInsights: {
          contentQuality: 0.5,
          credibilityScore: 0.5,
          virality: 0.5,
          comprehensiveness: 0.5
        },
        contentTypes: ['text'],
        mediaRichness: 0.1
      };
    }
  }

  private async analyzeTextContent(newsItems: NewsItem[], _options: any): Promise<{
    keyPhrases: string[];
    emotionalTone: 'excited' | 'cautious' | 'fearful' | 'optimistic' | 'neutral';
    urgencyLevel: 'low' | 'medium' | 'high';
    technicalComplexity: 'simple' | 'moderate' | 'complex';
  }> {
    const allText = newsItems.map(item => item.title + ' ' + item.content).join(' ');
    
    // Extract key phrases using frequency analysis and crypto-specific terms
    const keyPhrases = this.extractKeyPhrases(allText);
    
    // Analyze emotional tone
    const emotionalTone = this.analyzeEmotionalTone(allText);
    
    // Determine urgency level
    const urgencyLevel = this.determineUrgencyLevel(newsItems);
    
    // Assess technical complexity
    const technicalComplexity = this.assessTechnicalComplexity(allText);
    
    return {
      keyPhrases,
      emotionalTone,
      urgencyLevel,
      technicalComplexity
    };
  }

  private extractKeyPhrases(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Count word frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    // Crypto-specific important terms (boost their scores)
    const cryptoTerms = [
      'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft', 'mining',
      'wallet', 'exchange', 'trading', 'hodl', 'altcoin', 'stablecoin',
      'smart', 'contract', 'protocol', 'yield', 'staking', 'governance'
    ];
    
    cryptoTerms.forEach(term => {
      if (wordCount.has(term)) {
        wordCount.set(term, (wordCount.get(term) || 0) * 2);
      }
    });
    
    // Get top phrases
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    // Also extract bigrams (two-word phrases)
    const bigrams = this.extractBigrams(text);
    
    return [...sortedWords.slice(0, 7), ...bigrams.slice(0, 3)];
  }

  private extractBigrams(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    const bigramCount = new Map<string, number>();
    
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      bigramCount.set(bigram, (bigramCount.get(bigram) || 0) + 1);
    }
    
    return Array.from(bigramCount.entries())
      .filter(([_bigram, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([bigram]) => bigram);
  }

  private analyzeEmotionalTone(text: string): 'excited' | 'cautious' | 'fearful' | 'optimistic' | 'neutral' {
    const lowerText = text.toLowerCase();
    
    const excitedWords = ['surge', 'moon', 'rocket', 'explode', 'massive', 'incredible', '🚀', 'pump'];
    const fearfulWords = ['crash', 'dump', 'panic', 'fear', 'worried', 'concerned', 'risk', 'danger'];
    const cautiousWords = ['careful', 'caution', 'warning', 'uncertain', 'volatile', 'risky', 'consider'];
    const optimisticWords = ['bullish', 'positive', 'growth', 'opportunity', 'potential', 'promising'];
    
    let excitedScore = 0;
    let fearfulScore = 0;
    let cautiousScore = 0;
    let optimisticScore = 0;
    
    excitedWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      excitedScore += matches;
    });
    
    fearfulWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      fearfulScore += matches;
    });
    
    cautiousWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      cautiousScore += matches;
    });
    
    optimisticWords.forEach(word => {
      const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
      optimisticScore += matches;
    });
    
    // const scores = { excitedScore, fearfulScore, cautiousScore, optimisticScore };
    const maxScore = Math.max(excitedScore, fearfulScore, cautiousScore, optimisticScore);
    
    if (maxScore === 0) return 'neutral';
    if (maxScore === excitedScore) return 'excited';
    if (maxScore === fearfulScore) return 'fearful';
    if (maxScore === cautiousScore) return 'cautious';
    if (maxScore === optimisticScore) return 'optimistic';
    
    return 'neutral';
  }

  private determineUrgencyLevel(newsItems: NewsItem[]): 'low' | 'medium' | 'high' {
    const urgentWords = [
      'breaking', 'urgent', 'alert', 'now', 'immediately', 'crisis',
      'emergency', 'halt', 'suspend', 'crash', 'surge'
    ];
    
    let urgencyScore = 0;
    
    newsItems.forEach(item => {
      const text = (item.title + ' ' + item.content).toLowerCase();
      const importance = item.importance_score || 0.5;
      
      urgentWords.forEach(word => {
        if (text.includes(word)) {
          urgencyScore += importance;
        }
      });
    });
    
    const avgUrgency = urgencyScore / newsItems.length;
    
    if (avgUrgency > 0.7) return 'high';
    if (avgUrgency > 0.3) return 'medium';
    return 'low';
  }

  private assessTechnicalComplexity(text: string): 'simple' | 'moderate' | 'complex' {
    const technicalTerms = [
      'algorithm', 'consensus', 'cryptography', 'hash', 'merkle',
      'smart contract', 'dapp', 'layer 2', 'rollup', 'sharding',
      'validator', 'slashing', 'governance', 'tokenomics', 'liquidity'
    ];
    
    const complexTerms = [
      'zero knowledge', 'zkp', 'mev', 'arbitrage', 'impermanent loss',
      'yield farming', 'flash loan', 'composability', 'interoperability'
    ];
    
    let technicalCount = 0;
    let complexCount = 0;
    
    const lowerText = text.toLowerCase();
    
    technicalTerms.forEach(term => {
      if (lowerText.includes(term)) technicalCount++;
    });
    
    complexTerms.forEach(term => {
      if (lowerText.includes(term)) complexCount++;
    });
    
    if (complexCount > 2) return 'complex';
    if (technicalCount > 5) return 'moderate';
    return 'simple';
  }

  private async analyzeImageContent(newsItems: NewsItem[], _options: any): Promise<{
    chartsDetected: number;
    infographicsFound: number;
    visualSentiment: 'positive' | 'negative' | 'neutral';
    technicalPatterns: string[];
  }> {
    let chartsDetected = 0;
    let infographicsFound = 0;
    const technicalPatterns: string[] = [];
    
    // This is a simplified image analysis - in production, you'd use computer vision APIs
    for (const item of newsItems) {
      try {
        // Try to fetch the article page and look for images
        const response = await axios.get(item.url, { timeout: 5000 });
        const $ = cheerio.load(response.data);
        
        const images = $('img');
        
        images.each((_i, img) => {
          const src = $(img).attr('src') || '';
          const alt = $(img).attr('alt') || '';
          
          // Simple pattern matching for chart detection
          if (src.includes('chart') || alt.includes('chart') || 
              src.includes('graph') || alt.includes('graph')) {
            chartsDetected++;
          }
          
          if (src.includes('infographic') || alt.includes('infographic')) {
            infographicsFound++;
          }
          
          // Look for technical analysis patterns in alt text
          if (alt.includes('support') || alt.includes('resistance')) {
            technicalPatterns.push('Support/Resistance levels');
          }
          
          if (alt.includes('breakout') || alt.includes('pattern')) {
            technicalPatterns.push('Technical breakout pattern');
          }
        });
        
      } catch (error) {
        // Ignore individual fetch failures
        continue;
      }
    }
    
    // Determine visual sentiment based on patterns found
    let visualSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    
    if (technicalPatterns.some(p => p.includes('breakout'))) {
      visualSentiment = 'positive';
    } else if (technicalPatterns.some(p => p.includes('support'))) {
      visualSentiment = 'negative';
    }
    
    return {
      chartsDetected,
      infographicsFound,
      visualSentiment,
      technicalPatterns: [...new Set(technicalPatterns)] // Remove duplicates
    };
  }

  private getEmptyImageAnalysis() {
    return {
      chartsDetected: 0,
      infographicsFound: 0,
      visualSentiment: 'neutral' as const,
      technicalPatterns: []
    };
  }

  private async analyzeContentStructure(newsItems: NewsItem[], _options: any): Promise<{
    avgWordCount: number;
    hasMultimedia: boolean;
    sourceCredibility: number;
    contentDepth: number;
  }> {
    let totalWords = 0;
    let hasMultimedia = false;
    let credibilityScore = 0;
    let totalDepthScore = 0;
    
    for (const item of newsItems) {
      // Count words
      const wordCount = (item.content || '').split(/\s+/).length;
      totalWords += wordCount;
      
      // Check for multimedia indicators
      if (item.url.includes('video') || item.content.includes('video') ||
          item.content.includes('image') || item.content.includes('chart')) {
        hasMultimedia = true;
      }
      
      // Assess source credibility (simple heuristic)
      const credibleSources = ['coindesk', 'cointelegraph', 'bloomberg', 'reuters', 'coinbase'];
      if (credibleSources.some(source => item.source.toLowerCase().includes(source))) {
        credibilityScore += 1;
      }
      
      // Assess content depth
      let depthScore = 0;
      if (wordCount > 500) depthScore += 0.3;
      if (item.content.includes('analysis') || item.content.includes('report')) depthScore += 0.2;
      if (item.content.includes('data') || item.content.includes('research')) depthScore += 0.2;
      if (item.content.includes('expert') || item.content.includes('analyst')) depthScore += 0.3;
      
      totalDepthScore += Math.min(depthScore, 1.0);
    }
    
    return {
      avgWordCount: newsItems.length > 0 ? Math.round(totalWords / newsItems.length) : 0,
      hasMultimedia,
      sourceCredibility: newsItems.length > 0 ? credibilityScore / newsItems.length : 0,
      contentDepth: newsItems.length > 0 ? totalDepthScore / newsItems.length : 0
    };
  }

  private synthesizeMultiModalInsights(
    textAnalysis: any,
    imageAnalysis: any,
    contentAnalysis: any
  ): {
    contentQuality: number;
    credibilityScore: number;
    virality: number;
    comprehensiveness: number;
  } {
    // Content quality based on depth and structure
    const contentQuality = (
      contentAnalysis.contentDepth * 0.4 +
      (contentAnalysis.avgWordCount > 200 ? 0.3 : 0.1) +
      (textAnalysis.technicalComplexity === 'complex' ? 0.3 : 0.2)
    );
    
    // Credibility from source quality and content structure
    const credibilityScore = (
      contentAnalysis.sourceCredibility * 0.6 +
      contentAnalysis.contentDepth * 0.4
    );
    
    // Virality based on emotional tone and urgency
    let viralityScore = 0.3; // Base score
    if (textAnalysis.emotionalTone === 'excited') viralityScore += 0.4;
    if (textAnalysis.urgencyLevel === 'high') viralityScore += 0.3;
    
    // Comprehensiveness based on multiple factors
    const comprehensiveness = (
      (textAnalysis.keyPhrases.length > 5 ? 0.3 : 0.1) +
      (imageAnalysis.chartsDetected > 0 ? 0.2 : 0) +
      (contentAnalysis.hasMultimedia ? 0.2 : 0) +
      contentAnalysis.contentDepth * 0.3
    );
    
    return {
      contentQuality: Math.min(contentQuality, 1.0),
      credibilityScore: Math.min(credibilityScore, 1.0),
      virality: Math.min(viralityScore, 1.0),
      comprehensiveness: Math.min(comprehensiveness, 1.0)
    };
  }

  private identifyContentTypes(newsItems: NewsItem[]): string[] {
    const types = new Set<string>();
    
    newsItems.forEach(item => {
      const text = (item.title + ' ' + item.content).toLowerCase();
      
      if (text.includes('analysis') || text.includes('report')) {
        types.add('analysis');
      }
      
      if (text.includes('news') || text.includes('update')) {
        types.add('news');
      }
      
      if (text.includes('opinion') || text.includes('editorial')) {
        types.add('opinion');
      }
      
      if (text.includes('interview') || text.includes('quote')) {
        types.add('interview');
      }
      
      if (text.includes('data') || text.includes('metric')) {
        types.add('data');
      }
    });
    
    return Array.from(types);
  }

  private calculateMediaRichness(newsItems: NewsItem[], imageAnalysis: any): number {
    let richness = 0.2; // Base text richness
    
    // Add points for visual content
    if (imageAnalysis.chartsDetected > 0) richness += 0.3;
    if (imageAnalysis.infographicsFound > 0) richness += 0.2;
    
    // Add points for multimedia indicators
    const hasVideo = newsItems.some(item => 
      item.content.includes('video') || item.url.includes('video')
    );
    if (hasVideo) richness += 0.3;
    
    return Math.min(richness, 1.0);
  }
}