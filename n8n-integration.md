# 🔗 n8n Integration Guide

**Complete guide for integrating CryptoSentiment Intelligence MCP Server with n8n workflows**

## 🚀 Quick Setup

### 1. Deploy MCP Server

```bash
# Option A: Docker (Recommended)
git clone <repository>
cd CryptoSentiment-Intelligence-MCP-Server
cp .env.example .env
# Edit .env with your API keys
docker-compose up -d

# Option B: Native
npm install && npm run build
./start_server.sh http
```

### 2. n8n MCP Client Configuration

Add **MCP Client** node to your workflow with these settings:

```json
{
  "connection": {
    "type": "HTTP MCP",
    "url": "http://localhost:4004/mcp",
    "timeout": 30000
  },
  "authentication": {
    "type": "header",
    "headerName": "x-api-key",
    "value": "your-api-key-if-required"
  }
}
```

## 📊 Available Tools

### `analyze_crypto_sentiment`

**Description**: Advanced cryptocurrency sentiment analysis with market intelligence

**Parameters**:
```json
{
  "query": "Bitcoin ETF news",
  "analysis_depth": "standard",
  "max_news_items": 15,
  "time_range": "6h",
  "include_prices": true,
  "focus_coins": ["BTC", "ETH"]
}
```

**Response Structure**:
```json
{
  "overall_sentiment": "BULLISH|BEARISH|NEUTRAL",
  "confidence_score": 0.87,
  "processing_time_ms": 4200,
  "market_signals": [...],
  "behavioral_insights": {...},
  "risk_assessment": {...},
  "actionable_recommendations": [...]
}
```

## 🔄 Workflow Examples

### Example 1: Daily Crypto Market Brief

```json
{
  "nodes": [
    {
      "name": "Schedule",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{"field": "hours", "value": 8}]
        }
      }
    },
    {
      "name": "Crypto Analysis",
      "type": "n8n-nodes-mcp.mcpClient",
      "parameters": {
        "connection": {
          "url": "http://crypto-sentiment:4004/mcp"
        },
        "tool": "analyze_crypto_sentiment",
        "arguments": {
          "query": "latest crypto market sentiment",
          "analysis_depth": "standard",
          "time_range": "24h",
          "include_prices": true
        }
      }
    },
    {
      "name": "Format Report",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const analysis = $json;\nconst report = `\n📊 **Daily Crypto Market Brief**\n\n**Overall Sentiment**: ${analysis.overall_sentiment} (${Math.round(analysis.confidence_score * 100)}% confidence)\n\n**Top Signals**:\n${analysis.market_signals.slice(0, 3).map(signal => \n  `• ${signal.headline}\\n  Impact: ${signal.impact_prediction.direction} (${signal.impact_prediction.magnitude})`\n).join('\\n\\n')}\n\n**Recommendations**:\n${analysis.actionable_recommendations.slice(0, 3).map(rec => `• ${rec}`).join('\\n')}\n\n**Risk Level**: ${analysis.risk_assessment.level}\n`;\n\nreturn {json: {report, raw_analysis: analysis}};"
      }
    },
    {
      "name": "Send to Slack",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#crypto-alerts",
        "text": "={{$json.report}}"
      }
    }
  ]
}
```

### Example 2: Bitcoin-Specific Alert System

```json
{
  "nodes": [
    {
      "name": "Schedule",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{"field": "hours", "value": 2}]
        }
      }
    },
    {
      "name": "Bitcoin Sentiment",
      "type": "n8n-nodes-mcp.mcpClient",
      "parameters": {
        "connection": {
          "url": "http://crypto-sentiment:4004/mcp"
        },
        "tool": "analyze_crypto_sentiment",
        "arguments": {
          "query": "Bitcoin BTC news analysis",
          "analysis_depth": "deep",
          "focus_coins": ["BTC"],
          "time_range": "6h",
          "max_news_items": 25
        }
      }
    },
    {
      "name": "Check Alert Conditions",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "options": {
            "leftValue": "={{$json.confidence_score}}",
            "operation": "larger",
            "rightValue": 0.8
          }
        }
      }
    },
    {
      "name": "High Confidence Alert",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "subject": "🚨 High Confidence Bitcoin Signal: {{$json.overall_sentiment}}",
        "text": "Confidence: {{Math.round($json.confidence_score * 100)}}%\n\nTop Signal: {{$json.market_signals[0].headline}}\n\nRecommendation: {{$json.market_signals[0].recommendation}}\n\nRisk Level: {{$json.risk_assessment.level}}"
      }
    }
  ]
}
```

