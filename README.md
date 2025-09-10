# 🚀 CryptoSentiment Intelligence MCP Server

**Advanced AI-driven cryptocurrency sentiment analysis with quad-protocol support for universal compatibility**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/kaayaan-ai/crypto-sentiment-intelligence-mcp-server)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-orange.svg)](https://modelcontextprotocol.io)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](Dockerfile)

## ✨ Features

### 🔄 **Quad-Protocol Support**
- **STDIO MCP** - Claude Desktop integration
- **HTTP REST API** - Standard REST endpoints
- **HTTP MCP** - JSON-RPC 2.0 for n8n-nodes-mcp
- **WebSocket MCP** - Real-time streaming analysis

### 🧠 **Advanced AI Analysis Frameworks**
1. **Sentiment Fusion** - Multi-source sentiment aggregation with ML adaptation
2. **Behavioral Network Analysis** - Whale and influencer behavior patterns
3. **Multi-Modal Processing** - Text, image, and video content analysis
4. **Predictive Impact Modeling** - ML-based market impact forecasting
5. **Quantum Correlation** - Cross-sector event cascade analysis

### 📊 **Comprehensive Market Intelligence**
- Real-time cryptocurrency price integration
- Multi-source news aggregation (RSS feeds, Reddit, social media)
- Historical pattern matching and correlation analysis
- Risk assessment and actionable recommendations
- Geopolitical ripple effect analysis

### 🛡️ **Production-Ready Features**
- Advanced caching with Redis fallback to memory
- Rate limiting and API key authentication
- Comprehensive logging and health monitoring
- Graceful shutdown and connection management
- Docker containerization with multi-stage builds

## 🎯 Quick Start

### 1. **Environment Setup**

```bash
# Clone the repository
git clone https://github.com/kaayaan-ai/crypto-sentiment-intelligence-mcp-server
cd crypto-sentiment-intelligence-mcp-server

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### 2. **Required Environment Variables**

```env
# AI Provider (Required)
OPENROUTER_API_KEY=your-openrouter-api-key

# Database Connections
MONGODB_URL=mongodb://localhost:27017/crypto_sentiment
REDIS_URL=redis://localhost:6379

# Optional: Price API
COINGECKO_API_KEY=your-coingecko-api-key
```

### 3. **Quick Start Options**

#### Option A: Docker (Recommended)
```bash
# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f crypto-sentiment-mcp
```

#### Option B: Native Installation
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start STDIO MCP (Claude Desktop)
./start_server.sh stdio

# Or start HTTP server (REST + MCP + WebSocket)
./start_server.sh http
```

## 🔧 Usage Examples

### Claude Desktop Integration

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "crypto-sentiment": {
      "command": "npx",
      "args": ["-s", "user", "crypto-sentiment-intelligence-mcp-server"]
    }
  }
}
```

### n8n Integration

Use the **MCP Client** node with these settings:

```json
{
  "connection": {
    "type": "HTTP MCP",
    "url": "http://localhost:4004/mcp"
  },
  "tools": ["analyze_crypto_sentiment"]
}
```

### REST API Usage

```bash
# Analyze latest crypto sentiment
curl -X POST http://localhost:4004/tools/analyze_crypto_sentiment \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Bitcoin ETF news",
    "analysis_depth": "standard",
    "include_prices": true
  }'
```

### WebSocket Real-time Analysis

```javascript
const ws = new WebSocket('ws://localhost:4004/mcp/ws');

ws.onopen = () => {
  // Initialize connection
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'MyApp', version: '1.0.0' }
    }
  }));
};

