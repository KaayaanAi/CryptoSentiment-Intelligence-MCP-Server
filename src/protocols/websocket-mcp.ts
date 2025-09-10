import { WebSocket, WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import { logger, createRequestLogger } from '../utils/logger.js';
import { analyzeCryptoSentimentTool } from '../tools/analyze-crypto-sentiment.js';
import { MCPMessage, WebSocketConnection } from '../types/index.js';
import crypto from 'crypto';

export class WebSocketMcpProtocolHandler {
  private wss!: WebSocketServer;
  private connections: Map<string, WebSocketConnection> = new Map();
  private requestLogger: ReturnType<typeof createRequestLogger>;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.requestLogger = createRequestLogger('websocket-mcp');
  }

  initialize(server: HttpServer): void {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/mcp/ws',
      perMessageDeflate: {
        zlibDeflateOptions: {
          level: 3
        }
      }
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error: error.message });
    });

    // Start heartbeat interval
    this.startHeartbeat();

    logger.info('WebSocket MCP protocol handler initialized', {
      path: '/mcp/ws'
    });
  }

  private handleConnection(ws: WebSocket, req: any): void {
    const connectionId = crypto.randomUUID();
    const clientIp = req.socket.remoteAddress;
    
    const connection: WebSocketConnection = {
      id: connectionId,
      ws,
      subscriptions: [],
      lastPing: Date.now(),
      authenticated: false // Simple auth flag for future use
    };

    this.connections.set(connectionId, connection);

    logger.info('WebSocket client connected', {
      connectionId,
      clientIp,
      totalConnections: this.connections.size
    });

    // Set up message handler
    ws.on('message', (data) => {
      this.handleMessage(connectionId, data.toString());
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      this.handleClose(connectionId, code, reason);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket connection error', {
        connectionId,
        error: error.message
      });
    });

    // Handle pong responses
    ws.on('pong', () => {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.lastPing = Date.now();
      }
    });

    // Send welcome message
    this.sendMessage(connectionId, {
      jsonrpc: '2.0',
      id: 'welcome',
      result: {
        type: 'connection_established',
        connectionId,
        server: 'crypto-sentiment-intelligence-mcp-server',
        version: '1.0.0',
        protocols: ['websocket-mcp'],
        capabilities: ['tools', 'streaming', 'real-time-updates']
      }
    });
  }

  private async handleMessage(connectionId: string, data: string): Promise<void> {
    const startTime = Date.now();
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      logger.warn('Message from unknown connection', { connectionId });
      return;
    }

    try {
      const message: MCPMessage = JSON.parse(data);
      const requestId = message.id || `ws-${Date.now()}`;

      logger.debug('WebSocket message received', {
        connectionId,
        method: message.method,
        requestId
      });

      let result: any;

      switch (message.method) {
        case 'initialize':
          result = {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {}, streaming: true },
            serverInfo: {
              name: 'crypto-sentiment-intelligence-mcp-server',
              version: '1.0.0'
            }
          };
          connection.authenticated = true;
          break;

        case 'tools/list':
          result = {
            tools: [
              {
                name: "analyze_crypto_sentiment",
                description: "Advanced AI-driven cryptocurrency sentiment analysis with streaming updates",
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
                    },
                    stream_updates: {
                      type: "boolean",
                      default: false,
                      description: "Enable real-time streaming updates"
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
            throw new Error('Tool name is required');
          }

          switch (name) {
            case 'analyze_crypto_sentiment':
              // Send progress updates for WebSocket clients
              if (args?.stream_updates) {
                this.sendProgress(connectionId, requestId, 'Starting analysis...', 0);
              }

              const analysisResult = await analyzeCryptoSentimentTool.execute(
                args || {}, 
                args?.stream_updates ? (progress, step) => {
                  this.sendProgress(connectionId, requestId, step, progress);
                } : undefined
              );

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
              throw new Error(`Unknown tool: ${name}`);
          }
          break;

        case 'subscribe':
          // Handle subscriptions for real-time updates
          const { topics } = message.params || {};
          if (topics && Array.isArray(topics)) {
            connection.subscriptions = [...new Set([...connection.subscriptions, ...topics])];
            result = {
              subscribed: topics,
              total_subscriptions: connection.subscriptions.length
            };
          } else {
            throw new Error('Topics array is required for subscription');
          }
          break;

        case 'unsubscribe':
          const { topics: unsubTopics } = message.params || {};
          if (unsubTopics && Array.isArray(unsubTopics)) {
            connection.subscriptions = connection.subscriptions.filter(
              sub => !unsubTopics.includes(sub)
            );
            result = {
              unsubscribed: unsubTopics,
              remaining_subscriptions: connection.subscriptions.length
            };
          } else {
            throw new Error('Topics array is required for unsubscription');
          }
          break;

        case 'ping':
          result = { pong: true, timestamp: new Date().toISOString() };
          break;

        default:
          throw new Error(`Unknown method: ${message.method}`);
      }

      // Send successful response
      const response: MCPMessage = {
        jsonrpc: '2.0',
        id: requestId,
        result
      };

      this.sendMessage(connectionId, response);
      this.requestLogger(String(requestId), message.method, Date.now() - startTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      logger.error('WebSocket message processing failed', {
        connectionId,
        error: errorMessage,
        duration: Date.now() - startTime
      });

      this.sendError(connectionId, 'error', -32603, 'Internal error', errorMessage);
      this.requestLogger(connectionId, 'error', Date.now() - startTime, error as Error);
    }
  }

  private sendMessage(connectionId: string, message: MCPMessage): void {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      connection.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to send WebSocket message', {
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private sendError(connectionId: string, id: string | number, code: number, message: string, data?: any): void {
    const errorMessage: MCPMessage = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data
      }
    };

    this.sendMessage(connectionId, errorMessage);
  }

  private sendProgress(connectionId: string, requestId: string | number, step: string, progress: number): void {
    const progressMessage: MCPMessage = {
      jsonrpc: '2.0',
      id: `progress-${requestId}`,
      result: {
        type: 'progress_update',
        request_id: requestId,
        step,
        progress,
        timestamp: new Date().toISOString()
      }
    };

    this.sendMessage(connectionId, progressMessage);
  }

  private handleClose(connectionId: string, code: number, reason: Buffer): void {
    const connection = this.connections.get(connectionId);
    
    logger.info('WebSocket client disconnected', {
      connectionId,
      code,
      reason: reason.toString(),
      duration: connection ? Date.now() - connection.lastPing : 0,
      totalConnections: this.connections.size - 1
    });

    this.connections.delete(connectionId);
  }

  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [connectionId, connection] of this.connections.entries()) {
        if (connection.ws.readyState === WebSocket.OPEN) {
          // Check if connection is stale (no pong received for 60 seconds)
          if (now - connection.lastPing > 60000) {
            logger.warn('Terminating stale WebSocket connection', { connectionId });
            connection.ws.terminate();
            this.connections.delete(connectionId);
          } else {
            // Send ping
            connection.ws.ping();
          }
        } else {
          // Clean up closed connections
          this.connections.delete(connectionId);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  broadcast(message: MCPMessage, topic?: string): void {
    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        // If topic is specified, only send to subscribed connections
        if (!topic || connection.subscriptions.includes(topic)) {
          this.sendMessage(connectionId, message);
        }
      }
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    for (const connection of this.connections.values()) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close(1000, 'Server shutting down');
      }
    }

    this.connections.clear();
    
    if (this.wss) {
      this.wss.close();
    }

    logger.info('WebSocket MCP protocol handler shut down');
  }
}