### Example 3: Multi-Coin Portfolio Analysis

```json
{
  "nodes": [
    {
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "crypto-analysis",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Portfolio Analysis",
      "type": "n8n-nodes-mcp.mcpClient",
      "parameters": {
        "connection": {
          "url": "http://crypto-sentiment:4004/mcp"
        },
        "tool": "analyze_crypto_sentiment",
        "arguments": {
          "query": "{{$json.query || 'portfolio analysis'}}",
          "analysis_depth": "{{$json.depth || 'standard'}}",
          "focus_coins": "={{$json.coins || ['BTC', 'ETH', 'ADA', 'SOL']}}",
          "include_prices": true,
          "time_range": "12h"
        }
      }
    },
    {
      "name": "Calculate Portfolio Impact",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "const analysis = $json;\nconst coins = $('Webhook Trigger').first().json.coins || ['BTC', 'ETH', 'ADA', 'SOL'];\n\n// Calculate weighted sentiment by market cap or holdings\nlet portfolioSentiment = 0;\nlet totalWeight = 0;\n\nanalysis.market_signals.forEach(signal => {\n  const coinWeight = signal.affected_coins.filter(coin => coins.includes(coin)).length;\n  if (coinWeight > 0) {\n    const sentimentValue = {\n      'STRONGLY_POSITIVE': 2,\n      'POSITIVE': 1,\n      'NEUTRAL': 0,\n      'NEGATIVE': -1,\n      'STRONGLY_NEGATIVE': -2\n    }[signal.sentiment] || 0;\n    \n    portfolioSentiment += sentimentValue * coinWeight * signal.confidence;\n    totalWeight += coinWeight * signal.confidence;\n  }\n});\n\nconst normalizedSentiment = totalWeight > 0 ? portfolioSentiment / totalWeight : 0;\n\nreturn {\n  json: {\n    portfolio_sentiment: normalizedSentiment,\n    portfolio_sentiment_label: normalizedSentiment > 0.5 ? 'BULLISH' : normalizedSentiment < -0.5 ? 'BEARISH' : 'NEUTRAL',\n    portfolio_confidence: totalWeight / coins.length,\n    analysis: analysis,\n    coins_analyzed: coins\n  }\n};"
      }
    },
    {
      "name": "Store Results",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "insert",
        "table": "portfolio_analysis",
        "columns": "timestamp,portfolio_sentiment,confidence,overall_sentiment,raw_data",
        "values": "={{new Date().toISOString()}},={{$json.portfolio_sentiment}},={{$json.portfolio_confidence}},={{$json.analysis.overall_sentiment}},={{JSON.stringify($json.analysis)}}"
      }
    }
  ]
}
```

## 🔌 Advanced Integration Patterns

### Pattern 1: Real-Time Streaming with WebSocket

```json
{
  "nodes": [
    {
      "name": "WebSocket Trigger",
      "type": "n8n-nodes-base.websocket",
      "parameters": {
        "path": "/crypto-stream"
      }
    },
    {
      "name": "Stream Analysis",
      "type": "n8n-nodes-mcp.mcpClient",
      "parameters": {
        "connection": {
          "type": "WebSocket",
          "url": "ws://crypto-sentiment:4004/mcp/ws"
        },
        "tool": "analyze_crypto_sentiment",
        "arguments": {
          "query": "={{$json.query}}",
          "stream_updates": true,
          "analysis_depth": "quick"
        }
      }
    },
    {
      "name": "Broadcast Updates",
      "type": "n8n-nodes-base.websocket",
      "parameters": {
        "operation": "send",
        "message": "={{$json}}"
      }
    }
  ]
}
```

### Pattern 2: Batch Processing with Error Handling

