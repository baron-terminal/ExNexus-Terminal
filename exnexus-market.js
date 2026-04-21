export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;
    const H    = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
    if(request.method === 'OPTIONS') return new Response(null, { headers: H });

    // ── Routes ────────────────────────────────────────────────
    if(path === '/trending')      return getTrending(H);
    if(path === '/gainers')       return getGainers(H);
    if(path === '/listings')      return getListings(url, H);
    if(path === '/dex/quotes')    return getDexQuotes(url, H);
    if(path === '/dex/pairs')     return getDexPairs(url, H);
    if(path === '/dex/networks')  return getDexNetworks(H);
    if(path === '/dex/history')   return getDexHistory(url, H);
    if(path === '/dex/trades')    return getDexTrades(url, H);
    if(path === '/global')        return getGlobal(H);
    if(path === '/sentiment')     return getSentiment(url, H);
    if(path === '/funding')       return getFunding(url, H);
    if(path === '/oi')            return getOI(url, H);
    if(path === '/ls')            return getLS(url, H);
    if(path === '/liquidations')  return getLiqs(url, H);
    if(path === '/whales')        return getWhales(url, H);
    if(path === '/categories')    return getCategories(H);
    if(path === '/coin')          return getCoin(url, H);

    return new Response(JSON.stringify({
      ok: true, service: 'ExNexus Market Intelligence v2',
      sources: ['CoinMarketCap API','Binance API','Bybit API'],
      routes: ['/trending','/gainers','/listings','/global','/categories','/coin',
               '/dex/quotes','/dex/pairs','/dex/networks','/dex/history','/dex/trades',
               '/sentiment','/funding','/oi','/ls','/liquidations','/whales']
    }), { headers: H });
  }
};

const CMC_KEY = 'c04da22f9d424843be9b76d4fd693bf8';
const CMC     = 'https://pro-api.coinmarketcap.com';
const CMC_H   = { 'X-CMC_PRO_API_KEY': CMC_KEY, 'Accept': 'application/json' };

// ── CMC Helpers ───────────────────────────────────────────────
async function cmcGet(endpoint, params = {}) {
  const qs  = new URLSearchParams(params).toString();
  const res = await fetch(`${CMC}${endpoint}${qs ? '?' + qs : ''}`, { headers: CMC_H });
  return res.json();
}

// ── Trending Coins ────────────────────────────────────────────
async function getTrending(H) {
  try {
    const data = await cmcGet('/v1/cryptocurrency/trending/gainers-losers', { limit: 10, time_period: '24h' });
    const coins = data.data || [];
    return new Response(JSON.stringify({
      ok: true,
      trending: coins.slice(0, 10).map(c => ({
        name:       c.name,
        symbol:     c.symbol,
        price:      c.quote?.USD?.price,
        change_24h: parseFloat(c.quote?.USD?.percent_change_24h?.toFixed(2) || 0),
        volume_24h: c.quote?.USD?.volume_24h,
        mcap:       c.quote?.USD?.market_cap,
        mcap_rank:  c.cmc_rank
      }))
    }), { headers: H });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H });
  }
}

// ── Top Gainers & Losers ──────────────────────────────────────
async function getGainers(H) {
  try {
    const data = await cmcGet('/v1/cryptocurrency/listings/latest', {
      limit: 100, sort: 'percent_change_24h', sort_dir: 'desc',
      convert: 'USD', aux: 'num_market_pairs,cmc_rank'
    });
    const coins = data.data || [];
    const gainers = coins.slice(0, 5).map(c => ({
      symbol:     c.symbol,
      name:       c.name,
      price:      c.quote?.USD?.price,
      change_24h: parseFloat(c.quote?.USD?.percent_change_24h?.toFixed(2) || 0),
      volume_24h: c.quote?.USD?.volume_24h,
      mcap_rank:  c.cmc_rank
    }));
    const losers = coins.slice(-5).reverse().map(c => ({
      symbol:     c.symbol,
      name:       c.name,
      price:      c.quote?.USD?.price,
      change_24h: parseFloat(c.quote?.USD?.percent_change_24h?.toFixed(2) || 0),
      volume_24h: c.quote?.USD?.volume_24h,
      mcap_rank:  c.cmc_rank
    }));
    return new Response(JSON.stringify({ ok: true, gainers, losers }), { headers: H });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H });
  }
}

