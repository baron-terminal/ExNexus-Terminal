/* ============================================================
   ExNexus Data Worker
   Collects, stores and analyzes crypto market data
   D1 Database: exnexus-data
   ID: 1a39e72f-a314-4a89-ba60-1b3c2ef1472c
============================================================ */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  'Content-Type': 'application/json'
};

function ok(data)  { return new Response(JSON.stringify({ ok:true,  ...data }), { headers: CORS }); }
function err(msg)  { return new Response(JSON.stringify({ ok:false, error: msg }), { status:400, headers: CORS }); }

// ── Coin Lists ────────────────────────────────────────────────
const TIER1_COINS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT','BNBUSDT','ADAUSDT',
  'AVAXUSDT','DOTUSDT','LINKUSDT','MATICUSDT','DOGEUSDT',
  'LTCUSDT','ATOMUSDT','UNIUSDT','AAVEUSDT','OPUSDT','ARBUSDT'
];

const TIMEFRAMES = ['15m','1h','4h','1d'];

// ── Main Handler ──────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url  = new URL(request.url);
    const path = url.pathname;

    // ── Route Table ──────────────────────────────────────────
    if (path === '/init')                    return handleInit(request, env);
    if (path === '/collect')                 return handleCollect(request, env);
    if (path === '/collect/history')         return handleCollectHistory(request, env);
    if (path === '/screener')                return handleScreener(request, env);
    if (path === '/indicators')              return handleIndicators(request, env);
    if (path === '/candles')                 return handleCandles(request, env);
    if (path === '/coins')                   return handleCoins(request, env);
    if (path === '/status')                  return handleStatus(request, env);
    if (path === '/backtest')                return handleBacktest(request, env);
    if (path === '/patterns')                return handlePatterns(request, env);

    return err('Route not found');
  },

  // ── Scheduled collector (runs every 5 minutes via Cron) ───
  async scheduled(event, env, ctx) {
    ctx.waitUntil(collectAllCandles(env));
  }
};

/* ============================================================
   DATABASE INIT — Create all tables
============================================================ */
async function handleInit(request, env) {
  try {
    // Candles table — OHLCV data
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS candles (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol    TEXT    NOT NULL,
        timeframe TEXT    NOT NULL,
        ts        INTEGER NOT NULL,
        open      REAL    NOT NULL,
        high      REAL    NOT NULL,
        low       REAL    NOT NULL,
        close     REAL    NOT NULL,
        volume    REAL    NOT NULL,
        UNIQUE(symbol, timeframe, ts)
      );
    `);

    // Index for fast queries
    await env.DB.exec(`
      CREATE INDEX IF NOT EXISTS idx_candles_symbol_tf_ts 
      ON candles(symbol, timeframe, ts DESC);
    `);

    // Screener results table
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS screener_results (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol     TEXT    NOT NULL,
        timeframe  TEXT    NOT NULL,
        ts         INTEGER NOT NULL,
        rsi        REAL,
        macd       REAL,
        macd_signal REAL,
        macd_hist  REAL,
        bb_upper   REAL,
        bb_mid     REAL,
        bb_lower   REAL,
        ema20      REAL,
        ema50      REAL,
        ema200     REAL,
        volume_ratio REAL,
        trend      TEXT,
        signal     TEXT,
        score      REAL,
        UNIQUE(symbol, timeframe, ts)
      );
    `);

    // Coins watchlist
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS coins (
        symbol     TEXT PRIMARY KEY,
        name       TEXT,
        tier       INTEGER DEFAULT 1,
        active     INTEGER DEFAULT 1,
        added_at   INTEGER
      );
    `);

    // Insert Tier 1 coins
    const insertCoins = TIER1_COINS.map(sym =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO coins (symbol, tier, active, added_at) VALUES (?, 1, 1, ?)`
      ).bind(sym, Date.now())
    );
    await env.DB.batch(insertCoins);

    // Collection log
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS collection_log (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        ts        INTEGER,
        symbols   INTEGER,
        candles   INTEGER,
        errors    INTEGER,
        duration  INTEGER
      );
    `);

    return ok({ message: 'Database initialized successfully', tables: ['candles','screener_results','coins','collection_log'] });
  } catch(e) {
    return err('Init failed: ' + e.message);
  }
}

/* ============================================================
   COLLECT CANDLES — Fetch latest candles from Binance
============================================================ */
async function handleCollect(request, env) {
  const start = Date.now();
  try {
    const result = await collectAllCandles(env);
    return ok({ ...result, duration: Date.now() - start });
  } catch(e) {
    return err('Collection failed: ' + e.message);
  }
}

async function collectAllCandles(env) {
  // Get active coins from DB
  const coinsResult = await env.DB.prepare(
    `SELECT symbol FROM coins WHERE active = 1`
  ).all();
  const coins = coinsResult.results.map(r => r.symbol);

  let totalCandles = 0;
  let errors = 0;

  // Collect 1H candles for all coins (primary timeframe)
  // Use batch processing - 10 coins at a time
  for(let i = 0; i < coins.length; i += 10) {
    const batch = coins.slice(i, i + 10);
    const promises = batch.map(sym => fetchAndStoreCandles(env, sym, '1h', 100));
    const results = await Promise.allSettled(promises);
    results.forEach(r => {
      if(r.status === 'fulfilled') totalCandles += r.value || 0;
      else errors++;
    });
    // Small delay between batches to respect rate limits
    if(i + 10 < coins.length) await sleep(200);
  }

  // Log collection
  await env.DB.prepare(
    `INSERT INTO collection_log (ts, symbols, candles, errors, duration) VALUES (?, ?, ?, ?, ?)`
  ).bind(Date.now(), coins.length, totalCandles, errors, 0).run();

  return { symbols: coins.length, candles: totalCandles, errors };
}

async function fetchAndStoreCandles(env, symbol, interval, limit = 100) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res  = await fetch(url);
    if(!res.ok) return 0;
    const data = await res.json();

    // Batch insert candles
    const stmts = data.map(k =>
      env.DB.prepare(`
        INSERT OR REPLACE INTO candles (symbol, timeframe, ts, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(symbol, interval, k[0], parseFloat(k[1]), parseFloat(k[2]), parseFloat(k[3]), parseFloat(k[4]), parseFloat(k[5]))
    );

    if(stmts.length > 0) await env.DB.batch(stmts);
    return stmts.length;
  } catch(e) {
    return 0;
  }
}