```json
{
  "nodes": [
    {
      "name": "Batch Queries",
      "type": "n8n-nodes-base.itemLists",
      "parameters": {
        "operation": "split",
        "fieldName": "queries",
        "include": "originalItem"
      }
    },
    {
      "name": "Process Each Query",
      "type": "n8n-nodes-mcp.mcpClient",
      "parameters": {
        "connection": {
          "url": "http://crypto-sentiment:4004/mcp"
        },
        "tool": "analyze_crypto_sentiment",
        "arguments": {
          "query": "={{$json.query}}",
          "analysis_depth": "standard"
        },
        "continueOnFail": true
      }
    },
    {
      "name": "Handle Success",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "options": {
            "leftValue": "={{$json.error}}",
            "operation": "isEmpty"
          }
        }
      }
    },
    {
      "name": "Success Branch",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "return {json: {status: 'success', query: $json.query, result: $json}};"
      }
    },
    {
      "name": "Error Branch",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "return {json: {status: 'error', query: $json.query, error: $json.error}};"
      }
    }
  ]
}
```

## 🚨 Monitoring & Alerts

### Health Check Workflow

```json
{
  "nodes": [
    {
      "name": "Health Check Schedule",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{"field": "minutes", "value": 5}]
        }
      }
    },
    {
      "name": "Check MCP Server",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "http://crypto-sentiment:4004/health",
        "method": "GET"
      }
    },
    {
      "name": "Evaluate Health",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "options": {
            "leftValue": "={{$json.status}}",
            "operation": "notEqual",
            "rightValue": "healthy"
          }
        }
      }
    },
    {
      "name": "Send Alert",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#alerts",
        "text": "🚨 CryptoSentiment MCP Server is unhealthy!\n\nStatus: {{$json.status}}\nTimestamp: {{$json.timestamp}}\nServices: {{JSON.stringify($json.services)}}"
      }
    }
  ]
}
```

## 📈 Performance Optimization

### Best Practices

1. **Caching Strategy**:
```json
{
  "name": "Cache Check",
  "type": "n8n-nodes-base.redis",
  "parameters": {
    "operation": "get",
    "key": "crypto_analysis_{{$json.query}}_{{$json.time_range}}"
  }
}
```

2. **Rate Limiting**:
```json
{
  "name": "Rate Limit",
  "type": "n8n-nodes-base.wait",
  "parameters": {
    "amount": 2,
    "unit": "seconds"
  }
}
```

3. **Batch Requests**:
```json
{
  "name": "Batch MCP Request",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "http://crypto-sentiment:4004/mcp/batch",
    "method": "POST",
    "body": "={{JSON.stringify($json.batch_requests)}}"
  }
}
```

## 🔧 Troubleshooting

### Common Issues

**Connection Refused**:
```bash
# Check if server is running
docker-compose ps crypto-sentiment-mcp

# Check logs
docker-compose logs crypto-sentiment-mcp

# Test connectivity
curl http://localhost:4004/health
```

**Timeout Errors**:
- Increase timeout in MCP Client node
- Use "quick" analysis depth for faster responses
- Implement proper error handling

**Rate Limiting**:
- Add delays between requests
- Use batch processing
- Implement exponential backoff

### Debug Workflow

```json
{
  "nodes": [
    {
      "name": "Debug Request",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "console.log('MCP Request:', JSON.stringify($json, null, 2));\nreturn {json: $json};"
      }
    },
    {
      "name": "MCP Call",
      "type": "n8n-nodes-mcp.mcpClient",
      "parameters": {
        "connection": {
          "url": "http://crypto-sentiment:4004/mcp"
        },
        "tool": "analyze_crypto_sentiment",
        "arguments": "={{$json}}"
      }
    },
    {
      "name": "Debug Response",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "console.log('MCP Response:', JSON.stringify($json, null, 2));\nreturn {json: $json};"
      }
    }
  ]
}
```

## 📞 Support

- **MCP Server Issues**: Check server logs and health endpoint
- **n8n Integration**: Verify MCP Client node configuration
- **Performance**: Monitor response times and implement caching
- **Rate Limits**: Implement proper request throttling

---

**Ready to power your n8n workflows with advanced crypto intelligence! 🚀**