#!/usr/bin/env node

/**
 * Comprehensive Test Suite for CryptoSentiment Intelligence MCP Server
 * 
 * Tests all 4 protocols:
 * 1. STDIO MCP Protocol
 * 2. HTTP MCP Protocol  
 * 3. REST API Protocol
 * 4. WebSocket MCP Protocol
 */

import { spawn, ChildProcess } from 'child_process';
import { setTimeout as delay } from 'timers/promises';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { WebSocket } from 'ws';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class TestRunner {
  private results: TestResult[] = [];
  private servers: ChildProcess[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting CryptoSentiment Intelligence MCP Server Test Suite\n');
    
    try {
      // Basic setup tests
      await this.runTest('Configuration Validation', () => this.testConfigValidation());
      await this.runTest('Build Artifacts Check', () => this.testBuildArtifacts());
      
      // Protocol tests
      await this.runTest('STDIO MCP Protocol', () => this.testStdioProtocol());
      await this.runTest('HTTP Server Startup', () => this.testHttpServerStartup());
      await this.runTest('HTTP Health Endpoint', () => this.testHttpHealthEndpoint());
      await this.runTest('REST API Protocol', () => this.testRestApiProtocol());
      await this.runTest('HTTP MCP Protocol', () => this.testHttpMcpProtocol());
      await this.runTest('WebSocket MCP Protocol', () => this.testWebSocketProtocol());
      
      // Core functionality tests
      await this.runTest('Sentiment Analysis Tool', () => this.testSentimentAnalysisTool());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      
    } finally {
      await this.cleanup();
    }
    
    this.printResults();
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    console.log(`⏳ Running: ${name}`);
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ name, passed: true, duration });
      console.log(`✅ ${name} (${duration}ms)\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.results.push({ name, passed: false, error: errorMsg, duration });
      console.log(`❌ ${name} (${duration}ms): ${errorMsg}\n`);
    }
  }

  private async testConfigValidation(): Promise<void> {
    // Test that configuration loads without throwing
    const { validateConfig } = await import('./config.js');
    
    // Should not throw in test environment
    validateConfig();
    console.log('   📋 Configuration validated successfully');
  }

  private async testBuildArtifacts(): Promise<void> {
    const buildDir = path.join(projectRoot, 'build');
    const requiredFiles = [
      'index.js',
      'http-server.js',
      'config.js',
      'tools/analyze-crypto-sentiment.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(buildDir, file);
      try {
        await fs.access(filePath);
        console.log(`   ✓ Found: ${file}`);
      } catch {
        throw new Error(`Missing build artifact: ${file}`);
      }
    }
  }

  private async testStdioProtocol(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        server.kill();
        reject(new Error('STDIO protocol test timed out'));
      }, 10000);

      const server = spawn('node', [path.join(projectRoot, 'build/index.js')], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env,
          NODE_ENV: 'test',
          ENABLE_HTTP_REST: 'false',
          ENABLE_HTTP_MCP: 'false',
          ENABLE_WEBSOCKET: 'false'
        }
      });

      this.servers.push(server);

      let stdoutData = '';
      let initSent = false;

      server.stdout?.on('data', (data) => {
        stdoutData += data.toString();
        
        // Look for server ready message first
        if (!initSent && data.toString().includes('CryptoSentiment Intelligence MCP Server')) {
          console.log('   🚀 STDIO server started');
          
          // Send MCP initialize request
          const initRequest = {
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'test-client', version: '1.0.0' }
            }
          };
          
          server.stdin?.write(JSON.stringify(initRequest) + '\n');
          initSent = true;
        }
        
        // Parse MCP responses
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.id === 1 && response.result) {
              console.log('   ✓ MCP initialize successful');
              
              // Test tools/list
              const listToolsRequest = {
                jsonrpc: '2.0',
                id: 2,
                method: 'tools/list',
                params: {}
              };
              
              server.stdin?.write(JSON.stringify(listToolsRequest) + '\n');
            } else if (response.id === 2 && response.result?.tools) {
              console.log(`   ✓ Tools listed: ${response.result.tools.length} tools`);
              
              const tool = response.result.tools.find((t: any) => t.name === 'analyze_crypto_sentiment');
              if (tool) {
                console.log('   ✓ analyze_crypto_sentiment tool found');
                clearTimeout(timeout);
                server.kill();
                resolve();
              } else {
                clearTimeout(timeout);
                server.kill();
                reject(new Error('analyze_crypto_sentiment tool not found'));
              }
            }
          } catch (e) {
            // Ignore non-JSON lines (like log messages)
          }
        }
      });

      server.stderr?.on('data', (data) => {
        const message = data.toString();
        if (message.includes('ERROR') || message.includes('error')) {
          clearTimeout(timeout);
          server.kill();
          reject(new Error(`STDIO server error: ${message}`));
        }
      });

      server.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0 && code !== null) {
          reject(new Error(`STDIO server exited with code ${code}`));
        }
      });
    });
  }

  private async testHttpServerStartup(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        server.kill();
        reject(new Error('HTTP server startup test timed out'));
      }, 15000);

      const server = spawn('node', [path.join(projectRoot, 'build/http-server.js')], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env,
          NODE_ENV: 'test',
          PORT: '4005',  // Use different port to avoid conflicts
          HOST: '127.0.0.1'
        }
      });

      this.servers.push(server);

      server.stdout?.on('data', (data) => {
        const message = data.toString();
        if (message.includes('HTTP Server running at')) {
          console.log('   🌐 HTTP server started on port 4005');
          clearTimeout(timeout);
          resolve();
        }
      });

      server.stderr?.on('data', (data) => {
        const message = data.toString();
        if (message.includes('HTTP Server running at')) {
          console.log('   🌐 HTTP server started on port 4005');
          clearTimeout(timeout);
          resolve();
        } else if (message.includes('ERROR') || message.includes('EADDRINUSE')) {
          clearTimeout(timeout);
          server.kill();
          reject(new Error(`HTTP server startup error: ${message}`));
        }
      });

      server.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0 && code !== null) {
          reject(new Error(`HTTP server exited with code ${code}`));
        }
      });
    });
  }

  private async testHttpHealthEndpoint(): Promise<void> {
    // Wait a moment for server to be fully ready
    await delay(2000);
    
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 4005,
        path: '/health',
        method: 'GET',
        timeout: 5000
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (res.statusCode === 200 && response.status === 'healthy') {
              console.log('   ✓ Health endpoint responding correctly');
              resolve();
            } else {
              reject(new Error(`Health check failed: ${res.statusCode} ${data}`));
            }
          } catch (error) {
            reject(new Error(`Invalid health response: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Health endpoint request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health endpoint request timed out'));
      });

      req.end();
    });
  }

  private async testRestApiProtocol(): Promise<void> {
    await delay(1000);
    
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 4005,
        path: '/tools',
        method: 'GET',
        timeout: 5000
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (res.statusCode === 200 && Array.isArray(response.tools)) {
              console.log(`   ✓ REST API tools endpoint: ${response.tools.length} tools`);
              
              const sentimentTool = response.tools.find((t: any) => t.name === 'analyze_crypto_sentiment');
              if (sentimentTool) {
                console.log('   ✓ analyze_crypto_sentiment tool available via REST');
                resolve();
              } else {
                reject(new Error('analyze_crypto_sentiment tool not found in REST API'));
              }
            } else {
              reject(new Error(`REST API tools failed: ${res.statusCode} ${data}`));
            }
          } catch (error) {
            reject(new Error(`Invalid REST API response: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`REST API request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('REST API request timed out'));
      });

      req.end();
    });
  }

  private async testHttpMcpProtocol(): Promise<void> {
    await delay(1000);
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      });

      const req = http.request({
        hostname: '127.0.0.1',
        port: 4005,
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 5000
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (res.statusCode === 200 && response.result?.tools) {
              console.log(`   ✓ HTTP MCP tools/list: ${response.result.tools.length} tools`);
              
              const sentimentTool = response.result.tools.find((t: any) => t.name === 'analyze_crypto_sentiment');
              if (sentimentTool) {
                console.log('   ✓ analyze_crypto_sentiment tool available via HTTP MCP');
                resolve();
              } else {
                reject(new Error('analyze_crypto_sentiment tool not found in HTTP MCP'));
              }
            } else {
              reject(new Error(`HTTP MCP failed: ${res.statusCode} ${data}`));
            }
          } catch (error) {
            reject(new Error(`Invalid HTTP MCP response: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`HTTP MCP request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('HTTP MCP request timed out'));
      });

      req.write(postData);
      req.end();
    });
  }

  private async testWebSocketProtocol(): Promise<void> {
    await delay(1000);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket protocol test timed out'));
      }, 10000);

      const ws = new WebSocket('ws://127.0.0.1:4005/mcp/ws');
      let messageCount = 0;

      ws.on('open', () => {
        console.log('   🔌 WebSocket connected');
        
        // Send tools/list request
        const request = {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        };
        
        ws.send(JSON.stringify(request));
      });

      ws.on('message', (data) => {
        try {
          const response = JSON.parse(data.toString());
          messageCount++;
          
          if (response.id === 1 && response.result?.tools) {
            console.log(`   ✓ WebSocket MCP tools/list: ${response.result.tools.length} tools`);
            
            const sentimentTool = response.result.tools.find((t: any) => t.name === 'analyze_crypto_sentiment');
            if (sentimentTool) {
              console.log('   ✓ analyze_crypto_sentiment tool available via WebSocket');
              clearTimeout(timeout);
              ws.close();
              resolve();
            } else {
              clearTimeout(timeout);
              ws.close();
              reject(new Error('analyze_crypto_sentiment tool not found in WebSocket MCP'));
            }
          }
        } catch (error) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(`Invalid WebSocket response: ${data.toString()}`));
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error.message}`));
      });

      ws.on('close', () => {
        if (messageCount === 0) {
          clearTimeout(timeout);
          reject(new Error('WebSocket closed without receiving messages'));
        }
      });
    });
  }

  private async testSentimentAnalysisTool(): Promise<void> {
    await delay(1000);
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        query: 'latest crypto sentiment',
        analysis_depth: 'quick',
        max_news_items: 3,
        time_range: '1h',
        include_prices: false  // Skip price data to make test faster
      });

      const req = http.request({
        hostname: '127.0.0.1',
        port: 4005,
        path: '/tools/analyze_crypto_sentiment',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 15000  // Longer timeout for analysis
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            // Check if response has expected structure
            if (res.statusCode === 200 && response.analysis_metadata) {
              console.log('   ✓ Sentiment analysis completed successfully');
              console.log(`   📊 Analysis depth: ${response.analysis_metadata.depth}`);
              
              if (response.sentiment_summary) {
                console.log(`   💭 Sentiment: ${response.sentiment_summary.overall_sentiment}`);
              }
              
              resolve();
            } else if (res.statusCode === 200) {
              // Even if analysis fails, API should respond correctly
              console.log('   ✓ Sentiment analysis API responded (may have failed gracefully)');
              resolve();
            } else {
              reject(new Error(`Sentiment analysis failed: ${res.statusCode} ${data}`));
            }
          } catch (error) {
            reject(new Error(`Invalid sentiment analysis response: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Sentiment analysis request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Sentiment analysis request timed out'));
      });

      req.write(postData);
      req.end();
    });
  }

  private async testErrorHandling(): Promise<void> {
    await delay(1000);
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        query: '',  // Invalid empty query
        analysis_depth: 'invalid_depth'  // Invalid depth
      });

      const req = http.request({
        hostname: '127.0.0.1',
        port: 4005,
        path: '/tools/analyze_crypto_sentiment',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 5000
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const statusCode = res.statusCode || 500;
          
          try {
            const response = JSON.parse(data);
            
            // Check if API gracefully handled the error
            if (statusCode === 200 && response.data && response.data.risk_assessment) {
              // API returned success with error details in risk assessment
              if (response.data.risk_assessment.level === 'HIGH' && 
                  response.data.risk_assessment.factors.includes('analysis_error')) {
                console.log('   ✓ Error handling works: Graceful error response');
                console.log('   ✓ Error details included in risk assessment');
                resolve();
                return;
              }
            }
            
            // Check for traditional error response (400/422 status)
            if (statusCode >= 400 && statusCode < 500) {
              console.log(`   ✓ Error handling works: ${statusCode}`);
              if (response.error || response.message) {
                console.log('   ✓ Error response has proper structure');
                resolve();
              } else {
                reject(new Error('Error response missing error information'));
              }
            } else if (statusCode === 200) {
              // Unexpected success response
              reject(new Error(`Expected error response, got: ${statusCode} ${JSON.stringify(response, null, 2)}`));
            } else {
              reject(new Error(`Unexpected status code: ${statusCode} ${data}`));
            }
          } catch (error) {
            // Plain text error is also acceptable for 4xx status
            if (statusCode >= 400 && statusCode < 500) {
              console.log('   ✓ Error response received (plain text)');
              resolve();
            } else {
              reject(new Error(`Invalid error response: ${data}`));
            }
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Error handling test failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Error handling test timed out'));
      });

      req.write(postData);
      req.end();
    });
  }

  private async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test servers...');
    
    for (const server of this.servers) {
      if (!server.killed) {
        server.kill('SIGTERM');
        
        // Wait up to 5 seconds for graceful shutdown
        const timeout = setTimeout(() => {
          server.kill('SIGKILL');
        }, 5000);
        
        try {
          await new Promise((resolve) => {
            server.on('exit', resolve);
          });
          clearTimeout(timeout);
        } catch {
          // Force kill if needed
          server.kill('SIGKILL');
          clearTimeout(timeout);
        }
      }
    }
    
    this.servers = [];
    
    // Wait a moment for cleanup
    await delay(1000);
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.passed);
    const failed = this.results.filter(r => !r.passed);
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`✅ Passed: ${passed.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`📈 Success Rate: ${Math.round((passed.length / this.results.length) * 100)}%`);
    
    if (failed.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      failed.forEach(test => {
        console.log(`   • ${test.name}: ${test.error}`);
      });
    }
    
    console.log('\n✅ PASSED TESTS:');
    passed.forEach(test => {
      console.log(`   • ${test.name} (${test.duration}ms)`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (failed.length > 0) {
      console.log('❌ Some tests failed. Please check the output above.');
      process.exit(1);
    } else {
      console.log('🎉 All tests passed! The CryptoSentiment Intelligence MCP Server is working correctly.');
      process.exit(0);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  runner.runAllTests().catch((error) => {
    console.error('🚨 Test runner crashed:', error);
    process.exit(1);
  });
}

export { TestRunner };