// ── Full Market Listings ──────────────────────────────────────
async function getListings(url, H) {
  const limit  = url.searchParams.get('limit')  || 50;
  const start  = url.searchParams.get('start')  || 1;
  const filter = url.searchParams.get('filter') || 'market_cap';
  try {
    const data = await cmcGet('/v1/cryptocurrency/listings/latest', {
      limit, start, sort: filter, convert: 'USD'
    });
    return new Response(JSON.stringify({
      ok: true,
      total: data.status?.total_count,
      coins: (data.data || []).map(c => ({
        rank:       c.cmc_rank,
        symbol:     c.symbol,
        name:       c.name,
        price:      c.quote?.USD?.price,
        change_1h:  parseFloat(c.quote?.USD?.percent_change_1h?.toFixed(2)  || 0),
        change_24h: parseFloat(c.quote?.USD?.percent_change_24h?.toFixed(2) || 0),
        change_7d:  parseFloat(c.quote?.USD?.percent_change_7d?.toFixed(2)  || 0),
        volume_24h: c.quote?.USD?.volume_24h,
        mcap:       c.quote?.USD?.market_cap,
        circulating_supply: c.circulating_supply
      }))
    }), { headers: H });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H });
  }
}

// ── Global Market Metrics ─────────────────────────────────────
async function getGlobal(H) {
  try {
    const data = await cmcGet('/v1/global-metrics/quotes/latest', { convert: 'USD' });
    const d    = data.data || {};
    return new Response(JSON.stringify({
      ok: true,
      total_market_cap:    d.quote?.USD?.total_market_cap,
      total_volume_24h:    d.quote?.USD?.total_volume_24h,
      btc_dominance:       parseFloat(d.btc_dominance?.toFixed(2) || 0),
      eth_dominance:       parseFloat(d.eth_dominance?.toFixed(2) || 0),
      active_coins:        d.active_cryptocurrencies,
      active_exchanges:    d.active_exchanges,
      defi_volume_24h:     d.quote?.USD?.defi_volume_24h,
      defi_market_cap:     d.quote?.USD?.defi_market_cap,
      stablecoin_volume:   d.quote?.USD?.stablecoin_volume_24h,
      last_updated:        d.last_updated
    }), { headers: H });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H });
  }
}

// ── Market Categories ─────────────────────────────────────────
async function getCategories(H) {
  try {
    const data = await cmcGet('/v1/cryptocurrency/categories', { limit: 20 });
    const cats = (data.data || []).map(c => ({
      name:       c.name,
      coins:      c.num_tokens,
      avg_change: parseFloat(c.avg_price_change?.toFixed(2) || 0),
      market_cap: c.market_cap,
      volume_24h: c.volume
    })).sort((a, b) => b.avg_change - a.avg_change);
    const bullish = cats.filter(c => c.avg_change > 2).map(c => c.name);
    const bearish = cats.filter(c => c.avg_change < -2).map(c => c.name);
    return new Response(JSON.stringify({
      ok: true, categories: cats,
      bullish_sectors: bullish,
      bearish_sectors: bearish,
      market_bias: bullish.length > bearish.length ? 'risk_on' : bearish.length > bullish.length ? 'risk_off' : 'mixed'
    }), { headers: H });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H });
  }
}