/* ============================================================
   COLLECT HISTORY — Fetch years of historical data
============================================================ */
async function handleCollectHistory(request, env) {
  const url    = new URL(request.url);
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  const tf     = url.searchParams.get('timeframe') || '1h';
  const days   = parseInt(url.searchParams.get('days') || '365');

  try {
    let totalCandles = 0;
    const msPerCandle = tfToMs(tf);
    const totalCandles_needed = Math.floor((days * 24 * 60 * 60 * 1000) / msPerCandle);
    const batches = Math.ceil(totalCandles_needed / 1000);
    let endTime = Date.now();

    for(let b = 0; b < Math.min(batches, 365); b++) {
      const url_api = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${tf}&limit=1000&endTime=${endTime}`;
      const res = await fetch(url_api);
      if(!res.ok) break;
      const data = await res.json();
      if(!data.length) break;

      const stmts = data.map(k =>
        env.DB.prepare(`
          INSERT OR IGNORE INTO candles (symbol, timeframe, ts, open, high, low, close, volume)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(symbol, tf, k[0], parseFloat(k[1]), parseFloat(k[2]), parseFloat(k[3]), parseFloat(k[4]), parseFloat(k[5]))
      );
      await env.DB.batch(stmts);
      totalCandles += data.length;
      endTime = data[0][0] - 1;
      await sleep(100);
    }

    return ok({ symbol, timeframe: tf, days, candles: totalCandles });
  } catch(e) {
    return err('History collection failed: ' + e.message);
  }
}