// Request analysis with real-time updates
ws.send(JSON.stringify({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'analyze_crypto_sentiment',
    arguments: {
      query: 'latest crypto sentiment',
      stream_updates: true
    }
  }
}));
```

## 📋 Analysis Tool Parameters

### `analyze_crypto_sentiment`

**Parameters:**
- `query` (required) - Search query or "latest" for general analysis
- `analysis_depth` - "quick" | "standard" | "deep" (default: "standard")  
- `max_news_items` - 5-50 (default: 15)
- `time_range` - "1h" | "6h" | "12h" | "24h" (default: "6h")
- `include_prices` - Include current price data (default: true)
- `focus_coins` - Array of specific coins to prioritize (optional)

**Example Response:**
```json
{
  "overall_sentiment": "BULLISH",
  "confidence_score": 0.87,
  "processing_time_ms": 4200,
  "analysis_timestamp": "2025-09-10T20:15:00Z",
  "market_signals": [
    {
      "headline": "BlackRock increases Bitcoin ETF allocation by 40%",
      "sentiment": "STRONGLY_POSITIVE",
      "affected_coins": ["BTC", "ETH"],
      "impact_prediction": {
        "timeframe": "SHORT_TERM",
        "magnitude": "HIGH",
        "direction": "BULLISH"
      },
      "price_context": {
        "BTC": { "current": 45250.33, "change_24h": 2.4 }
      },
      "ai_analysis": "Institutional adoption signal suggests sustained buying pressure",
      "recommendation": "STRONG_BUY_SIGNAL"
    }
  ],
  "behavioral_insights": {
    "whale_activity": "INCREASED_ACCUMULATION",
    "social_sentiment": "FEAR_TO_GREED_TRANSITION",
    "influencer_alignment": 0.73
  },
  "risk_assessment": {
    "level": "MEDIUM",
    "factors": ["regulatory_uncertainty", "macro_correlation"]
  },
  "actionable_recommendations": [
    "Consider BTC accumulation on next dip below $44,000",
    "Monitor Ethereum for breakout above $2,850 resistance"
  ]
}
```

## 🐳 Docker Deployment

### Full Stack Deployment
```bash
# Deploy everything (MCP Server + Redis + MongoDB + Monitoring)
docker-compose up -d

# Scale HTTP servers
docker-compose up -d --scale crypto-sentiment-http=3

# Enable monitoring (Prometheus + Grafana)
docker-compose --profile monitoring up -d
```

### Kaayaan Stack Integration
```yaml
# Add to your existing docker-compose.yml
services:
  crypto-sentiment:
    image: kaayaan/crypto-sentiment-mcp:latest
    networks:
      - kaayaan_default
    environment:
      - MONGODB_URL=${MONGODB_URL}
      - REDIS_URL=${REDIS_URL}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
```

## 🛠️ Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Start development with auto-reload
npm run watch

# Run in development mode
npm run dev

# Test the server
npm test
```

### Testing Individual Components
```bash
# Test STDIO MCP protocol
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node build/index.js

# Test tool execution
echo -e '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"analyze_crypto_sentiment","arguments":{"query":"Bitcoin news"}}}' | node build/index.js
```

### MCP Inspector
```bash
# Launch MCP Inspector for interactive testing
npm run inspector
```

## 📊 API Endpoints

### Health & Status
- `GET /health` - Health check with service status
- `GET /status` - Server status and capabilities  
- `GET /metrics` - Performance metrics

### Tools
- `GET /tools` - List available tools with schemas
- `GET /tools/{name}/schema` - Get specific tool schema
- `POST /tools/analyze_crypto_sentiment` - Execute sentiment analysis

### MCP Protocol
- `POST /mcp` - JSON-RPC 2.0 MCP endpoint
- `POST /mcp/batch` - Batch request support
- `WebSocket /mcp/ws` - WebSocket MCP protocol

### Documentation
- `GET /docs` - API documentation with examples
- `GET /` - Server information and available endpoints

## 🔐 Security

### Authentication
```bash
# Set API key requirement
export REQUIRED_API_KEY="your-secure-api-key"

# Include in requests
curl -H "x-api-key: your-secure-api-key" http://localhost:4004/tools
```

### Rate Limiting
- Default: 100 requests per minute per IP
- Configurable via `RATE_LIMIT_MAX_REQUESTS`
- Returns 429 with retry-after header

### Security Headers
- Helmet.js for security headers
- CORS configuration
- Input validation with Zod schemas
- SQL/NoSQL injection protection

## 📈 Performance

### Optimizations
- **Redis caching** with memory fallback
- **Connection pooling** for databases
- **Async processing** throughout
- **Smart batching** for external APIs
- **Response compression** for WebSocket