// ── Single Coin Info ──────────────────────────────────────────
async function getCoin(url, H) {
  const symbol = url.searchParams.get('symbol') || 'BTC';
  try {
    const [quoteData, metaData] = await Promise.all([
      cmcGet('/v2/cryptocurrency/quotes/latest', { symbol, convert: 'USD' }),
      cmcGet('/v2/cryptocurrency/info', { symbol })
    ]);
    const coin = Object.values(quoteData.data || {})[0]?.[0];
    const meta = Object.values(metaData.data || {})[0]?.[0];
    if(!coin) return new Response(JSON.stringify({ ok: false, error: 'Coin not found' }), { headers: H });
    return new Response(JSON.stringify({
      ok: true,
      symbol:      coin.symbol,
      name:        coin.name,
      rank:        coin.cmc_rank,
      price:       coin.quote?.USD?.price,
      change_1h:   parseFloat(coin.quote?.USD?.percent_change_1h?.toFixed(2)  || 0),
      change_24h:  parseFloat(coin.quote?.USD?.percent_change_24h?.toFixed(2) || 0),
      change_7d:   parseFloat(coin.quote?.USD?.percent_change_7d?.toFixed(2)  || 0),
      volume_24h:  coin.quote?.USD?.volume_24h,
      market_cap:  coin.quote?.USD?.market_cap,
      circulating: coin.circulating_supply,
      max_supply:  coin.max_supply,
      description: meta?.description?.substring(0, 200),
      website:     meta?.urls?.website?.[0],
      logo:        meta?.logo
    }), { headers: H });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H });
  }
}

// ── DEX Listings & Quotes ─────────────────────────────────────
async function getDexQuotes(url, H) {
  const network = url.searchParams.get('network') || 'ethereum';
  const limit   = url.searchParams.get('limit')   || 20;
  try {
    const data = await cmcGet('/v4/dex/listings/quotes', {
      network_slug: network, limit, sort: 'volume_24h', sort_dir: 'desc'
    });
    return new Response(JSON.stringify({
      ok: true, network,
      pairs: (data.data || []).map(p => ({
        name:       p.name,
        address:    p.contract_address,
        price:      p.quote?.USD?.price,
        change_24h: parseFloat(p.quote?.USD?.percent_change_24h?.toFixed(2) || 0),
        volume_24h: p.quote?.USD?.volume_24h,
        liquidity:  p.quote?.USD?.liquidity
      }))
    }), { headers: H });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H });
  }
}

// ── DEX Networks ──────────────────────────────────────────────
async function getDexNetworks(H) {
  try {
    const data = await cmcGet('/v4/dex/networks/list', { limit: 30 });
    return new Response(JSON.stringify({
      ok: true,
      networks: (data.data || []).map(n => ({
        id:     n.id,
        name:   n.name,
        slug:   n.slug,
        volume: n.quote?.USD?.volume_24h
      }))
    }), { headers: H });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H });
  }
}

// ── DEX Pairs ─────────────────────────────────────────────────
async function getDexPairs(url, H) {
  const network = url.searchParams.get('network') || 'ethereum';
  const limit   = url.searchParams.get('limit')   || 20;
  try {
    const data = await cmcGet('/v4/dex/listings/info', {
      network_slug: network, limit
    });
    return new Response(JSON.stringify({
      ok: true, network,
      pairs: data.data || []
    }), { headers: H });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H });
  }
}

// ── DEX Historical OHLCV ──────────────────────────────────────
async function getDexHistory(url, H) {
  const address = url.searchParams.get('address');
  const network = url.searchParams.get('network') || 'ethereum';
  if(!address) return new Response(JSON.stringify({ ok: false, error: 'address required' }), { headers: H });
  try {
    const data = await cmcGet('/v4/dex/pairs/ohlcv/historical', {
      contract_address: address, network_slug: network,
      time_period: '1h', count: 24
    });
    return new Response(JSON.stringify({
      ok: true, address, network,
      candles: data.data || []
    }), { headers: H });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H });
  }
}

// ── DEX Latest Trades ─────────────────────────────────────────
async function getDexTrades(url, H) {
  const address = url.searchParams.get('address');
  const network = url.searchParams.get('network') || 'ethereum';
  if(!address) return new Response(JSON.stringify({ ok: false, error: 'address required' }), { headers: H });
  try {
    const data = await cmcGet('/v4/dex/pairs/trade/latest', {
      contract_address: address, network_slug: network
    });
    return new Response(JSON.stringify({
      ok: true, address, network,
      trades: data.data || []
    }), { headers: H });
  } catch(e) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H });
  }
}

