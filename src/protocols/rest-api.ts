import express, { Request, Response } from 'express';
import { logger, createRequestLogger } from '../utils/logger.js';
import { analyzeCryptoSentimentTool } from '../tools/analyze-crypto-sentiment.js';
import { config } from '../config.js';

export class RestApiProtocolHandler {
  private requestLogger: ReturnType<typeof createRequestLogger>;

  constructor() {
    this.requestLogger = createRequestLogger('rest-api');
  }

  setupRoutes(app: express.Application): void {
    // Health and status endpoints
    app.get('/health', (_req: Request, res: Response) => {
      const startTime = Date.now();
      const requestId = `health-${Date.now()}`;

      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          protocols: {
            stdio: config.protocols.stdio,
            http: config.protocols.http,
            websocket: config.protocols.websocket,
            rest: config.protocols.rest
          }
        };

        this.requestLogger(requestId, 'GET /health', Date.now() - startTime);
        res.json(health);
      } catch (error) {
        this.requestLogger(requestId, 'GET /health', Date.now() - startTime, error as Error);
        res.status(500).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.get('/status', (_req: Request, res: Response) => {
      const startTime = Date.now();
      const requestId = `status-${Date.now()}`;

      try {
        const status = {
          server: 'crypto-sentiment-intelligence-mcp-server',
          version: '1.0.0',
          status: 'running',
          protocols: ['stdio', 'http-rest', 'http-mcp', 'websocket'],
          capabilities: ['cryptocurrency-analysis', 'sentiment-analysis', 'market-intelligence'],
          timestamp: new Date().toISOString()
        };

        this.requestLogger(requestId, 'GET /status', Date.now() - startTime);
        res.json(status);
      } catch (error) {
        this.requestLogger(requestId, 'GET /status', Date.now() - startTime, error as Error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Tool endpoints
    app.get('/tools', (_req: Request, res: Response) => {
      const startTime = Date.now();
      const requestId = `get-tools-${Date.now()}`;

      try {
        const tools = [
          {
            name: 'analyze_crypto_sentiment',
            description: 'Advanced AI-driven cryptocurrency sentiment analysis with market intelligence and price context',
            method: 'POST',
            endpoint: '/tools/analyze_crypto_sentiment',
            parameters: {
              query: {
                type: 'string',
                required: true,
                description: 'Search query or "latest" for general market analysis'
              },
              analysis_depth: {
                type: 'string',
                enum: ['quick', 'standard', 'deep'],
                default: 'standard',
                description: 'Analysis depth level'
              },
              max_news_items: {
                type: 'number',
                minimum: 5,
                maximum: 50,
                default: 15,
                description: 'Maximum number of news items to analyze'
              },
              time_range: {
                type: 'string',
                enum: ['1h', '6h', '12h', '24h'],
                default: '6h',
                description: 'Time range for news analysis'
              },
              include_prices: {
                type: 'boolean',
                default: true,
                description: 'Include current price data for mentioned cryptocurrencies'
              },
              focus_coins: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional list of specific cryptocurrencies to focus on'
              }
            }
          }
        ];

        this.requestLogger(requestId, 'GET /tools', Date.now() - startTime);
        res.json({
          tools,
          count: tools.length,
          server: 'crypto-sentiment-intelligence-mcp-server',
          version: '1.0.0'
        });
      } catch (error) {
        this.requestLogger(requestId, 'GET /tools', Date.now() - startTime, error as Error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    app.get('/tools/:toolName/schema', (req: Request, res: Response) => {
      const startTime = Date.now();
      const { toolName } = req.params;
      const requestId = `get-schema-${toolName}-${Date.now()}`;

      try {
        if (toolName === 'analyze_crypto_sentiment') {
          const schema = {
            name: 'analyze_crypto_sentiment',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query or "latest" for general market analysis'
                },
                analysis_depth: {
                  type: 'string',
                  enum: ['quick', 'standard', 'deep'],
                  default: 'standard'
                },
                max_news_items: {
                  type: 'number',
                  minimum: 5,
                  maximum: 50,
                  default: 15
                },
                time_range: {
                  type: 'string',
                  enum: ['1h', '6h', '12h', '24h'],
                  default: '6h'
                },
                include_prices: {
                  type: 'boolean',
                  default: true
                },
                focus_coins: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['query']
            },
            outputSchema: {
              type: 'object',
              properties: {
                overall_sentiment: {
                  type: 'string',
                  enum: ['BULLISH', 'BEARISH', 'NEUTRAL']
                },
                confidence_score: { type: 'number' },
                processing_time_ms: { type: 'number' },
                analysis_timestamp: { type: 'string' },
                market_signals: { type: 'array' },
                behavioral_insights: { type: 'object' },
                risk_assessment: { type: 'object' },
                actionable_recommendations: { type: 'array' }
              }
            }
          };

          this.requestLogger(requestId, `GET /tools/${toolName}/schema`, Date.now() - startTime);
          res.json(schema);
        } else {
          res.status(404).json({
            error: `Tool '${toolName}' not found`,
            available_tools: ['analyze_crypto_sentiment']
          });
        }
      } catch (error) {
        this.requestLogger(requestId, `GET /tools/${toolName}/schema`, Date.now() - startTime, error as Error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Tool execution endpoints
    app.post('/tools/analyze_crypto_sentiment', async (req: Request, res: Response) => {
      const startTime = Date.now();
      const requestId = `analyze-sentiment-${Date.now()}`;

      try {
        logger.info('REST API crypto sentiment analysis started', {
          requestId,
          params: Object.keys(req.body || {})
        });

        const result = await analyzeCryptoSentimentTool.execute(req.body?.arguments || {});

        this.requestLogger(requestId, 'POST /tools/analyze_crypto_sentiment', Date.now() - startTime);
        
        res.json({
          success: true,
          data: result,
          request_id: requestId,
          processing_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        this.requestLogger(requestId, 'POST /tools/analyze_crypto_sentiment', Date.now() - startTime, error as Error);
        
        logger.error('REST API crypto sentiment analysis failed', {
          requestId,
          error: errorMessage,
          duration: Date.now() - startTime
        });

        res.status(400).json({
          success: false,
          error: errorMessage,
          request_id: requestId,
          processing_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Generic tool execution endpoint
    app.post('/tools/:toolName', async (req: Request, res: Response) => {
      const startTime = Date.now();
      const { toolName } = req.params;
      const requestId = `tool-${toolName}-${Date.now()}`;

      try {
        switch (toolName) {
          case 'analyze_crypto_sentiment':
            // Redirect to specific endpoint
            return res.redirect(307, '/tools/analyze_crypto_sentiment');

          default:
            res.status(404).json({
              success: false,
              error: `Tool '${toolName}' not found`,
              available_tools: ['analyze_crypto_sentiment'],
              request_id: requestId
            });
        }
      } catch (error) {
        this.requestLogger(requestId, `POST /tools/${toolName}`, Date.now() - startTime, error as Error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          request_id: requestId
        });
      }
    });

    // API documentation endpoint
    app.get('/docs', (req: Request, res: Response) => {
      const startTime = Date.now();
      const requestId = `docs-${Date.now()}`;

      try {
        const docs = {
          title: 'CryptoSentiment Intelligence MCP Server API',
          version: '1.0.0',
          description: 'Advanced cryptocurrency sentiment analysis with multi-protocol support',
          protocols: {
            stdio: 'Standard MCP protocol for Claude Desktop integration',
            'http-mcp': 'JSON-RPC 2.0 over HTTP for n8n and MCP clients',
            'http-rest': 'RESTful API for general HTTP clients',
            websocket: 'WebSocket MCP protocol for real-time streaming'
          },
          endpoints: {
            health: {
              method: 'GET',
              path: '/health',
              description: 'Server health check'
            },
            tools: {
              method: 'GET', 
              path: '/tools',
              description: 'List available tools'
            },
            analyze_sentiment: {
              method: 'POST',
              path: '/tools/analyze_crypto_sentiment',
              description: 'Perform cryptocurrency sentiment analysis',
              parameters: {
                query: 'Search query or "latest"',
                analysis_depth: 'quick|standard|deep',
                max_news_items: '5-50',
                time_range: '1h|6h|12h|24h',
                include_prices: 'boolean',
                focus_coins: 'array of coin symbols'
              }
            }
          },
          examples: {
            curl: `curl -X POST ${req.protocol}://${req.get('host')}/tools/analyze_crypto_sentiment \\
  -H "Content-Type: application/json" \\
  -d '{"query": "Bitcoin ETF news", "analysis_depth": "standard"}'`
          }
        };

        this.requestLogger(requestId, 'GET /docs', Date.now() - startTime);
        res.json(docs);
      } catch (error) {
        this.requestLogger(requestId, 'GET /docs', Date.now() - startTime, error as Error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Metrics endpoint (basic)
    app.get('/metrics', (_req: Request, res: Response) => {
      const startTime = Date.now();
      const requestId = `metrics-${Date.now()}`;

      try {
        const metrics = {
          uptime_seconds: process.uptime(),
          memory_usage: process.memoryUsage(),
          cpu_usage: process.cpuUsage(),
          timestamp: new Date().toISOString(),
          version: '1.0.0'
        };

        this.requestLogger(requestId, 'GET /metrics', Date.now() - startTime);
        res.json(metrics);
      } catch (error) {
        this.requestLogger(requestId, 'GET /metrics', Date.now() - startTime, error as Error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }
}