/* ============================================================
   SCREENER — Scan all coins and rank opportunities
============================================================ */
async function handleScreener(request, env) {
  const url       = new URL(request.url);
  const timeframe = url.searchParams.get('tf')       || '1h';
  const minRsi    = parseFloat(url.searchParams.get('min_rsi') || '25');
  const maxRsi    = parseFloat(url.searchParams.get('max_rsi') || '65');
  const limit     = parseInt(url.searchParams.get('limit')    || '50');

  try {
    // Get all active coins
    const coinsResult = await env.DB.prepare(
      `SELECT symbol FROM coins WHERE active = 1`
    ).all();
    const coins = coinsResult.results.map(r => r.symbol);

    const results = [];

    // Analyze each coin
    for(const symbol of coins) {
      try {
        const analysis = await analyzeSymbol(env, symbol, timeframe);
        if(!analysis) continue;

        // Apply filters
        if(analysis.rsi < minRsi || analysis.rsi > maxRsi) continue;

        results.push(analysis);
      } catch(e) {}
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Store screener results
    const stmts = results.map(r =>
      env.DB.prepare(`
        INSERT OR REPLACE INTO screener_results
        (symbol, timeframe, ts, rsi, macd, macd_signal, macd_hist, 
         bb_upper, bb_mid, bb_lower, ema20, ema50, ema200, 
         volume_ratio, trend, signal, score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        r.symbol, timeframe, Date.now(),
        r.rsi, r.macd, r.macd_signal, r.macd_hist,
        r.bb_upper, r.bb_mid, r.bb_lower,
        r.ema20, r.ema50, r.ema200,
        r.volume_ratio, r.trend, r.signal, r.score
      )
    );
    if(stmts.length) await env.DB.batch(stmts);

    return ok({
      timeframe,
      scanned: coins.length,
      found: results.length,
      results: results.slice(0, limit)
    });
  } catch(e) {
    return err('Screener failed: ' + e.message);
  }
}

/* ============================================================
   INDICATOR CALCULATION ENGINE
============================================================ */
async function analyzeSymbol(env, symbol, timeframe) {
  // Fetch last 200 candles for this symbol/timeframe
  const { results } = await env.DB.prepare(`
    SELECT ts, open, high, low, close, volume
    FROM candles
    WHERE symbol = ? AND timeframe = ?
    ORDER BY ts ASC
    LIMIT 200
  `).bind(symbol, timeframe).all();

  if(!results || results.length < 50) return null;

  const closes  = results.map(r => r.close);
  const highs   = results.map(r => r.high);
  const lows    = results.map(r => r.low);
  const volumes = results.map(r => r.volume);

  // ── Calculate all indicators ──────────────────────────────
  const rsi       = calcRSI(closes, 14);
  const macdData  = calcMACD(closes, 12, 26, 9);
  const bbData    = calcBollingerBands(closes, 20, 2);
  const ema20     = calcEMA(closes, 20);
  const ema50     = calcEMA(closes, 50);
  const ema200    = calcEMA(closes, 200);
  const atr       = calcATR(highs, lows, closes, 14);
  const volRatio  = calcVolumeRatio(volumes, 20);

  const price     = closes[closes.length - 1];
  const rsiVal    = rsi[rsi.length - 1];
  const macdVal   = macdData.macd[macdData.macd.length - 1];
  const macdSig   = macdData.signal[macdData.signal.length - 1];
  const macdHist  = macdVal - macdSig;
  const bbU       = bbData.upper[bbData.upper.length - 1];
  const bbM       = bbData.mid[bbData.mid.length - 1];
  const bbL       = bbData.lower[bbData.lower.length - 1];
  const ema20Val  = ema20[ema20.length - 1];
  const ema50Val  = ema50[ema50.length - 1];
  const ema200Val = ema200.length > 0 ? ema200[ema200.length - 1] : null;
  const volRat    = volRatio;

  // ── Determine trend ───────────────────────────────────────
  let trend = 'neutral';
  if(price > ema20Val && ema20Val > ema50Val)   trend = 'uptrend';
  if(price < ema20Val && ema20Val < ema50Val)   trend = 'downtrend';
  if(ema200Val && price > ema200Val)             trend += '_above200';

  // ── Generate signal ───────────────────────────────────────
  let signal = 'neutral';
  let score  = 50;

  // Bullish signals
  if(rsiVal < 40 && rsiVal > 25)   { score += 15; signal = 'oversold_bounce'; }
  if(macdHist > 0 && macdData.hist[macdData.hist.length-2] < 0) { score += 20; signal = 'macd_cross_up'; }
  if(price < bbL)                  { score += 10; signal = 'bb_oversold'; }
  if(volRat > 1.5)                 { score += 10; }
  if(trend.includes('uptrend'))    { score += 15; }
  if(price > ema20Val && price > ema50Val) { score += 10; }

  // Bearish signals (reduce score)
  if(rsiVal > 70)                  { score -= 20; signal = 'overbought'; }
  if(macdHist < 0 && macdData.hist[macdData.hist.length-2] > 0) { score -= 15; signal = 'macd_cross_down'; }
  if(trend.includes('downtrend'))  { score -= 10; }

  // Cap score 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    symbol,
    price,
    rsi:          parseFloat(rsiVal?.toFixed(2)   || 0),
    macd:         parseFloat(macdVal?.toFixed(4)  || 0),
    macd_signal:  parseFloat(macdSig?.toFixed(4)  || 0),
    macd_hist:    parseFloat(macdHist?.toFixed(4) || 0),
    bb_upper:     parseFloat(bbU?.toFixed(2)      || 0),
    bb_mid:       parseFloat(bbM?.toFixed(2)      || 0),
    bb_lower:     parseFloat(bbL?.toFixed(2)      || 0),
    ema20:        parseFloat(ema20Val?.toFixed(2)  || 0),
    ema50:        parseFloat(ema50Val?.toFixed(2)  || 0),
    ema200:       ema200Val ? parseFloat(ema200Val.toFixed(2)) : null,
    atr:          parseFloat(atr[atr.length-1]?.toFixed(4) || 0),
    volume_ratio: parseFloat(volRat?.toFixed(2)   || 1),
    trend,
    signal,
    score:        parseFloat(score.toFixed(1))
  };
}

/* ============================================================
   TECHNICAL INDICATORS — Pure JavaScript
============================================================ */

// RSI — Relative Strength Index
function calcRSI(closes, period = 14) {
  const rsi = [];
  let gains = 0, losses = 0;

  for(let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i-1];
    if(diff >= 0) gains  += diff;
    else          losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for(let i = period; i < closes.length; i++) {
    if(i === period) {
      rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
      continue;
    }
    const diff = closes[i] - closes[i-1];
    avgGain = (avgGain * (period-1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period-1) + (diff < 0 ? -diff : 0)) / period;
    rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
  }
  return rsi;
}

// EMA — Exponential Moving Average
function calcEMA(closes, period) {
  if(closes.length < period) return [];
  const k   = 2 / (period + 1);
  const ema = [closes.slice(0, period).reduce((a,b) => a+b, 0) / period];
  for(let i = period; i < closes.length; i++) {
    ema.push(closes[i] * k + ema[ema.length-1] * (1-k));
  }
  return ema;
}

// SMA — Simple Moving Average
function calcSMA(closes, period) {
  const sma = [];
  for(let i = period-1; i < closes.length; i++) {
    sma.push(closes.slice(i-period+1, i+1).reduce((a,b) => a+b, 0) / period);
  }
  return sma;
}

// MACD — Moving Average Convergence Divergence
function calcMACD(closes, fast=12, slow=26, signal=9) {
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);
  const diff    = slow - fast;

  const macd = [];
  for(let i = 0; i < emaSlow.length; i++) {
    macd.push(emaFast[i + diff] - emaSlow[i]);
  }

  const signalLine = calcEMA(macd, signal);
  const hist       = macd.slice(signal-1).map((v,i) => v - signalLine[i]);

  return { macd: macd.slice(signal-1), signal: signalLine, hist };
}

// Bollinger Bands
function calcBollingerBands(closes, period=20, stdDev=2) {
  const upper = [], mid = [], lower = [];
  for(let i = period-1; i < closes.length; i++) {
    const slice = closes.slice(i-period+1, i+1);
    const mean  = slice.reduce((a,b) => a+b, 0) / period;
    const std   = Math.sqrt(slice.reduce((a,b) => a + (b-mean)**2, 0) / period);
    mid.push(mean);
    upper.push(mean + stdDev * std);
    lower.push(mean - stdDev * std);
  }
  return { upper, mid, lower };
}

// ATR — Average True Range
function calcATR(highs, lows, closes, period=14) {
  const tr  = [];
  const atr = [];
  for(let i = 1; i < closes.length; i++) {
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i-1]),
      Math.abs(lows[i]  - closes[i-1])
    ));
  }
  let avgTR = tr.slice(0, period).reduce((a,b) => a+b, 0) / period;
  atr.push(avgTR);
  for(let i = period; i < tr.length; i++) {
    avgTR = (avgTR * (period-1) + tr[i]) / period;
    atr.push(avgTR);
  }
  return atr;
}

// Volume Ratio — current volume vs average
function calcVolumeRatio(volumes, period=20) {
  if(volumes.length < period+1) return 1;
  const avgVol = volumes.slice(-period-1, -1).reduce((a,b) => a+b, 0) / period;
  return avgVol > 0 ? volumes[volumes.length-1] / avgVol : 1;
}

// Stochastic RSI
function calcStochRSI(closes, period=14, smoothK=3, smoothD=3) {
  const rsi  = calcRSI(closes, period);
  const stoch = [];
  for(let i = period-1; i < rsi.length; i++) {
    const slice  = rsi.slice(i-period+1, i+1);
    const minRsi = Math.min(...slice);
    const maxRsi = Math.max(...slice);
    stoch.push(maxRsi === minRsi ? 0 : (rsi[i] - minRsi) / (maxRsi - minRsi) * 100);
  }
  const k = calcSMA(stoch, smoothK);
  const d = calcSMA(k, smoothD);
  return { k, d };
}

/* ============================================================
   GET CANDLES — Return candle data for charting
============================================================ */
async function handleCandles(request, env) {
  const url       = new URL(request.url);
  const symbol    = url.searchParams.get('symbol')    || 'BTCUSDT';
  const timeframe = url.searchParams.get('timeframe') || '1h';
  const limit     = parseInt(url.searchParams.get('limit') || '200');

  try {
    const { results } = await env.DB.prepare(`
      SELECT ts, open, high, low, close, volume
      FROM candles
      WHERE symbol = ? AND timeframe = ?
      ORDER BY ts DESC
      LIMIT ?
    `).bind(symbol, timeframe, limit).all();

    return ok({
      symbol,
      timeframe,
      count: results.length,
      candles: results.reverse()
    });
  } catch(e) {
    return err('Candles failed: ' + e.message);
  }
}

/* ============================================================
   GET INDICATORS — Calculate and return indicators for a symbol
============================================================ */
async function handleIndicators(request, env) {
  const url       = new URL(request.url);
  const symbol    = url.searchParams.get('symbol')    || 'BTCUSDT';
  const timeframe = url.searchParams.get('timeframe') || '1h';

  try {
    const analysis = await analyzeSymbol(env, symbol, timeframe);
    if(!analysis) return err('Not enough data — run /collect/history first');
    return ok(analysis);
  } catch(e) {
    return err('Indicators failed: ' + e.message);
  }
}

/* ============================================================
   COINS — Manage watchlist
============================================================ */
async function handleCoins(request, env) {
  const url    = new URL(request.url);
  const action = url.searchParams.get('action') || 'list';

  if(action === 'list') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM coins WHERE active = 1 ORDER BY tier, symbol`
    ).all();
    return ok({ coins: results });
  }

  if(action === 'add' && request.method === 'POST') {
    const body   = await request.json();
    const symbol = body.symbol?.toUpperCase();
    if(!symbol) return err('Symbol required');
    await env.DB.prepare(
      `INSERT OR REPLACE INTO coins (symbol, tier, active, added_at) VALUES (?, 2, 1, ?)`
    ).bind(symbol, Date.now()).run();
    return ok({ message: `${symbol} added to watchlist` });
  }

  if(action === 'remove') {
    const symbol = url.searchParams.get('symbol')?.toUpperCase();
    if(!symbol) return err('Symbol required');
    await env.DB.prepare(
      `UPDATE coins SET active = 0 WHERE symbol = ?`
    ).bind(symbol).run();
    return ok({ message: `${symbol} removed from watchlist` });
  }

  return err('Unknown action');
}

/* ============================================================
   PATTERNS — Detect candlestick patterns for a symbol
============================================================ */
async function handlePatterns(request, env) {
    const url       = new URL(request.url);
    const symbol    = url.searchParams.get('symbol')    || 'BTCUSDT';
    const timeframe = url.searchParams.get('timeframe') || '1h';
    const limit     = parseInt(url.searchParams.get('limit') || '50');

    try {
        const { results } = await env.DB.prepare(`
            SELECT ts, open, high, low, close, volume
            FROM candles
            WHERE symbol = ? AND timeframe = ?
            ORDER BY ts DESC
            LIMIT ?
        `).bind(symbol, timeframe, limit).all();

        if(!results.length) return err('No candle data — run /collect first');

        const candles  = results.reverse();
        const patterns = detectPatterns(candles);

        // Summary of recent patterns
        const recent = patterns.slice(-5);
        const bullish = patterns.filter(p => p.patterns.some(x => x.type==='bullish')).length;
        const bearish = patterns.filter(p => p.patterns.some(x => x.type==='bearish')).length;

        return ok({
            symbol, timeframe,
            candles_analyzed: candles.length,
            total_patterns_found: patterns.length,
            bullish_signals: bullish,
            bearish_signals: bearish,
            bias: bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral',
            recent_patterns: recent,
            all_patterns: patterns
        });
    } catch(e) {
        return err('Pattern detection failed: ' + e.message);
    }
}

/* ============================================================
   BACKTEST — Test strategy against historical data
============================================================ */
async function handleBacktest(request, env) {
  if(request.method !== 'POST') return err('POST required');
  const body = await request.json().catch(() => ({}));

  const symbol    = body.symbol    || 'BTCUSDT';
  const timeframe = body.timeframe || '1h';
  const strategy  = body.strategy  || 'rsi_bounce';
  const rsiEntry  = body.rsi_entry || 35;
  const rsiExit   = body.rsi_exit  || 65;
  const tp_pct    = body.tp        || 3;
  const sl_pct    = body.sl        || 1.5;

  try {
    // Get all historical candles
    const { results } = await env.DB.prepare(`
      SELECT ts, open, high, low, close, volume
      FROM candles
      WHERE symbol = ? AND timeframe = ?
      ORDER BY ts ASC
    `).bind(symbol, timeframe).all();

    if(results.length < 100) return err('Not enough history — run /collect/history first');

    const closes  = results.map(r => r.close);
    const highs   = results.map(r => r.high);
    const lows    = results.map(r => r.low);
    const rsi     = calcRSI(closes, 14);

    // Simulate trades
    const trades  = [];
    let inTrade   = false;
    let entryPrice = 0;
    let entryIdx   = 0;

    for(let i = 14; i < results.length; i++) {
      const rsiIdx = i - 14;
      if(rsiIdx >= rsi.length) break;
      const rsiVal = rsi[rsiIdx];
      const price  = closes[i];

      if(!inTrade) {
        // Entry condition
        if(strategy === 'rsi_bounce' && rsiVal <= rsiEntry) {
          inTrade    = true;
          entryPrice = price;
          entryIdx   = i;
        }
      } else {
        // Exit conditions
        const tpPrice = entryPrice * (1 + tp_pct/100);
        const slPrice = entryPrice * (1 - sl_pct/100);
        const rsiExitHit = rsiVal >= rsiExit;

        let exitPrice = 0;
        let exitReason = '';

        if(highs[i] >= tpPrice)   { exitPrice = tpPrice;  exitReason = 'TP'; }
        else if(lows[i] <= slPrice){ exitPrice = slPrice;  exitReason = 'SL'; }
        else if(rsiExitHit)        { exitPrice = price;    exitReason = 'RSI_EXIT'; }

        if(exitPrice > 0) {
          const pnlPct = (exitPrice - entryPrice) / entryPrice * 100;
          trades.push({
            entry:       new Date(results[entryIdx].ts).toISOString().split('T')[0],
            exit:        new Date(results[i].ts).toISOString().split('T')[0],
            entryPrice:  parseFloat(entryPrice.toFixed(4)),
            exitPrice:   parseFloat(exitPrice.toFixed(4)),
            pnl_pct:     parseFloat(pnlPct.toFixed(3)),
            reason:      exitReason,
            bars_held:   i - entryIdx
          });
          inTrade = false;
        }
      }
    }

    // Calculate stats
    const wins     = trades.filter(t => t.pnl_pct > 0);
    const losses   = trades.filter(t => t.pnl_pct <= 0);
    const winRate  = trades.length > 0 ? (wins.length / trades.length * 100) : 0;
    const avgWin   = wins.length   > 0 ? wins.reduce((a,b)  => a + b.pnl_pct, 0) / wins.length   : 0;
    const avgLoss  = losses.length > 0 ? losses.reduce((a,b) => a + b.pnl_pct, 0) / losses.length : 0;
    const totalPnl = trades.reduce((a,b) => a + b.pnl_pct, 0);
    const expectancy = (winRate/100 * avgWin) + ((1-winRate/100) * avgLoss);

    return ok({
      symbol, timeframe, strategy,
      params:       { rsi_entry: rsiEntry, rsi_exit: rsiExit, tp_pct, sl_pct },
      candles_used: results.length,
      stats: {
        total_trades: trades.length,
        wins:         wins.length,
        losses:       losses.length,
        win_rate:     parseFloat(winRate.toFixed(1)),
        avg_win:      parseFloat(avgWin.toFixed(3)),
        avg_loss:     parseFloat(avgLoss.toFixed(3)),
        total_pnl:    parseFloat(totalPnl.toFixed(2)),
        expectancy:   parseFloat(expectancy.toFixed(3)),
        profit_factor: losses.length > 0 ? parseFloat((Math.abs(wins.reduce((a,b) => a+b.pnl_pct,0)) / Math.abs(losses.reduce((a,b) => a+b.pnl_pct,0))).toFixed(2)) : 999
      },
      trades: trades.slice(-20) // last 20 trades
    });
  } catch(e) {
    return err('Backtest failed: ' + e.message);
  }
}

/* ============================================================
   STATUS — Health check
============================================================ */
async function handleStatus(request, env) {
  try {
    const candleCount  = await env.DB.prepare(`SELECT COUNT(*) as c FROM candles`).first();
    const coinCount    = await env.DB.prepare(`SELECT COUNT(*) as c FROM coins WHERE active=1`).first();
    const lastCollect  = await env.DB.prepare(`SELECT * FROM collection_log ORDER BY ts DESC LIMIT 1`).first();
    const screenerCount= await env.DB.prepare(`SELECT COUNT(*) as c FROM screener_results`).first();

    return ok({
      status:   'healthy',
      database: 'exnexus-data',
      candles:  candleCount?.c || 0,
      coins:    coinCount?.c   || 0,
      screener_results: screenerCount?.c || 0,
      last_collection:  lastCollect ? new Date(lastCollect.ts).toISOString() : 'never',
      indicators: ['RSI','EMA','SMA','MACD','Bollinger Bands','ATR','Stochastic RSI','Volume Ratio'],
      timeframes: TIMEFRAMES,
      version: '1.0.0'
    });
  } catch(e) {
    return ok({ status: 'initializing — run /init first' });
  }
}


/* ============================================================
   CANDLESTICK PATTERN ENGINE
   Detects 20+ patterns including Doji family
============================================================ */

// ── Doji Family ───────────────────────────────────────────────

// Standard Doji — open ≈ close, indecision
function isDoji(o, h, l, c) {
    const bodySize  = Math.abs(c - o);
    const totalSize = h - l;
    if(totalSize === 0) return false;
    return bodySize / totalSize < 0.1; // body < 10% of total range
}

// Dragonfly Doji — open ≈ close ≈ high, long lower shadow
// Bullish reversal signal at bottom of downtrend
function isDragonfly(o, h, l, c) {
    const bodySize    = Math.abs(c - o);
    const totalSize   = h - l;
    const upperShadow = h - Math.max(o, c);
    const lowerShadow = Math.min(o, c) - l;
    if(totalSize === 0) return false;
    return (
        bodySize / totalSize < 0.1 &&      // tiny body
        upperShadow / totalSize < 0.05 &&  // almost no upper shadow
        lowerShadow / totalSize > 0.6      // long lower shadow (60%+)
    );
}

// Gravestone Doji — open ≈ close ≈ low, long upper shadow
// Bearish reversal signal at top of uptrend
function isGravestone(o, h, l, c) {
    const bodySize    = Math.abs(c - o);
    const totalSize   = h - l;
    const upperShadow = h - Math.max(o, c);
    const lowerShadow = Math.min(o, c) - l;
    if(totalSize === 0) return false;
    return (
        bodySize / totalSize < 0.1 &&      // tiny body
        lowerShadow / totalSize < 0.05 &&  // almost no lower shadow
        upperShadow / totalSize > 0.6      // long upper shadow (60%+)
    );
}

// Long-Legged Doji — equal long upper and lower shadows
// Maximum indecision — big move coming
function isLongLeggedDoji(o, h, l, c) {
    const bodySize    = Math.abs(c - o);
    const totalSize   = h - l;
    const upperShadow = h - Math.max(o, c);
    const lowerShadow = Math.min(o, c) - l;
    if(totalSize === 0) return false;
    return (
        bodySize / totalSize < 0.1 &&
        upperShadow / totalSize > 0.35 &&
        lowerShadow / totalSize > 0.35
    );
}

// ── Single Candle Patterns ────────────────────────────────────

// Hammer — small body at top, long lower shadow
// Bullish reversal after downtrend
function isHammer(o, h, l, c) {
    const bodySize    = Math.abs(c - o);
    const totalSize   = h - l;
    const upperShadow = h - Math.max(o, c);
    const lowerShadow = Math.min(o, c) - l;
    if(totalSize === 0) return false;
    return (
        bodySize / totalSize > 0.1 &&
        bodySize / totalSize < 0.35 &&
        lowerShadow >= bodySize * 2 &&
        upperShadow <= bodySize * 0.5
    );
}

// Inverted Hammer — small body at bottom, long upper shadow
// Bullish reversal signal
function isInvertedHammer(o, h, l, c) {
    const bodySize    = Math.abs(c - o);
    const totalSize   = h - l;
    const upperShadow = h - Math.max(o, c);
    const lowerShadow = Math.min(o, c) - l;
    if(totalSize === 0) return false;
    return (
        bodySize / totalSize > 0.1 &&
        bodySize / totalSize < 0.35 &&
        upperShadow >= bodySize * 2 &&
        lowerShadow <= bodySize * 0.5
    );
}

// Shooting Star — like inverted hammer but at TOP of uptrend
// Bearish reversal signal
function isShootingStar(o, h, l, c, prevClose) {
    return isInvertedHammer(o, h, l, c) && c < prevClose; // bearish close
}

// Marubozu — no shadows, full body candle
// Strong momentum in direction of candle
function isMarubozu(o, h, l, c) {
    const bodySize  = Math.abs(c - o);
    const totalSize = h - l;
    if(totalSize === 0) return false;
    return bodySize / totalSize > 0.95; // almost all body
}

// Spinning Top — small body, long shadows both sides
// Indecision / potential reversal
function isSpinningTop(o, h, l, c) {
    const bodySize    = Math.abs(c - o);
    const totalSize   = h - l;
    const upperShadow = h - Math.max(o, c);
    const lowerShadow = Math.min(o, c) - l;
    if(totalSize === 0) return false;
    return (
        bodySize / totalSize < 0.3 &&
        upperShadow / totalSize > 0.25 &&
        lowerShadow / totalSize > 0.25
    );
}

// ── Two Candle Patterns ───────────────────────────────────────

// Bullish Engulfing — bearish candle fully engulfed by bullish
// Strong bullish reversal signal
function isBullishEngulfing(o1, c1, o2, c2) {
    const firstBearish  = c1 < o1;
    const secondBullish = c2 > o2;
    return firstBearish && secondBullish && o2 < c1 && c2 > o1;
}

// Bearish Engulfing — bullish candle fully engulfed by bearish
// Strong bearish reversal signal
function isBearishEngulfing(o1, c1, o2, c2) {
    const firstBullish = c1 > o1;
    const secondBearish = c2 < o2;
    return firstBullish && secondBearish && o2 > c1 && c2 < o1;
}

// Tweezer Bottom — two candles with same low
// Bullish reversal at support
function isTweezerBottom(l1, l2, c1, c2) {
    return Math.abs(l1 - l2) / Math.max(l1, l2) < 0.001 && c2 > c1;
}

// Tweezer Top — two candles with same high
// Bearish reversal at resistance
function isTweezerTop(h1, h2, c1, c2) {
    return Math.abs(h1 - h2) / Math.max(h1, h2) < 0.001 && c2 < c1;
}

// Piercing Pattern — bearish then bullish that closes above midpoint
// Bullish reversal
function isPiercing(o1, c1, o2, c2) {
    const firstBearish  = c1 < o1;
    const secondBullish = c2 > o2;
    const midpoint      = (o1 + c1) / 2;
    return firstBearish && secondBullish && o2 < c1 && c2 > midpoint && c2 < o1;
}

// Dark Cloud Cover — bullish then bearish that closes below midpoint
// Bearish reversal
function isDarkCloud(o1, c1, o2, c2) {
    const firstBullish = c1 > o1;
    const secondBearish = c2 < o2;
    const midpoint = (o1 + c1) / 2;
    return firstBullish && secondBearish && o2 > c1 && c2 < midpoint && c2 > o1;
}

// ── Three Candle Patterns ─────────────────────────────────────

// Morning Star — bearish, small body, bullish
// Strong bullish reversal
function isMorningStar(o1,c1, o2,c2, o3,c3) {
    const firstBearish  = c1 < o1;
    const thirdBullish  = c3 > o3;
    const smallMiddle   = Math.abs(c2-o2) < Math.abs(c1-o1) * 0.3;
    const gapDown       = Math.max(o2,c2) < c1;
    const recovery      = c3 > (o1 + c1) / 2;
    return firstBearish && thirdBullish && smallMiddle && recovery;
}

// Evening Star — bullish, small body, bearish
// Strong bearish reversal
function isEveningStar(o1,c1, o2,c2, o3,c3) {
    const firstBullish  = c1 > o1;
    const thirdBearish  = c3 < o3;
    const smallMiddle   = Math.abs(c2-o2) < Math.abs(c1-o1) * 0.3;
    const decline       = c3 < (o1 + c1) / 2;
    return firstBullish && thirdBearish && smallMiddle && decline;
}

// Three White Soldiers — three consecutive bullish candles
// Strong uptrend continuation
function isThreeWhiteSoldiers(o1,c1, o2,c2, o3,c3) {
    return c1>o1 && c2>o2 && c3>o3 &&
           c2>c1 && c3>c2 &&
           o2>o1 && o2<c1 &&
           o3>o2 && o3<c2;
}

// Three Black Crows — three consecutive bearish candles
// Strong downtrend continuation
function isThreeBlackCrows(o1,c1, o2,c2, o3,c3) {
    return c1<o1 && c2<o2 && c3<o3 &&
           c2<c1 && c3<c2 &&
           o2<o1 && o2>c1 &&
           o3<o2 && o3>c2;
}

// ── Master Pattern Detector ───────────────────────────────────
// Scans candles array and returns all detected patterns

function detectPatterns(candles) {
    const patterns = [];

    for(let i = 2; i < candles.length; i++) {
        const [c3, c2, c1] = [candles[i-2], candles[i-1], candles[i]]; // c1 = most recent
        const detected = [];

        // ── Single candle patterns ────────────────────────────
        if(isDragonfly(c1.open, c1.high, c1.low, c1.close)) {
            detected.push({ pattern:'Dragonfly Doji', type:'bullish', strength:85,
                desc:'Long lower shadow, open≈close≈high. Strong bullish reversal signal.' });
        }
        if(isGravestone(c1.open, c1.high, c1.low, c1.close)) {
            detected.push({ pattern:'Gravestone Doji', type:'bearish', strength:85,
                desc:'Long upper shadow, open≈close≈low. Strong bearish reversal signal.' });
        }
        if(isLongLeggedDoji(c1.open, c1.high, c1.low, c1.close)) {
            detected.push({ pattern:'Long-Legged Doji', type:'neutral', strength:70,
                desc:'Equal long shadows both sides. Maximum indecision — big move coming.' });
        }
        if(isDoji(c1.open, c1.high, c1.low, c1.close) &&
           !isDragonfly(c1.open, c1.high, c1.low, c1.close) &&
           !isGravestone(c1.open, c1.high, c1.low, c1.close)) {
            detected.push({ pattern:'Doji', type:'neutral', strength:65,
                desc:'Open equals close. Market indecision — watch for breakout direction.' });
        }
        if(isHammer(c1.open, c1.high, c1.low, c1.close)) {
            detected.push({ pattern:'Hammer', type:'bullish', strength:75,
                desc:'Long lower shadow after downtrend. Buyers stepping in at lows.' });
        }
        if(isInvertedHammer(c1.open, c1.high, c1.low, c1.close)) {
            detected.push({ pattern:'Inverted Hammer', type:'bullish', strength:65,
                desc:'Long upper shadow. Buyers tried to push higher — potential reversal.' });
        }
        if(isShootingStar(c1.open, c1.high, c1.low, c1.close, c2.close)) {
            detected.push({ pattern:'Shooting Star', type:'bearish', strength:80,
                desc:'Long upper shadow at top of uptrend. Sellers rejected higher prices.' });
        }
        if(isMarubozu(c1.open, c1.high, c1.low, c1.close)) {
            const type = c1.close > c1.open ? 'bullish' : 'bearish';
            detected.push({ pattern:'Marubozu', type, strength:75,
                desc:`Full body candle, no shadows. Strong ${type} momentum.` });
        }
        if(isSpinningTop(c1.open, c1.high, c1.low, c1.close)) {
            detected.push({ pattern:'Spinning Top', type:'neutral', strength:55,
                desc:'Small body, long shadows. Market indecision — potential reversal.' });
        }

        // ── Two candle patterns ───────────────────────────────
        if(isBullishEngulfing(c2.open, c2.close, c1.open, c1.close)) {
            detected.push({ pattern:'Bullish Engulfing', type:'bullish', strength:88,
                desc:'Bullish candle fully engulfs previous bearish. Strong reversal signal.' });
        }
        if(isBearishEngulfing(c2.open, c2.close, c1.open, c1.close)) {
            detected.push({ pattern:'Bearish Engulfing', type:'bearish', strength:88,
                desc:'Bearish candle fully engulfs previous bullish. Strong reversal signal.' });
        }
        if(isTweezerBottom(c2.low, c1.low, c2.close, c1.close)) {
            detected.push({ pattern:'Tweezer Bottom', type:'bullish', strength:72,
                desc:'Two candles share same low. Strong support level confirmed.' });
        }
        if(isTweezerTop(c2.high, c1.high, c2.close, c1.close)) {
            detected.push({ pattern:'Tweezer Top', type:'bearish', strength:72,
                desc:'Two candles share same high. Strong resistance level confirmed.' });
        }
        if(isPiercing(c2.open, c2.close, c1.open, c1.close)) {
            detected.push({ pattern:'Piercing Pattern', type:'bullish', strength:76,
                desc:'Bullish close above midpoint of previous bearish candle.' });
        }
        if(isDarkCloud(c2.open, c2.close, c1.open, c1.close)) {
            detected.push({ pattern:'Dark Cloud Cover', type:'bearish', strength:76,
                desc:'Bearish close below midpoint of previous bullish candle.' });
        }

        // ── Three candle patterns ─────────────────────────────
        if(isMorningStar(c3.open,c3.close, c2.open,c2.close, c1.open,c1.close)) {
            detected.push({ pattern:'Morning Star', type:'bullish', strength:92,
                desc:'Three-candle bullish reversal. One of the strongest buy signals.' });
        }
        if(isEveningStar(c3.open,c3.close, c2.open,c2.close, c1.open,c1.close)) {
            detected.push({ pattern:'Evening Star', type:'bearish', strength:92,
                desc:'Three-candle bearish reversal. One of the strongest sell signals.' });
        }
        if(isThreeWhiteSoldiers(c3.open,c3.close, c2.open,c2.close, c1.open,c1.close)) {
            detected.push({ pattern:'Three White Soldiers', type:'bullish', strength:85,
                desc:'Three consecutive bullish candles. Strong uptrend confirmation.' });
        }
        if(isThreeBlackCrows(c3.open,c3.close, c2.open,c2.close, c1.open,c1.close)) {
            detected.push({ pattern:'Three Black Crows', type:'bearish', strength:85,
                desc:'Three consecutive bearish candles. Strong downtrend confirmation.' });
        }

        if(detected.length > 0) {
            patterns.push({
                index:    i,
                ts:       c1.ts,
                price:    c1.close,
                patterns: detected
            });
        }
    }

    return patterns;
}

/* ============================================================
   HELPERS
============================================================ */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function tfToMs(tf) {
  const map = { '1m':60000, '5m':300000, '15m':900000, '1h':3600000, '4h':14400000, '1d':86400000 };
  return map[tf] || 3600000;
}