// ── Exchange APIs (Binance/Bybit) ─────────────────────────────
async function getFunding(url, H) {
  const sym = url.searchParams.get('symbol') || 'BTCUSDT';
  try {
    const r = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=' + sym);
    const d = await r.json();
    const rate = parseFloat(d.lastFundingRate) * 100;
    return new Response(JSON.stringify({
      ok: true, symbol: sym,
      rate_pct: parseFloat(rate.toFixed(4)),
      sentiment: rate < -0.03 ? 'bearish_shorts_paying' : rate > 0.08 ? 'bullish_longs_paying' : 'neutral',
      next_funding: d.nextFundingTime
    }), { headers: H });
  } catch(e) { return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H }); }
}

async function getOI(url, H) {
  const sym = url.searchParams.get('symbol') || 'BTCUSDT';
  try {
    const [binRes, histRes] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=' + sym),
      fetch('https://fapi.binance.com/futures/data/openInterestHist?symbol=' + sym + '&period=1h&limit=24')
    ]);
    const bin  = await binRes.json();
    const hist = await histRes.json();
    return new Response(JSON.stringify({
      ok: true, symbol: sym,
      oi: parseFloat(bin.openInterest),
      history: Array.isArray(hist) ? hist.map(h => ({ time: h.timestamp, oi: parseFloat(h.sumOpenInterest) })) : [],
      trend: Array.isArray(hist) && hist.length >= 2
        ? parseFloat(hist[hist.length-1].sumOpenInterest) > parseFloat(hist[0].sumOpenInterest) ? 'rising' : 'falling'
        : 'unknown'
    }), { headers: H });
  } catch(e) { return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H }); }
}

async function getLS(url, H) {
  const sym = url.searchParams.get('symbol') || 'BTCUSDT';
  try {
    const r = await fetch('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=' + sym + '&period=1h&limit=1');
    const d = await r.json();
    const latest = Array.isArray(d) ? d[0] : null;
    return new Response(JSON.stringify({
      ok: true, symbol: sym,
      long_pct:  latest ? parseFloat((parseFloat(latest.longAccount)*100).toFixed(1))  : 50,
      short_pct: latest ? parseFloat((parseFloat(latest.shortAccount)*100).toFixed(1)) : 50,
      ratio:     latest ? parseFloat(parseFloat(latest.longShortRatio).toFixed(3))      : 1,
      signal:    latest && parseFloat(latest.longShortRatio) < 0.7 ? 'shorts_crowded'
               : latest && parseFloat(latest.longShortRatio) > 2.5 ? 'longs_crowded' : 'balanced'
    }), { headers: H });
  } catch(e) { return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H }); }
}

async function getLiqs(url, H) {
  const sym = url.searchParams.get('symbol') || 'BTCUSDT';
  try {
    const r = await fetch('https://fapi.binance.com/fapi/v1/allForceOrders?symbol=' + sym + '&limit=20');
    const d = await r.json();
    if(!Array.isArray(d)) return new Response(JSON.stringify({ ok: true, liquidations: [] }), { headers: H });
    const liqs = d.map(l => ({ time: l.time, side: l.side, price: parseFloat(l.averagePrice), value: parseFloat(l.averagePrice)*parseFloat(l.executedQty) }));
    return new Response(JSON.stringify({
      ok: true, symbol: sym,
      count: liqs.length,
      total_value: parseFloat(liqs.reduce((a,b)=>a+b.value,0).toFixed(0)),
      recent: liqs.slice(0, 5)
    }), { headers: H });
  } catch(e) { return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H }); }
}

