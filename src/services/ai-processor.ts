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

  private extractAndValidateJSON(response: string): string {
    try {
      // Remove any markdown code blocks
      let cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
      
      // Remove any text before the first { and after the last }
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
        throw new Error('No valid JSON object found in response');
      }
      
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      
      // Validate that it's parseable JSON
      JSON.parse(cleaned);
      
      return cleaned;
    } catch (error) {
      logger.warn('Failed to extract valid JSON from AI response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        responsePreview: response.substring(0, 200)
      });
      throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async analyzeSentiment(text: string): Promise<{
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    confidence: number;
    reasoning: string;
  }> {
    const prompt = `
You are a cryptocurrency sentiment analysis AI. Analyze the sentiment of the following text focusing on market implications and investor sentiment.

Text: "${text}"

CRITICAL: You MUST respond with ONLY a valid JSON object. No explanations, no markdown, no additional text. Just pure JSON.

Required JSON format:
{
  "sentiment": "POSITIVE|NEGATIVE|NEUTRAL",
  "confidence": 0.85,
  "reasoning": "Brief explanation of the sentiment analysis"
}

Rules:
- sentiment must be exactly one of: POSITIVE, NEGATIVE, NEUTRAL
- confidence must be a number between 0.0 and 1.0
- reasoning must be a concise explanation (max 100 characters)
- Focus on financial/market sentiment, not general sentiment
- Response must be valid JSON only

JSON response:`;

    try {
      const response = await this.analyze(prompt);
      const cleanResponse = this.extractAndValidateJSON(response);
      const parsed = JSON.parse(cleanResponse);
      
      // Validate required fields and types
      if (!['POSITIVE', 'NEGATIVE', 'NEUTRAL'].includes(parsed.sentiment)) {
        throw new Error('Invalid sentiment value');
      }
      
      return {
        sentiment: parsed.sentiment,
        confidence: Math.max(0, Math.min(1, typeof parsed.confidence === 'number' ? parsed.confidence : 0.5)),
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'No reasoning provided'
      };
    } catch (error) {
      logger.warn('Sentiment analysis failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        textLength: text.length 
      });
      return {
        sentiment: 'NEUTRAL',
        confidence: 0.3,
        reasoning: 'Unable to analyze sentiment - please check data quality'
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
You are a cryptocurrency market impact analysis AI. Analyze the potential market impact of this news for traders and investors.

Title: "${newsTitle}"
Content: "${newsContent}"

CRITICAL: You MUST respond with ONLY a valid JSON object. No explanations, no markdown, no additional text. Just pure JSON.

Required JSON format:
{
  "impact": "HIGH|MEDIUM|LOW",
  "direction": "BULLISH|BEARISH|NEUTRAL",
  "timeframe": "SHORT_TERM|MEDIUM_TERM|LONG_TERM",
  "affectedCoins": ["BTC", "ETH"],
  "reasoning": "Detailed explanation of the analysis"
}

Rules:
- impact must be exactly one of: HIGH, MEDIUM, LOW
- direction must be exactly one of: BULLISH, BEARISH, NEUTRAL
- timeframe must be exactly one of: SHORT_TERM, MEDIUM_TERM, LONG_TERM
- affectedCoins must be an array of cryptocurrency symbols (e.g., ["BTC", "ETH", "SOL"])
- reasoning must be a detailed explanation (max 200 characters)
- Focus on actionable market intelligence

JSON response:`;

    try {
      const response = await this.analyze(prompt);
      const cleanResponse = this.extractAndValidateJSON(response);
      const parsed = JSON.parse(cleanResponse);
      
      // Validate required fields and types
      if (!['HIGH', 'MEDIUM', 'LOW'].includes(parsed.impact)) {
        throw new Error('Invalid impact value');
      }
      if (!['BULLISH', 'BEARISH', 'NEUTRAL'].includes(parsed.direction)) {
        throw new Error('Invalid direction value');
      }
      if (!['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'].includes(parsed.timeframe)) {
        throw new Error('Invalid timeframe value');
      }
      
      return {
        impact: parsed.impact,
        direction: parsed.direction,
        timeframe: parsed.timeframe,
        affectedCoins: Array.isArray(parsed.affectedCoins) ? parsed.affectedCoins : [],
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'No reasoning provided'
      };
    } catch (error) {
      logger.warn('Impact analysis failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        titleLength: newsTitle.length,
        contentLength: newsContent.length 
      });
      return {
        impact: 'MEDIUM',
        direction: 'NEUTRAL',
        timeframe: 'SHORT_TERM',
        affectedCoins: [],
        reasoning: 'Unable to analyze impact - please check news data quality'
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
You are a cryptocurrency market analyst AI. Analyze the market data and provide actionable insights for traders and investors.

Recent News:
${newsText}

Current Prices:
${priceContext}

CRITICAL: You MUST respond with ONLY a valid JSON object. No explanations, no markdown, no additional text. Just pure JSON.

Required JSON format:
{
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "marketOutlook": "Overall market outlook paragraph",
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}

Rules:
- keyInsights must be an array of 3-5 key market insights (each max 150 characters)
- marketOutlook must be a comprehensive paragraph (max 300 characters)
- recommendations must be an array of 3-5 actionable recommendations (each max 150 characters)
- Focus on practical trading and investment guidance
- Base analysis on current market sentiment and price action

JSON response:`;

    try {
      const response = await this.analyze(prompt);
      const cleanResponse = this.extractAndValidateJSON(response);
      const parsed = JSON.parse(cleanResponse);
      
      return {
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : ['Market analysis processing - please retry'],
        marketOutlook: typeof parsed.marketOutlook === 'string' ? parsed.marketOutlook : 'Market outlook analysis in progress - please retry',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Recommendations being generated - please retry']
      };
    } catch (error) {
      logger.warn('Insights generation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        newsCount: newsItems.length,
        priceDataCount: Object.keys(priceData).length
      });
      return {
        keyInsights: ['Market data processing temporarily unavailable - check data sources'],
        marketOutlook: 'Unable to generate market outlook - verify news and price data availability',
        recommendations: ['Analysis engine temporarily offline - please retry in a few minutes']
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
You are a cryptocurrency trend analysis AI. Analyze news headlines to identify emerging trends, patterns and market themes.

Headlines:
${newsText}

CRITICAL: You MUST respond with ONLY a valid JSON object. No explanations, no markdown, no additional text. Just pure JSON.

Required JSON format:
{
  "emergingTrends": ["Trend 1", "Trend 2", "Trend 3"],
  "trendingCoins": ["BTC", "ETH", "SOL"],
  "marketThemes": ["Theme 1", "Theme 2", "Theme 3"]
}

Rules:
- emergingTrends must be an array of emerging market trends (each max 100 characters)
- trendingCoins must be an array of cryptocurrency symbols getting attention (use standard symbols like BTC, ETH)
- marketThemes must be an array of overarching market themes and narratives (each max 120 characters)
- Focus on patterns and recurring themes that indicate market direction
- Identify investor sentiment indicators from the headlines

JSON response:`;

    try {
      const response = await this.analyze(prompt);
      const cleanResponse = this.extractAndValidateJSON(response);
      const parsed = JSON.parse(cleanResponse);
      
      return {
        emergingTrends: Array.isArray(parsed.emergingTrends) ? parsed.emergingTrends : ['Trend analysis in progress'],
        trendingCoins: Array.isArray(parsed.trendingCoins) ? parsed.trendingCoins : ['BTC', 'ETH'],
        marketThemes: Array.isArray(parsed.marketThemes) ? parsed.marketThemes : ['Market analysis pending']
      };
    } catch (error) {
      logger.warn('Trend analysis failed', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        headlineCount: newsItems.length
      });
      return {
        emergingTrends: ['Trend analysis temporarily unavailable'],
        trendingCoins: ['BTC', 'ETH'],
        marketThemes: ['Market theme analysis offline - please retry']
      };
    }
  }
}

export const aiProcessor = new AIProcessor();