#!/usr/bin/env node

// Web API polyfills for Node.js compatibility

if (typeof globalThis.File === 'undefined') {
  (globalThis as any).File = class File extends Blob {
    public readonly name: string;
    public readonly lastModified: number;
    public readonly webkitRelativePath: string = '';

    constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
      super(bits, options);
      this.name = name;
      this.lastModified = options?.lastModified || Date.now();
    }
  };
}

if (typeof globalThis.FormData === 'undefined') {
  (globalThis as any).FormData = class FormData {
    private data = new Map<string, string | File>();
    append(name: string, value: string | File) { this.data.set(name, value); }
    get(name: string) { return this.data.get(name); }
    has(name: string) { return this.data.has(name); }
    delete(name: string) { this.data.delete(name); }
    forEach(callback: (value: string | File, key: string) => void) {
      this.data.forEach(callback);
    }
  };
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { validateConfig } from './config.js';
import { logger, createRequestLogger } from './utils/logger.js';
import { cacheManager } from './utils/cache.js';
import { analyzeCryptoSentimentTool } from './tools/analyze-crypto-sentiment.js';

class CryptoSentimentMCPServer {
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

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    // Register available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const startTime = Date.now();
      const requestId = `list-tools-${Date.now()}`;
      
      try {
        const tools = [
          {
            name: "analyze_crypto_sentiment",
            description: "Advanced AI-driven cryptocurrency sentiment analysis with market intelligence and price context. Analyzes news, social media, and market data to provide comprehensive insights with actionable recommendations.",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query or 'latest' for general market analysis. Examples: 'Bitcoin ETF news', 'Ethereum price prediction', 'latest crypto sentiment'"
                },
                analysis_depth: {
                  type: "string",
                  enum: ["quick", "standard", "deep"],
                  default: "standard",
                  description: "Analysis depth: quick (2-3 sources), standard (10-15 sources), deep (20+ sources with advanced correlation)"
                },
                max_news_items: {
                  type: "number",
                  minimum: 5,
                  maximum: 50,
                  default: 15,
                  description: "Maximum number of news items to analyze"
                },
                time_range: {
                  type: "string",
                  enum: ["1h", "6h", "12h", "24h"],
                  default: "6h",
                  description: "Time range for news analysis"
                },
                include_prices: {
                  type: "boolean",
                  default: true,
                  description: "Include current price data for mentioned cryptocurrencies"
                },
                focus_coins: {
                  type: "array",
                  items: {
                    type: "string"
                  },
                  description: "Optional list of specific cryptocurrencies to focus on (e.g., ['BTC', 'ETH', 'SOL'])"
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

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      const { name, arguments: args } = request.params;
      const requestId = `call-tool-${name}-${Date.now()}`;
      
      logger.info('Tool execution started', { 
        tool: name, 
        requestId, 
        args: Object.keys(args || {}) 
      });

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
        
        logger.error('Tool execution failed', {
          tool: name,
          requestId,
          error: errorMessage,
          duration: Date.now() - startTime
        });

        return {
          content: [
            {
              type: "text",
              text: `❌ **Analysis Error**\n\n**Error:** ${errorMessage}\n\n**Tool:** ${name}\n**Request ID:** ${requestId}\n\nPlease try again or contact support if the issue persists.`
            }
          ],
          isError: true
        };
      }
    });
  }

  async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();
      logger.info('Configuration validated successfully');

      // Connect to cache
      await cacheManager.connect();
      logger.info('Cache manager connected');

      // Start STDIO transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('🚀 CryptoSentiment Intelligence MCP Server started', {
        protocols: { stdio: true },
        version: '1.0.0',
        pid: process.pid
      });

      // Log to stderr so it doesn't interfere with MCP protocol
      console.error('✅ CryptoSentiment Intelligence MCP Server running on STDIO');
      
    } catch (error) {
      logger.error('Failed to start MCP server', { error });
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down MCP server...');
    
    try {
      await cacheManager.disconnect();
      logger.info('Cache manager disconnected');
      
      // Server will be disconnected automatically by the transport
      logger.info('MCP server shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', { error });
    }
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
async function main() {
  const server = new CryptoSentimentMCPServer();
  await server.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Server startup failed', { error });
    process.exit(1);
  });
}