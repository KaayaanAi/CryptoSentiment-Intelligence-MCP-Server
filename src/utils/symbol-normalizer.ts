/**
 * Crypto Symbol Normalizer
 * Converts various crypto symbol formats to standardized USDT trading pairs
 * Supports multiple languages including Arabic
 */

export interface NormalizedSymbol {
  symbol: string;
  usdtPair: string;
  originalInput: string;
  confidence: number;
}

// Comprehensive symbol mapping including Arabic names
const CRYPTO_SYMBOL_MAP: Record<string, string> = {
  // Bitcoin variants
  'btc': 'BTC',
  'bitcoin': 'BTC',
  'بتكوين': 'BTC',
  'بيتكوين': 'BTC',
  'البتكوين': 'BTC',
  'البيتكوين': 'BTC',
  
  // Ethereum variants
  'eth': 'ETH',
  'ethereum': 'ETH',
  'إيثريوم': 'ETH',
  'ايثيريوم': 'ETH',
  'الإيثريوم': 'ETH',
  'الايثيريوم': 'ETH',
  
  // XRP variants
  'xrp': 'XRP',
  'ripple': 'XRP',
  'ريبل': 'XRP',
  'الريبل': 'XRP',
  'إكس آر بي': 'XRP',
  
  // BNB variants
  'bnb': 'BNB',
  'binance': 'BNB',
  'binance coin': 'BNB',
  'بايننس': 'BNB',
  'عملة بايننس': 'BNB',
  
  // Polkadot variants
  'dot': 'DOT',
  'polkadot': 'DOT',
  'بولكادوت': 'DOT',
  'البولكادوت': 'DOT',
  
  // Hedera variants
  'hbar': 'HBAR',
  'hedera': 'HBAR',
  'hedera hashgraph': 'HBAR',
  'هيديرا': 'HBAR',
  'الهيديرا': 'HBAR',
  
  // Cardano variants
  'ada': 'ADA',
  'cardano': 'ADA',
  'كاردانو': 'ADA',
  'الكاردانو': 'ADA',
  
  // Solana variants
  'sol': 'SOL',
  'solana': 'SOL',
  'سولانا': 'SOL',
  'السولانا': 'SOL',
  
  // Chainlink variants
  'link': 'LINK',
  'chainlink': 'LINK',
  'تشين لينك': 'LINK',
  'التشين لينك': 'LINK',
  
  // Uniswap variants
  'uni': 'UNI',
  'uniswap': 'UNI',
  'يونيسواب': 'UNI',
  'اليونيسواب': 'UNI',
  
  // Polygon variants
  'matic': 'MATIC',
  'polygon': 'MATIC',
  'بوليجون': 'MATIC',
  'البوليجون': 'MATIC',
  
  // Avalanche variants
  'avax': 'AVAX',
  'avalanche': 'AVAX',
  'أفالانش': 'AVAX',
  'الأفالانش': 'AVAX',
  
  // Litecoin variants
  'ltc': 'LTC',
  'litecoin': 'LTC',
  'لايتكوين': 'LTC',
  'اللايتكوين': 'LTC',
  
  // Bitcoin Cash variants
  'bch': 'BCH',
  'bitcoin cash': 'BCH',
  'بتكوين كاش': 'BCH',
  'البتكوين كاش': 'BCH',
  
  // Dogecoin variants
  'doge': 'DOGE',
  'dogecoin': 'DOGE',
  'دوجكوين': 'DOGE',
  'الدوجكوين': 'DOGE',
  
  // Shiba Inu variants
  'shib': 'SHIB',
  'shiba': 'SHIB',
  'shiba inu': 'SHIB',
  'شيبا إينو': 'SHIB',
  'الشيبا إينو': 'SHIB'
};

// Popular alternative names and abbreviations
const ALTERNATIVE_NAMES: Record<string, string> = {
  // Bitcoin alternatives
  'btc-usdt': 'BTC',
  'btcusdt': 'BTC',
  'bitcoin/usdt': 'BTC',
  'bitcoin-usdt': 'BTC',
  
  // Ethereum alternatives
  'eth-usdt': 'ETH',
  'ethusdt': 'ETH',
  'ethereum/usdt': 'ETH',
  'ethereum-usdt': 'ETH',
  
  // Common abbreviations
  'btc/usdt': 'BTC',
  'eth/usdt': 'ETH',
  'xrp/usdt': 'XRP',
  'bnb/usdt': 'BNB',
  'dot/usdt': 'DOT',
  'ada/usdt': 'ADA',
  'sol/usdt': 'SOL'
};

