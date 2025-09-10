#!/bin/bash
set -e

echo "🚀 Starting Kaayaan CryptoSentiment Intelligence MCP Server"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[CRYPTO-SENTIMENT]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "Created .env from .env.example"
        print_warning "Please edit .env file with your configuration before running again"
        exit 1
    else
        print_error ".env.example not found. Please create .env file manually"
        exit 1
    fi
fi

# Source environment variables
source .env

# Validate required environment variables
print_status "Validating environment configuration..."

# Check required variables
REQUIRED_VARS=(
    "MONGODB_URL"
    "REDIS_URL"
    "OPENROUTER_API_KEY"
)

missing_vars=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    print_error "Please set these variables in your .env file"
    exit 1
fi

# Validate MongoDB connection
print_status "Testing MongoDB connection..."
if ! timeout 5s bash -c "</dev/tcp/${MONGODB_URL#mongodb://}/27017" 2>/dev/null; then
    print_warning "Cannot connect to MongoDB. Ensure MongoDB is running."
else
    print_status "MongoDB connection successful"
fi

# Validate Redis connection
print_status "Testing Redis connection..."
REDIS_HOST=$(echo $REDIS_URL | sed 's/redis:\/\/[^@]*@\?\([^:]*\).*/\1/')
REDIS_PORT=$(echo $REDIS_URL | sed 's/.*:\([0-9]*\).*/\1/')

if ! timeout 5s bash -c "</dev/tcp/$REDIS_HOST/$REDIS_PORT" 2>/dev/null; then
    print_warning "Cannot connect to Redis. Ensure Redis is running."
else
    print_status "Redis connection successful"
fi

# Check if TypeScript needs compilation
if [ ! -d "build" ] || [ "src" -nt "build" ]; then
    print_status "Building TypeScript..."
    npm run build
    if [ $? -eq 0 ]; then
        print_status "TypeScript compilation successful"
    else
        print_error "TypeScript compilation failed"
        exit 1
    fi
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_NODE_MAJOR=18

if [ "${NODE_VERSION%%.*}" -lt "$REQUIRED_NODE_MAJOR" ]; then
    print_error "Node.js version $REQUIRED_NODE_MAJOR+ required. Current version: $NODE_VERSION"
    exit 1
fi

# Determine server type from command line argument
SERVER_TYPE=${1:-"stdio"}

print_header "Starting CryptoSentiment Intelligence MCP Server v1.0.0"
print_status "Server Type: $SERVER_TYPE"
print_status "Node.js Version: $NODE_VERSION"
print_status "Environment: ${NODE_ENV:-production}"
print_status "Timezone: ${TZ:-UTC}"

case "$SERVER_TYPE" in
    "stdio")
        print_status "Starting STDIO MCP Server (Claude Desktop compatible)"
        print_status "Protocols: STDIO MCP"
        node build/index.js
        ;;
    "http")
        print_status "Starting HTTP Server (REST API + HTTP MCP + WebSocket)"
        print_status "Protocols: HTTP REST, HTTP MCP, WebSocket MCP"
        print_status "Server will be available at: http://${HOST:-localhost}:${PORT:-4004}"
        print_status "API Documentation: http://${HOST:-localhost}:${PORT:-4004}/docs"
        print_status "WebSocket MCP: ws://${HOST:-localhost}:${PORT:-4004}/mcp/ws"
        node build/http-server.js
        ;;
    "all")
        print_status "Starting All Protocols (STDIO + HTTP + WebSocket)"
        print_warning "This mode is for development only"
        # Start HTTP server in background
        node build/http-server.js &
        HTTP_PID=$!
        
        # Start STDIO server in foreground
        print_status "HTTP Server PID: $HTTP_PID"
        print_status "Starting STDIO Server..."
        
        # Cleanup function
        cleanup() {
            print_status "Shutting down servers..."
            kill $HTTP_PID 2>/dev/null || true
            wait $HTTP_PID 2>/dev/null || true
            print_status "Shutdown complete"
        }
        
        trap cleanup EXIT INT TERM
        
        node build/index.js
        ;;
    "test")
        print_status "Running server tests..."
        npm test
        ;;
    *)
        print_error "Unknown server type: $SERVER_TYPE"
        echo
        echo "Usage: $0 [stdio|http|all|test]"
        echo
        echo "  stdio - Start STDIO MCP server (Claude Desktop)"
        echo "  http  - Start HTTP server (REST + MCP + WebSocket)"
        echo "  all   - Start all protocols (development mode)"
        echo "  test  - Run tests"
        echo
        exit 1
        ;;
esac