import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logger, createRequestLogger } from '../utils/logger.js';
import { analyzeCryptoSentimentTool } from '../tools/analyze-crypto-sentiment.js';

export class StdioProtocolHandler {
  private server: Server;
  private requestLogger: ReturnType<typeof createRequestLogger>;

  constructor() {
    this.requestLogger = createRequestLogger('stdio');
    
    this.server = new Server(
      {
        name: "crypto-sentiment-intelligence-mcp-server",
        version: "1.0.0"
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const startTime = Date.now();
      const requestId = `stdio-list-tools-${Date.now()}`;
      
      try {
        const tools = [
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
        ];

        this.requestLogger(requestId, 'tools/list', Date.now() - startTime);
        return { tools };
      } catch (error) {
        this.requestLogger(requestId, 'tools/list', Date.now() - startTime, error as Error);
        throw error;
      }
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      const { name, arguments: args } = request.params;
      const requestId = `stdio-call-${name}-${Date.now()}`;
      
      try {
        switch (name) {
          case "analyze_crypto_sentiment":
            const result = await analyzeCryptoSentimentTool.execute(args || {});
            
            this.requestLogger(requestId, `tools/call/${name}`, Date.now() - startTime);
            
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        this.requestLogger(requestId, `tools/call/${name}`, Date.now() - startTime, error as Error);
        
        return {
          content: [
            {
              type: "text",
              text: `❌ **Analysis Error**\n\n**Error:** ${errorMessage}\n\n**Tool:** ${name}\n**Request ID:** ${requestId}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logger.info('STDIO MCP protocol handler started');
    console.error('✅ STDIO MCP Server running');
  }

  getServer(): Server {
    return this.server;
  }
}