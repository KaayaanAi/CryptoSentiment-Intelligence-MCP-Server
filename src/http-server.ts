#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config, validateConfig } from './config.js';
import { logger } from './utils/logger.js';
import { cacheManager } from './utils/cache.js';
import { HttpMcpProtocolHandler } from './protocols/http-mcp.js';
import { RestApiProtocolHandler } from './protocols/rest-api.js';
import { WebSocketMcpProtocolHandler } from './protocols/websocket-mcp.js';

class CryptoSentimentHttpServer {
  private app: express.Application;
  private server: any;
  private httpMcpHandler: HttpMcpProtocolHandler;
  private restApiHandler: RestApiProtocolHandler;
  private wsHandler: WebSocketMcpProtocolHandler;

  constructor() {
    this.app = express();
    this.httpMcpHandler = new HttpMcpProtocolHandler();
    this.restApiHandler = new RestApiProtocolHandler();
    this.wsHandler = new WebSocketMcpProtocolHandler();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    const corsOptions = {
      origin: config.security.corsOrigins === '*' ? true : config.security.corsOrigins.split(','),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', config.security.apiKeyHeader],
      credentials: false,
      maxAge: 86400 // 24 hours
    };
    
    this.app.use(cors(corsOptions));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindowMs,
      max: config.security.rateLimitMaxRequests,
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(config.security.rateLimitWindowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(config.security.rateLimitWindowMs / 1000)
        });
      }
    });

    this.app.use(limiter);

    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      strict: true,
      reviver: undefined
    }));
    
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // Request logging
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        logger.info('HTTP request', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration: Date.now() - startTime,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      });
      
      next();
    });

    // API key authentication middleware (optional)
    this.app.use((req, res, next) => {
      // Skip auth for health/status endpoints
      if (req.path === '/health' || req.path === '/status' || req.path === '/docs') {
        return next();
      }

      const apiKey = req.get(config.security.apiKeyHeader);
      
      // If API key is configured in environment, enforce it
      if (process.env.REQUIRED_API_KEY) {
        if (!apiKey || apiKey !== process.env.REQUIRED_API_KEY) {
          logger.warn('Unauthorized API request', {
            ip: req.ip,
            path: req.path,
            providedKey: apiKey ? 'provided' : 'missing'
          });
          
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Valid API key required'
          });
        }
      }

      next();
    });
  }

  private setupRoutes(): void {
    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        server: 'crypto-sentiment-intelligence-mcp-server',
        version: '1.0.0',
        status: 'running',
        protocols: {
          stdio: config.protocols.stdio,
          'http-rest': config.protocols.rest,
          'http-mcp': config.protocols.http,
          'websocket-mcp': config.protocols.websocket
        },
        endpoints: {
          health: '/health',
          status: '/status',
          tools: '/tools',
          docs: '/docs',
          mcp: '/mcp',
          websocket: '/mcp/ws'
        },
        timestamp: new Date().toISOString()
      });
    });

    // Setup protocol handlers
    if (config.protocols.rest) {
      this.restApiHandler.setupRoutes(this.app);
      logger.info('REST API protocol enabled');
    }

    if (config.protocols.http) {
      this.httpMcpHandler.setupRoutes(this.app);
      logger.info('HTTP MCP protocol enabled');
    }

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
        available_endpoints: [
          'GET /',
          'GET /health',
          'GET /status', 
          'GET /tools',
          'GET /docs',
          'POST /mcp',
          'POST /tools/analyze_crypto_sentiment'
        ]
      });
    });

    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      logger.error('Unhandled HTTP error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        request_id: `error-${Date.now()}`
      });
    });
  }

  async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();
      logger.info('HTTP server configuration validated');

      // Connect to cache
      await cacheManager.connect();
      logger.info('Cache manager connected');

      // Create HTTP server
      this.server = createServer(this.app);

      // Setup WebSocket if enabled
      if (config.protocols.websocket) {
        this.wsHandler.initialize(this.server);
        logger.info('WebSocket MCP protocol enabled');
      }

      // Start listening
      await new Promise<void>((resolve) => {
        this.server.listen(config.server.port, config.server.host, () => {
          resolve();
        });
      });

      logger.info('🚀 CryptoSentiment Intelligence HTTP Server started', {
        host: config.server.host,
        port: config.server.port,
        protocols: {
          'http-rest': config.protocols.rest,
          'http-mcp': config.protocols.http,
          'websocket-mcp': config.protocols.websocket
        },
        pid: process.pid
      });

      console.log(`✅ HTTP Server running at http://${config.server.host}:${config.server.port}`);
      console.log(`📡 WebSocket MCP: ws://${config.server.host}:${config.server.port}/mcp/ws`);
      console.log(`📚 API Documentation: http://${config.server.host}:${config.server.port}/docs`);

    } catch (error) {
      logger.error('Failed to start HTTP server', { error });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down HTTP server...');

    try {
      // Close WebSocket connections
      if (config.protocols.websocket) {
        this.wsHandler.shutdown();
        logger.info('WebSocket handler shut down');
      }

      // Close HTTP server
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          this.server.close((error?: Error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
        logger.info('HTTP server closed');
      }

      // Disconnect cache
      await cacheManager.disconnect();
      logger.info('Cache manager disconnected');

      logger.info('HTTP server shutdown complete');
    } catch (error) {
      logger.error('Error during HTTP server shutdown', { error });
      throw error;
    }
  }

  getApp(): express.Application {
    return this.app;
  }

  getServer(): any {
    return this.server;
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
let httpServer: CryptoSentimentHttpServer;

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  if (httpServer) {
    await httpServer.shutdown();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  if (httpServer) {
    await httpServer.shutdown();
  }
  process.exit(0);
});

// Start the server if this file is run directly
async function main() {
  httpServer = new CryptoSentimentHttpServer();
  await httpServer.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('HTTP server startup failed', { error });
    process.exit(1);
  });
}

export { CryptoSentimentHttpServer };