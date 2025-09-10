import express, { Request, Response } from 'express';
import { logger, createRequestLogger } from '../utils/logger.js';
import { analyzeCryptoSentimentTool } from '../tools/analyze-crypto-sentiment.js';
import { MCPMessage } from '../types/index.js';

export class HttpMcpProtocolHandler {
  private requestLogger: ReturnType<typeof createRequestLogger>;

  constructor() {
    this.requestLogger = createRequestLogger('http-mcp');
  }

  setupRoutes(app: express.Application): void {
    // HTTP MCP endpoint - JSON-RPC 2.0 compliance
    app.post('/mcp', async (req: Request, res: Response) => {
      const startTime = Date.now();
      const message: MCPMessage = req.body;
      const requestId = message.id || `http-mcp-${Date.now()}`;

      try {
        // Validate JSON-RPC 2.0 format
        if (message.jsonrpc !== '2.0') {
          return this.sendError(res, requestId, -32600, 'Invalid Request', 'JSON-RPC version must be 2.0');
        }

        if (!message.method) {
          return this.sendError(res, requestId, -32600, 'Invalid Request', 'Method is required');
        }

        logger.info('HTTP MCP request received', {
          method: message.method,
          requestId,
          params: message.params ? Object.keys(message.params) : []
        });

        let result: any;

        switch (message.method) {
          case 'initialize':
            result = {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: {
                name: 'crypto-sentiment-intelligence-mcp-server',
                version: '1.0.0'
              }
            };
            break;

          case 'tools/list':
            result = {
              tools: [
                {
                  name: "analyze_crypto_sentiment",
                  description: "Advanced AI-driven cryptocurrency sentiment analysis with market intelligence and price context",
                  inputSchema: {
                    type: "object",
                    properties: {
                      query: {
                        type: "string",
                        description: "Search query or 'latest' for general market analysis"
                      },
                      analysis_depth: {
                        type: "string",
                        enum: ["quick", "standard", "deep"],
                        default: "standard"
                      },
                      max_news_items: {
                        type: "number",
                        minimum: 5,
                        maximum: 50,
                        default: 15
                      },
                      time_range: {
                        type: "string",
                        enum: ["1h", "6h", "12h", "24h"],
                        default: "6h"
                      },
                      include_prices: {
                        type: "boolean",
                        default: true
                      },
                      focus_coins: {
                        type: "array",
                        items: { type: "string" }
                      }
                    },
                    required: ["query"]
                  }
                }
              ]
            };
            break;

          case 'tools/call':
            const { name, arguments: args } = message.params || {};
            
            if (!name) {
              return this.sendError(res, requestId, -32602, 'Invalid params', 'Tool name is required');
            }

            switch (name) {
              case 'analyze_crypto_sentiment':
                const analysisResult = await analyzeCryptoSentimentTool.execute(args || {});
                result = {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(analysisResult, null, 2)
                    }
                  ]
                };
                break;

              default:
                return this.sendError(res, requestId, -32601, 'Method not found', `Unknown tool: ${name}`);
            }
            break;

          default:
            return this.sendError(res, requestId, -32601, 'Method not found', `Unknown method: ${message.method}`);
        }

        // Send successful response
        const response: MCPMessage = {
          jsonrpc: '2.0',
          id: requestId,
          result
        };

        this.requestLogger(String(requestId), message.method, Date.now() - startTime);
        
        res.json(response);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        
        this.requestLogger(String(requestId), message.method, Date.now() - startTime, error as Error);
        
        logger.error('HTTP MCP request failed', {
          requestId,
          method: message.method,
          error: errorMessage,
          duration: Date.now() - startTime
        });

        this.sendError(res, requestId, -32603, 'Internal error', errorMessage);
      }
    });

    // Batch request support
    app.post('/mcp/batch', async (req: Request, res: Response) => {
      const startTime = Date.now();
      const requests: MCPMessage[] = Array.isArray(req.body) ? req.body : [req.body];
      const batchId = `batch-${Date.now()}`;

      try {
        logger.info('HTTP MCP batch request received', {
          batchId,
          requestCount: requests.length
        });

        const responses = await Promise.all(
          requests.map(async (message) => {
            try {
              // Process each request individually
              // const _mockReq = { body: message } as Request;
              const mockRes = {
                json: (data: any) => data,
                status: () => mockRes,
                send: (data: any) => data
              } as any;

              // This is a simplified batch processing
              // In production, you'd want to extract the core logic
              return await this.processSingleRequest(message);
            } catch (error) {
              return {
                jsonrpc: '2.0',
                id: message.id,
                error: {
                  code: -32603,
                  message: 'Internal error',
                  data: error instanceof Error ? error.message : 'Unknown error'
                }
              };
            }
          })
        );

        this.requestLogger(batchId, 'batch', Date.now() - startTime);
        res.json(responses);

      } catch (error) {
        this.requestLogger(batchId, 'batch', Date.now() - startTime, error as Error);
        
        this.sendError(res, batchId, -32603, 'Internal error', 
          error instanceof Error ? error.message : 'Batch processing failed');
      }
    });
  }

  private async processSingleRequest(message: MCPMessage): Promise<MCPMessage> {
    // Simplified single request processing for batch support
    // This would be extracted to a common method in production
    const requestId = message.id || Date.now();

    switch (message.method) {
      case 'tools/call':
        const { name, arguments: args } = message.params || {};
        if (name === 'analyze_crypto_sentiment') {
          const result = await analyzeCryptoSentimentTool.execute(args || {});
          return {
            jsonrpc: '2.0',
            id: requestId,
            result: {
              content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
              }]
            }
          };
        }
        break;
    }

    return {
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32601,
        message: 'Method not found'
      }
    };
  }

  private sendError(res: Response, id: string | number, code: number, message: string, data?: any): void {
    const errorResponse: MCPMessage = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data
      }
    };

    res.status(400).json(errorResponse);
  }
}