async function getWhales(url, H) {
  const sym = url.searchParams.get('symbol') || 'BTCUSDT';
  const min = parseFloat(url.searchParams.get('min') || '500000');
  try {
    const [tradesRes, priceRes] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/aggTrades?symbol=' + sym + '&limit=500'),
      fetch('https://api.binance.com/api/v3/ticker/price?symbol=' + sym)
    ]);
    const trades = await tradesRes.json();
    if(!Array.isArray(trades)) return new Response(JSON.stringify({ ok: true, whales: [] }), { headers: H });
    const whales = trades.map(t => ({ side: t.m?'SELL':'BUY', price: parseFloat(t.p), value: parseFloat(t.p)*parseFloat(t.q) })).filter(t=>t.value>=min).sort((a,b)=>b.value-a.value).slice(0,10);
    const buyVal  = whales.filter(w=>w.side==='BUY').reduce((a,b)=>a+b.value,0);
    const sellVal = whales.filter(w=>w.side==='SELL').reduce((a,b)=>a+b.value,0);
    return new Response(JSON.stringify({
      ok: true, symbol: sym,
      count: whales.length,
      bias: buyVal > sellVal*1.2 ? 'accumulation' : sellVal > buyVal*1.2 ? 'distribution' : 'balanced',
      buy_usd: parseFloat(buyVal.toFixed(0)), sell_usd: parseFloat(sellVal.toFixed(0)),
      trades: whales.slice(0, 5)
    }), { headers: H });
  } catch(e) { return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H }); }
}

async function getSentiment(url, H) {
  const sym = url.searchParams.get('symbol') || 'BTCUSDT';
  try {
    const [fndRes, lsRes, fngRes, globalRes] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=' + sym),
      fetch('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=' + sym + '&period=1h&limit=1'),
      fetch('https://api.alternative.me/fng/?limit=1'),
      cmcGet('/v1/global-metrics/quotes/latest', { convert: 'USD' })
    ]);
    const fnd    = await fndRes.json();
    const ls     = await lsRes.json();
    const fng    = await fngRes.json();
    const global = globalRes.data || {};
    const rate   = parseFloat(fnd.lastFundingRate || 0) * 100;
    const lsRatio = Array.isArray(ls) && ls.length ? parseFloat(ls[0].longShortRatio) : 1;
    const fngVal  = parseInt(fng?.data?.[0]?.value || 50);
    const btcDom  = parseFloat(global.btc_dominance || 50);
    let score = 50, signals = [];
    if(rate < -0.03)     { score += 15; signals.push('negative_funding_bullish'); }
    else if(rate > 0.08) { score -= 10; signals.push('high_funding_caution'); }
    if(lsRatio < 0.7)    { score += 10; signals.push('shorts_crowded_squeeze_risk'); }
    else if(lsRatio > 2.5){ score -= 10; signals.push('longs_crowded_caution'); }
    if(fngVal < 25)      { score += 15; signals.push('extreme_fear_buy_zone'); }
    else if(fngVal > 75) { score -= 10; signals.push('extreme_greed_caution'); }
    if(btcDom > 55)      { score -= 5;  signals.push('btc_dominance_high_alts_weak'); }
    else if(btcDom < 45) { score += 5;  signals.push('btc_dominance_low_alts_strong'); }
    score = Math.max(0, Math.min(100, score));
    return new Response(JSON.stringify({
      ok: true, symbol: sym,
      score, label: score>75?'Very Bullish':score>60?'Bullish':score>40?'Neutral':score>25?'Bearish':'Very Bearish',
      signals,
      components: {
        funding_pct: parseFloat(rate.toFixed(4)),
        ls_ratio: parseFloat(lsRatio.toFixed(3)),
        fear_greed: fngVal,
        fear_greed_label: fng?.data?.[0]?.value_classification || 'Unknown',
        btc_dominance: parseFloat(btcDom.toFixed(2)),
        total_mcap: global.quote?.USD?.total_market_cap
      },
      ai_summary: `Score ${score}/100 — ${score>60?'Bullish':'Bearish'}. F&G ${fngVal}/100, funding ${rate.toFixed(3)}%, L/S ${lsRatio.toFixed(2)}, BTC dom ${btcDom.toFixed(1)}%. ${signals.map(s=>s.replace(/_/g,' ')).join('. ')}.`
    }), { headers: H });
  } catch(e) { return new Response(JSON.stringify({ ok: false, error: e.message }), { headers: H }); }
}