/**
 * Normalizes crypto symbol input to standardized format
 * @param input - Raw input symbol (any language/format)
 * @returns Normalized symbol information
 */
export function normalizeSymbol(input: string): NormalizedSymbol {
  if (!input || typeof input !== 'string') {
    return {
      symbol: 'BTC',
      usdtPair: 'BTCUSDT',
      originalInput: input || '',
      confidence: 0
    };
  }

  // Clean and normalize input
  const cleanInput = input.trim().toLowerCase()
    .replace(/\s+/g, ' ') // normalize whitespace
    .replace(/[^\w\s\u0600-\u06FF]/g, ''); // keep alphanumeric and Arabic chars

  // Direct symbol match
  if (CRYPTO_SYMBOL_MAP[cleanInput]) {
    const symbol = CRYPTO_SYMBOL_MAP[cleanInput];
    return {
      symbol,
      usdtPair: `${symbol}USDT`,
      originalInput: input,
      confidence: 1.0
    };
  }

  // Alternative names match
  if (ALTERNATIVE_NAMES[cleanInput]) {
    const symbol = ALTERNATIVE_NAMES[cleanInput];
    return {
      symbol,
      usdtPair: `${symbol}USDT`,
      originalInput: input,
      confidence: 0.9
    };
  }

  // Partial match (fuzzy matching)
  for (const [key, symbol] of Object.entries(CRYPTO_SYMBOL_MAP)) {
    if (cleanInput.includes(key) || key.includes(cleanInput)) {
      return {
        symbol,
        usdtPair: `${symbol}USDT`,
        originalInput: input,
        confidence: 0.7
      };
    }
  }

  // Check if input is already a valid symbol format
  const upperInput = cleanInput.toUpperCase();
  if (upperInput.match(/^[A-Z]{2,5}$/)) {
    return {
      symbol: upperInput,
      usdtPair: `${upperInput}USDT`,
      originalInput: input,
      confidence: 0.8
    };
  }

  // Default fallback to BTC
  return {
    symbol: 'BTC',
    usdtPair: 'BTCUSDT',
    originalInput: input,
    confidence: 0.1
  };
}

/**
 * Extracts crypto symbols from text query
 * @param query - Text containing crypto references
 * @returns Array of normalized symbols found
 */
export function extractSymbolsFromQuery(query: string): NormalizedSymbol[] {
  if (!query || typeof query !== 'string') {
    return [normalizeSymbol('BTC')];
  }

  const symbols: NormalizedSymbol[] = [];
  const cleanQuery = query.toLowerCase();

  // Check for each known crypto symbol in the query
  for (const [key, symbol] of Object.entries(CRYPTO_SYMBOL_MAP)) {
    if (cleanQuery.includes(key)) {
      symbols.push({
        symbol,
        usdtPair: `${symbol}USDT`,
        originalInput: key,
        confidence: 0.9
      });
    }
  }

  // Remove duplicates and sort by confidence
  const uniqueSymbols = symbols.filter((symbol, index, self) => 
    index === self.findIndex(s => s.symbol === symbol.symbol)
  ).sort((a, b) => b.confidence - a.confidence);

  // If no symbols found, try to extract from words
  if (uniqueSymbols.length === 0) {
    const words = cleanQuery.split(/\s+/);
    for (const word of words) {
      const normalized = normalizeSymbol(word);
      if (normalized.confidence > 0.5) {
        uniqueSymbols.push(normalized);
        break; // Take first high-confidence match
      }
    }
  }

  // Default to BTC if nothing found
  if (uniqueSymbols.length === 0) {
    uniqueSymbols.push(normalizeSymbol('BTC'));
  }

  return uniqueSymbols.slice(0, 5); // Limit to 5 symbols max
}

/**
 * Gets trading pair for symbol
 * @param symbol - Crypto symbol
 * @param quoteCurrency - Quote currency (default: USDT)
 * @returns Trading pair string
 */
export function getTradingPair(symbol: string, quoteCurrency: string = 'USDT'): string {
  const normalized = normalizeSymbol(symbol);
  return `${normalized.symbol}${quoteCurrency}`;
}

/**
 * Validates if symbol is supported
 * @param symbol - Symbol to validate
 * @returns Boolean indicating if symbol is supported
 */
export function isValidSymbol(symbol: string): boolean {
  const normalized = normalizeSymbol(symbol);
  return normalized.confidence >= 0.5;
}