import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'crypto-sentiment-mcp',
      ...meta
    });
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'crypto-sentiment-mcp',
    version: '1.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      )
    })
  ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: logFormat
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: logFormat
  }));
}

export { logger };

export const createRequestLogger = (protocol: string) => {
  return (requestId: string, method?: string, duration?: number, error?: Error) => {
    const logData = {
      protocol,
      requestId,
      method,
      duration,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };

    if (error) {
      logger.error('Request failed', logData);
    } else {
      logger.info('Request completed', logData);
    }
  };
};

export const logHealth = (status: 'healthy' | 'degraded' | 'unhealthy', services: Record<string, boolean>) => {
  logger.info('Health check', {
    status,
    services,
    timestamp: new Date().toISOString()
  });
};

export const logMetrics = (metrics: Record<string, any>) => {
  logger.info('Metrics', {
    ...metrics,
    timestamp: new Date().toISOString()
  });
};

export default logger;