### Benchmarks
- **Response time**: < 8 seconds for standard analysis
- **Concurrent requests**: 1000+ connections supported
- **Memory usage**: ~512MB typical, 1GB limit
- **CPU usage**: Optimized for multi-core processing

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | HTTP server port | `4004` |
| `LOG_LEVEL` | Logging level | `info` |
| `ENABLE_STDIO` | Enable STDIO MCP | `true` |
| `ENABLE_HTTP_REST` | Enable REST API | `true` |
| `ENABLE_HTTP_MCP` | Enable HTTP MCP | `true` |
| `ENABLE_WEBSOCKET` | Enable WebSocket | `true` |
| `MONGODB_URL` | MongoDB connection | Required |
| `REDIS_URL` | Redis connection | Required |
| `OPENROUTER_API_KEY` | AI provider key | Required |
| `COINGECKO_API_KEY` | Price API key | Optional |
| `DEFAULT_ANALYSIS_DEPTH` | Default depth | `standard` |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit | `100` |

### Advanced Configuration

```env
# AI Configuration
DEFAULT_MODEL=deepseek/deepseek-chat
BACKUP_MODEL=meta-llama/llama-3.1-8b-instruct:free
AI_TIMEOUT_MS=30000
MAX_TOKENS=4000

# News Sources
RSS_FEEDS=https://cointelegraph.com/rss,https://coindesk.com/rss
REDDIT_FEEDS=https://reddit.com/r/CryptoCurrency/.rss

# Cache Configuration
PRICE_CACHE_TTL=300
NEWS_CACHE_TTL=600
ANALYSIS_CACHE_TTL=900

# Performance
MAX_CONCURRENT_ANALYSIS=5
CONNECTION_POOL_SIZE=10
REQUEST_TIMEOUT_MS=30000
```

## 📝 Troubleshooting

### Common Issues

**Server won't start:**
```bash
# Check build
npm run build

# Verify environment
node -e "require('dotenv').config(); console.log(process.env.MONGODB_URL)"

# Test connections
./start_server.sh test
```

**MCP Inspector errors:**
```bash
# Ensure build is current
npm run build

# Check executable permissions
ls -la build/index.js

# Test with minimal input
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node build/index.js
```

**Analysis failures:**
- Verify `OPENROUTER_API_KEY` is set
- Check internet connectivity for news feeds
- Ensure sufficient API quotas
- Review logs: `docker-compose logs crypto-sentiment-mcp`

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug

# Run with detailed output
./start_server.sh stdio
```

## 🤝 Integration Examples

### Python Client
```python
import requests

def analyze_crypto_sentiment(query):
    response = requests.post(
        'http://localhost:4004/tools/analyze_crypto_sentiment',
        json={
            'query': query,
            'analysis_depth': 'standard',
            'include_prices': True
        }
    )
    return response.json()

result = analyze_crypto_sentiment("Bitcoin ETF approval")
print(f"Sentiment: {result['data']['overall_sentiment']}")
```

### Node.js Client
```javascript
import axios from 'axios';

async function analyzeCrypto(query) {
  const response = await axios.post(
    'http://localhost:4004/tools/analyze_crypto_sentiment',
    {
      query,
      analysis_depth: 'deep',
      max_news_items: 20
    }
  );
  
  return response.data;
}

const result = await analyzeCrypto('Ethereum upgrade');
console.log(`Confidence: ${result.data.confidence_score}`);
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenRouter** - AI provider infrastructure
- **CoinGecko** - Cryptocurrency price data
- **Model Context Protocol** - Standardized AI tool integration
- **Kaayaan AI Infrastructure** - Production deployment platform

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/kaayaan-ai/crypto-sentiment-intelligence-mcp-server/issues)
- **Documentation**: [API Reference](http://localhost:4004/docs)
- **Discord**: [Kaayaan Community](https://discord.gg/kaayaan)

---

**Built with ❤️ by [Kaayaan AI Infrastructure](https://kaayaan.ai)**

*Powering the future of cryptocurrency intelligence through advanced AI analysis*