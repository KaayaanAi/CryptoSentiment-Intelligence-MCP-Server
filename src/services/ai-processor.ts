import axios from 'axios';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { AIProvider } from '../types/index.js';

export class AIProcessor implements AIProvider {
  name: string = 'OpenRouter';
  private baseUrl: string;
  private apiKey: string;
  private defaultModel: string;
  private backupModel: string;
  private timeout: number;
  private maxTokens: number;

  constructor() {
    this.baseUrl = config.aiProvider.openRouterBaseUrl;
    this.apiKey = config.aiProvider.openRouterApiKey;
    this.defaultModel = config.aiProvider.defaultModel;
    this.backupModel = config.aiProvider.backupModel;
    this.timeout = config.aiProvider.timeout;
    this.maxTokens = config.aiProvider.maxTokens;
  }

  async analyze(prompt: string, model?: string): Promise<string> {
    const startTime = Date.now();
    const selectedModel = model || this.defaultModel;
    
    try {
      logger.debug('Starting AI analysis', {
        model: selectedModel,
        promptLength: prompt.length
      });

      const response = await this.makeOpenRouterRequest(prompt, selectedModel);
      
      logger.info('AI analysis completed', {
        model: selectedModel,
        responseLength: response.length,
        processingTime: Date.now() - startTime
      });

      return response;

    } catch (error) {
      logger.warn('Primary AI model failed, trying backup', {
        primaryModel: selectedModel,
        backupModel: this.backupModel,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Try backup model
      try {
        const response = await this.makeOpenRouterRequest(prompt, this.backupModel);
        
        logger.info('AI analysis completed with backup model', {
          model: this.backupModel,
          responseLength: response.length,
          processingTime: Date.now() - startTime
        });

        return response;
      } catch (backupError) {
        logger.error('Both AI models failed', {
          primaryError: error instanceof Error ? error.message : 'Unknown error',
          backupError: backupError instanceof Error ? backupError.message : 'Unknown error',
          processingTime: Date.now() - startTime
        });

        throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async makeOpenRouterRequest(prompt: string, model: string): Promise<string> {
    const requestBody = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.maxTokens,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    };

    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://crypto-sentiment.kaayaan.ai',
          'X-Title': 'CryptoSentiment Intelligence MCP Server'
        },
        timeout: this.timeout
      }
    );

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from AI provider');
    }

    return response.data.choices[0].message.content;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const testPrompt = 'Hello, please respond with "OK" if you are working correctly.';
      const response = await this.makeOpenRouterRequest(testPrompt, this.defaultModel);
      return response.toLowerCase().includes('ok');
    } catch {
      return false;
    }
  }

  async getRemainingQuota(): Promise<number> {
    try {
      // OpenRouter doesn't have a direct quota endpoint
      // Return a reasonable estimate based on free tier limits
      return 100; // Placeholder value
    } catch {
      return 0;
    }
  }

  async getLatency(): Promise<number> {
    const startTime = Date.now();
    try {
      await this.makeOpenRouterRequest('ping', this.defaultModel);
      return Date.now() - startTime;
    } catch {
      return -1;
    }
  }

  getCost(tokens: number): number {
    // Estimate cost based on token usage
    // DeepSeek is very cheap, approximately $0.00014 per 1K tokens
    return (tokens / 1000) * 0.00014;
  }

  async analyzeSentiment(text: string): Promise<{
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    confidence: number;
    reasoning: string;
  }> {
    const prompt = `
Analyze the sentiment of the following cryptocurrency-related text. Focus on market implications and investor sentiment.

Text: "${text}"

Respond with a JSON object containing:
- sentiment: "POSITIVE", "NEGATIVE", or "NEUTRAL"
- confidence: number between 0 and 1
- reasoning: brief explanation of the sentiment analysis

Be precise and focus on financial/market sentiment rather than general sentiment.
`;

    try {
      const response = await this.analyze(prompt);
      const parsed = JSON.parse(response.trim());
      
      return {
        sentiment: parsed.sentiment || 'NEUTRAL',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      logger.warn('Sentiment analysis failed', { error });
      return {
        sentiment: 'NEUTRAL',
        confidence: 0.1,
        reasoning: 'Analysis failed'
      };
    }
  }

  async analyzeImpact(newsTitle: string, newsContent: string): Promise<{
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    timeframe: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
    affectedCoins: string[];
    reasoning: string;
  }> {
    const prompt = `
Analyze the potential market impact of this cryptocurrency news:

Title: "${newsTitle}"
Content: "${newsContent}"

Respond with a JSON object containing:
- impact: "HIGH", "MEDIUM", or "LOW" (market significance)
- direction: "BULLISH", "BEARISH", or "NEUTRAL" (market direction)
- timeframe: "SHORT_TERM", "MEDIUM_TERM", or "LONG_TERM" (impact duration)
- affectedCoins: array of cryptocurrency symbols that might be affected
- reasoning: detailed explanation of the analysis

Focus on actionable market intelligence for cryptocurrency traders and investors.
`;

    try {
      const response = await this.analyze(prompt);
      const parsed = JSON.parse(response.trim());
      
      return {
        impact: parsed.impact || 'MEDIUM',
        direction: parsed.direction || 'NEUTRAL',
        timeframe: parsed.timeframe || 'SHORT_TERM',
        affectedCoins: Array.isArray(parsed.affectedCoins) ? parsed.affectedCoins : [],
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      logger.warn('Impact analysis failed', { error });
      return {
        impact: 'MEDIUM',
        direction: 'NEUTRAL',
        timeframe: 'SHORT_TERM',
        affectedCoins: [],
        reasoning: 'Analysis failed'
      };
    }
  }

  async generateInsights(newsItems: any[], priceData: Record<string, any>): Promise<{
    keyInsights: string[];
    marketOutlook: string;
    recommendations: string[];
  }> {
    const newsText = newsItems.slice(0, 10).map(item => 
      `${item.title}: ${item.content.substring(0, 200)}...`
    ).join('\n\n');

    const priceContext = Object.entries(priceData).map(([symbol, data]) => 
      `${symbol}: $${data.current} (${data.change_24h > 0 ? '+' : ''}${data.change_24h.toFixed(2)}%)`
    ).join(', ');

    const prompt = `
As a cryptocurrency market analyst, analyze the following market data and provide actionable insights:

Recent News:
${newsText}

Current Prices:
${priceContext}

Provide a JSON response with:
- keyInsights: array of 3-5 key market insights
- marketOutlook: overall market outlook paragraph
- recommendations: array of 3-5 actionable recommendations

Focus on practical trading and investment guidance based on the current market sentiment and price action.
`;

    try {
      const response = await this.analyze(prompt);
      const parsed = JSON.parse(response.trim());
      
      return {
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : ['Analysis unavailable'],
        marketOutlook: parsed.marketOutlook || 'Market outlook analysis unavailable',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['No recommendations available']
      };
    } catch (error) {
      logger.warn('Insights generation failed', { error });
      return {
        keyInsights: ['Market analysis temporarily unavailable'],
        marketOutlook: 'Unable to generate market outlook at this time',
        recommendations: ['Please try again later for market recommendations']
      };
    }
  }

  async analyzeTrends(newsItems: any[]): Promise<{
    emergingTrends: string[];
    trendingCoins: string[];
    marketThemes: string[];
  }> {
    const newsText = newsItems.slice(0, 15).map(item => 
      `${item.title}`
    ).join('\n');

    const prompt = `
Analyze these cryptocurrency news headlines to identify trends and themes:

Headlines:
${newsText}

Respond with a JSON object containing:
- emergingTrends: array of emerging market trends identified
- trendingCoins: array of cryptocurrency symbols getting significant attention
- marketThemes: array of overarching market themes and narratives

Focus on identifying patterns and recurring themes in the news that could indicate market direction or investor sentiment.
`;

    try {
      const response = await this.analyze(prompt);
      const parsed = JSON.parse(response.trim());
      
      return {
        emergingTrends: Array.isArray(parsed.emergingTrends) ? parsed.emergingTrends : [],
        trendingCoins: Array.isArray(parsed.trendingCoins) ? parsed.trendingCoins : [],
        marketThemes: Array.isArray(parsed.marketThemes) ? parsed.marketThemes : []
      };
    } catch (error) {
      logger.warn('Trend analysis failed', { error });
      return {
        emergingTrends: [],
        trendingCoins: [],
        marketThemes: []
      };
    }
  }
}

export const aiProcessor = new AIProcessor();