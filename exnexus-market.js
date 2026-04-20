export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;
    const CORS = { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' };
    if(request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    if(path === '/oi')           return handleOI(url, CORS);
    if(path === '/funding')      return handleFunding(url, CORS);
    if(path === '/ls')           return handleLS(url, CORS);
    if(path === '/liquidations') return handleLiquidations(url, CORS);
    if(path === '/whales')       return handleWhales(url, CORS);
    if(path === '/trending')     return handleTrending(CORS);
    if(path === '/categories')   return handleCategories(CORS);
    if(path === '/gainers')      return handleGainers(CORS);
    if(path === '/onchain')      return handleOnChain(url, CORS);
    if(path === '/etf')          return handleETF(CORS);
    if(path === '/sentiment')    return handleSentiment(url, CORS);

    return new Response(JSON.stringify({
      ok: true, service: 'ExNexus Market Intelligence',
      routes: ['/oi','/funding','/ls','/liquidations','/whales',
               '/trending','/categories','/gainers','/onchain','/etf','/sentiment']
    }), { headers: CORS });
  }
};

/* ============================================================
   MARKET INTELLIGENCE — Free Exchange + Public APIs
============================================================ */
// Open Interest — Binance + Bybit
async function handleOI(url, CORS) {
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  try {
    const [binRes, bybitRes] = await Promise.allSettled([
      fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`),
      fetch(`https://api.bybit.com/v5/market/open-interest?category=linear&symbol=${symbol}&intervalTime=5min&limit=1`)
    ]);

    const binOI  = binRes.status === 'fulfilled' ? await binRes.value.json() : null;
    const bybitOI = bybitRes.status === 'fulfilled' ? await bybitRes.value.json() : null;

    // OI History from Binance
    const histRes = await fetch(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=24`);
    const hist = histRes.ok ? await histRes.json() : [];

    return new Response(JSON.stringify({
      ok: true, symbol,
      binance: binOI ? { oi: parseFloat(binOI.openInterest), time: binOI.time } : null,
      bybit: bybitOI?.result?.list?.[0] ? {
        oi: parseFloat(bybitOI.result.list[0].openInterest),
        time: bybitOI.result.list[0].timestamp
      } : null,
      history_24h: hist.slice(-24).map(h => ({
        time: h.timestamp,
        oi: parseFloat(h.sumOpenInterest),
        oi_value: parseFloat(h.sumOpenInterestValue)
      })),
      trend: hist.length >= 2
        ? (parseFloat(hist[hist.length-1].sumOpenInterest) > parseFloat(hist[0].sumOpenInterest) ? 'rising' : 'falling')
        : 'unknown'
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ ok:false, error:e.message }), { headers: CORS });
  }
}

// Funding Rates — Binance + Bybit + Gate
async function handleFunding(url, CORS) {
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  try {
    const [binRes, bybitRes] = await Promise.allSettled([
      fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=8`),
      fetch(`https://api.bybit.com/v5/market/funding/history?category=linear&symbol=${symbol}&limit=8`)
    ]);

    const binFunding  = binRes.status === 'fulfilled' ? await binRes.value.json() : [];
    const bybitFunding = bybitRes.status === 'fulfilled' ? await bybitRes.value.json() : null;

    // Current funding rate
    const curRes = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`);
    const current = curRes.ok ? await curRes.json() : null;

    const currentRate = current ? parseFloat(current.lastFundingRate) * 100 : 0;
    const sentiment = currentRate > 0.05 ? 'very_bullish_longs_paying'
      : currentRate > 0.01 ? 'bullish'
      : currentRate < -0.05 ? 'very_bearish_shorts_paying'
      : currentRate < -0.01 ? 'bearish'
      : 'neutral';

    return new Response(JSON.stringify({
      ok: true, symbol,
      current_rate_pct: parseFloat(currentRate.toFixed(4)),
      sentiment,
      signal: currentRate < -0.05 ? 'extreme_negative_funding_long_opportunity'
             : currentRate > 0.1 ? 'extreme_positive_funding_short_opportunity'
             : 'normal',
      next_funding: current?.nextFundingTime,
      history: Array.isArray(binFunding) ? binFunding.slice(-8).map(f => ({
        time: f.fundingTime,
        rate_pct: parseFloat((parseFloat(f.fundingRate)*100).toFixed(4))
      })) : [],
      bybit_current: bybitFunding?.result?.list?.[0]
        ? parseFloat((parseFloat(bybitFunding.result.list[0].fundingRate)*100).toFixed(4))
        : null
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ ok:false, error:e.message }), { headers: CORS });
  }
}

// Long/Short Ratio — Binance
async function handleLS(url, CORS) {
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  const period = url.searchParams.get('period') || '1h';
  try {
    const [globalRes, topTraderRes, topPosRes] = await Promise.allSettled([
      fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=24`),
      fetch(`https://fapi.binance.com/futures/data/topLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=1`),
      fetch(`https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=${period}&limit=1`)
    ]);

    const global    = globalRes.status === 'fulfilled' ? await globalRes.value.json() : [];
    const topTrader = topTraderRes.status === 'fulfilled' ? await topTraderRes.value.json() : [];
    const topPos    = topPosRes.status === 'fulfilled' ? await topPosRes.value.json() : [];

    const latest = Array.isArray(global) && global.length > 0 ? global[global.length-1] : null;
    const lsRatio = latest ? parseFloat(latest.longShortRatio) : 1;

    return new Response(JSON.stringify({
      ok: true, symbol, period,
      current: {
        long_pct:  latest ? parseFloat((parseFloat(latest.longAccount)*100).toFixed(1)) : 50,
        short_pct: latest ? parseFloat((parseFloat(latest.shortAccount)*100).toFixed(1)) : 50,
        ratio: parseFloat(lsRatio.toFixed(3))
      },
      signal: lsRatio > 2 ? 'crowded_longs_caution'
             : lsRatio < 0.5 ? 'crowded_shorts_potential_squeeze'
             : 'balanced',
      top_traders: topTrader?.[0] ? {
        long_pct: parseFloat((parseFloat(topTrader[0].longAccount)*100).toFixed(1)),
        short_pct: parseFloat((parseFloat(topTrader[0].shortAccount)*100).toFixed(1))
      } : null,
      top_positions: topPos?.[0] ? {
        long_pct: parseFloat((parseFloat(topPos[0].longAccount)*100).toFixed(1)),
        short_pct: parseFloat((parseFloat(topPos[0].shortAccount)*100).toFixed(1))
      } : null,
      history: Array.isArray(global) ? global.slice(-24).map(g => ({
        time: g.timestamp,
        ratio: parseFloat(parseFloat(g.longShortRatio).toFixed(3)),
        long_pct: parseFloat((parseFloat(g.longAccount)*100).toFixed(1))
      })) : []
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ ok:false, error:e.message }), { headers: CORS });
  }
}

// Liquidations — Binance real-time
async function handleLiquidations(url, CORS) {
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  try {
    // Get recent liquidation orders from Binance
    const res = await fetch(`https://fapi.binance.com/fapi/v1/allForceOrders?symbol=${symbol}&limit=50`);
    const data = res.ok ? await res.json() : [];

    if(!Array.isArray(data)) return new Response(JSON.stringify({ ok:true, liquidations:[], total_value:0 }), { headers: CORS });

    const liquidations = data.map(l => ({
      time: l.time,
      side: l.side,
      price: parseFloat(l.averagePrice),
      qty: parseFloat(l.executedQty),
      value: parseFloat(l.averagePrice) * parseFloat(l.executedQty)
    }));

    const longLiqs  = liquidations.filter(l => l.side === 'SELL');
    const shortLiqs = liquidations.filter(l => l.side === 'BUY');
    const totalVal  = liquidations.reduce((a,b) => a + b.value, 0);

    return new Response(JSON.stringify({
      ok: true, symbol,
      total_liquidations: liquidations.length,
      total_value_usd: parseFloat(totalVal.toFixed(0)),
      long_liquidations: longLiqs.length,
      short_liquidations: shortLiqs.length,
      dominant: longLiqs.length > shortLiqs.length ? 'longs_liquidated' : 'shorts_liquidated',
      signal: totalVal > 10000000 ? 'high_liquidation_event'
             : totalVal > 1000000 ? 'moderate_liquidations'
             : 'normal',
      recent: liquidations.slice(-10)
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ ok:false, error:e.message }), { headers: CORS });
  }
}

// Whale Detection — large trades
async function handleWhales(url, CORS) {
  const symbol    = url.searchParams.get('symbol') || 'BTCUSDT';
  const threshold = parseFloat(url.searchParams.get('min') || '500000');
  try {
    const res = await fetch(`https://fapi.binance.com/fapi/v1/aggTrades?symbol=${symbol}&limit=500`);
    const trades = res.ok ? await res.json() : [];

    if(!Array.isArray(trades)) return new Response(JSON.stringify({ ok:true, whales:[] }), { headers: CORS });

    // Get current price
    const priceRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    const priceData = priceRes.ok ? await priceRes.json() : { price: '0' };
    const price = parseFloat(priceData.price);

    const whales = trades
      .map(t => ({
        time: t.T,
        side: t.m ? 'SELL' : 'BUY',
        price: parseFloat(t.p),
        qty: parseFloat(t.q),
        value: parseFloat(t.p) * parseFloat(t.q)
      }))
      .filter(t => t.value >= threshold)
      .sort((a,b) => b.value - a.value)
      .slice(0, 20);

    const buyVal  = whales.filter(w => w.side === 'BUY').reduce((a,b)=>a+b.value,0);
    const sellVal = whales.filter(w => w.side === 'SELL').reduce((a,b)=>a+b.value,0);

    return new Response(JSON.stringify({
      ok: true, symbol,
      threshold_usd: threshold,
      whale_trades: whales.length,
      buy_pressure_usd: parseFloat(buyVal.toFixed(0)),
      sell_pressure_usd: parseFloat(sellVal.toFixed(0)),
      bias: buyVal > sellVal * 1.2 ? 'whale_accumulation'
           : sellVal > buyVal * 1.2 ? 'whale_distribution'
           : 'balanced',
      largest_trades: whales.slice(0,5)
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ ok:false, error:e.message }), { headers: CORS });
  }
}

// CoinGecko — Trending coins (free)
async function handleTrending(CORS) {
  try {
    const res  = await fetch('https://api.coingecko.com/api/v3/search/trending');
    const data = res.ok ? await res.json() : null;
    if(!data) throw new Error('CoinGecko unavailable');

    return new Response(JSON.stringify({
      ok: true,
      trending: data.coins?.slice(0,10).map((c,i) => ({
        rank: i+1,
        name: c.item.name,
        symbol: c.item.symbol.toUpperCase(),
        market_cap_rank: c.item.market_cap_rank,
        score: c.item.score
      })) || [],
      nfts: data.nfts?.slice(0,3).map(n => ({ name: n.name, symbol: n.symbol })) || []
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ ok:false, error:e.message }), { headers: CORS });
  }
}

// CoinGecko — Market categories
async function handleCategories(CORS) {
  try {
    const res  = await fetch('https://api.coingecko.com/api/v3/coins/categories?order=market_cap_change_24h_desc');
    const data = res.ok ? await res.json() : null;
    if(!data) throw new Error('CoinGecko unavailable');

    const top = data.slice(0,10).map(c => ({
      name: c.name,
      change_24h: parseFloat(c.market_cap_change_24h?.toFixed(2) || 0),
      market_cap: c.market_cap,
      volume_24h: c.volume_24h
    }));

    const bullish = top.filter(c => c.change_24h > 2);
    const bearish = top.filter(c => c.change_24h < -2);

    return new Response(JSON.stringify({
      ok: true,
      top_categories: top,
      bullish_sectors: bullish.map(c=>c.name),
      bearish_sectors: bearish.map(c=>c.name),
      market_bias: bullish.length > bearish.length ? 'risk_on' : bearish.length > bullish.length ? 'risk_off' : 'mixed'
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ ok:false, error:e.message }), { headers: CORS });
  }
}

// CoinGecko — Top gainers/losers
async function handleGainers(CORS) {
  try {
    const res  = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=gecko_desc&per_page=50&page=1&price_change_percentage=24h&sparkline=false');
    const data = res.ok ? await res.json() : null;
    if(!data) throw new Error('CoinGecko unavailable');

    const sorted = [...data].sort((a,b) => (b.price_change_percentage_24h||0) - (a.price_change_percentage_24h||0));
    const gainers = sorted.slice(0,5).map(c=>({ symbol:c.symbol.toUpperCase(), name:c.name, change:parseFloat(c.price_change_percentage_24h?.toFixed(2)||0), price:c.current_price, mcap:c.market_cap }));
    const losers  = sorted.slice(-5).reverse().map(c=>({ symbol:c.symbol.toUpperCase(), name:c.name, change:parseFloat(c.price_change_percentage_24h?.toFixed(2)||0), price:c.current_price, mcap:c.market_cap }));

    return new Response(JSON.stringify({
      ok: true,
      gainers, losers,
      avg_change: parseFloat((data.reduce((a,b)=>a+(b.price_change_percentage_24h||0),0)/data.length).toFixed(2)),
      market_mood: gainers[0]?.change > 10 ? 'euphoric' : gainers[0]?.change > 5 ? 'bullish' : losers[0]?.change < -10 ? 'fearful' : 'neutral'
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ ok:false, error:e.message }), { headers: CORS });
  }
}

// Glassnode free — On-chain basics
async function handleOnChain(url, CORS) {
  const asset = url.searchParams.get('asset') || 'BTC';
  try {
    // Glassnode free tier endpoints
    const [addrRes, exchRes] = await Promise.allSettled([
      fetch(`https://api.glassnode.com/v1/metrics/addresses/active_count?a=${asset}&api_key=1111111111111111111111111111111111111111`),
      fetch(`https://api.glassnode.com/v1/metrics/distribution/exchange_net_position_change?a=${asset}&api_key=1111111111111111111111111111111111111111`)
    ]);

    // Note: Glassnode requires API key - using placeholder
    // Free tier gives daily data on Tier 1 metrics
    // For now return signal based on available data
    return new Response(JSON.stringify({
      ok: true, asset,
      note: 'Glassnode API key required for live data',
      mock_data: {
        active_addresses_trend: 'rising',
        exchange_outflow: 'net_outflow_bullish',
        signal: 'accumulation'
      },
      setup_required: 'Add GLASSNODE_KEY to Worker environment variables'
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ ok:false, error:e.message }), { headers: CORS });
  }
}

// ETF Flows — Bitcoin/Ethereum ETF data
async function handleETF(CORS) {
  try {
    // Use CoinGecko for ETF-related data (free)
    const res  = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false');
    const data = res.ok ? await res.json() : null;
    if(!data) throw new Error('unavailable');

    return new Response(JSON.stringify({
      ok: true,
      btc: {
        price: data.market_data?.current_price?.usd,
        change_24h: parseFloat(data.market_data?.price_change_percentage_24h?.toFixed(2)||0),
        market_cap: data.market_data?.market_cap?.usd,
        volume_24h: data.market_data?.total_volume?.usd,
        ath: data.market_data?.ath?.usd,
        ath_change_pct: parseFloat(data.market_data?.ath_change_percentage?.usd?.toFixed(2)||0)
      },
      note: 'Full ETF flow data available via SEC EDGAR or paid providers'
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ ok:false, error:e.message }), { headers: CORS });
  }
}

// Combined Market Sentiment Score
async function handleSentiment(url, CORS) {
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  try {
    // Fetch multiple signals in parallel
    const [fundRes, lsRes, oiRes] = await Promise.allSettled([
      fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${symbol}`),
      fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`),
      fetch(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=2`)
    ]);

    const funding = fundRes.status==='fulfilled' ? await fundRes.value.json() : null;
    const ls      = lsRes.status==='fulfilled' ? await lsRes.value.json() : [];
    const oi      = oiRes.status==='fulfilled' ? await oiRes.value.json() : [];

    // Fear & Greed
    const fngRes = await fetch('https://api.alternative.me/fng/?limit=1');
    const fng    = fngRes.ok ? await fngRes.json() : null;

    // Calculate composite sentiment score
    let score = 50;
    let signals = [];

    const fundRate = funding ? parseFloat(funding.lastFundingRate)*100 : 0;
    if(fundRate < -0.03) { score += 15; signals.push('negative_funding_bullish'); }
    else if(fundRate > 0.08) { score -= 10; signals.push('high_funding_caution'); }

    const lsData = Array.isArray(ls) && ls.length > 0 ? ls[0] : null;
    const lsRatio = lsData ? parseFloat(lsData.longShortRatio) : 1;
    if(lsRatio < 0.7) { score += 10; signals.push('shorts_crowded_squeeze_risk'); }
    else if(lsRatio > 2.5) { score -= 10; signals.push('longs_crowded_caution'); }

    const oiArr = Array.isArray(oi) ? oi : [];
    if(oiArr.length >= 2) {
      const oiChange = parseFloat(oiArr[1]?.sumOpenInterest||0) - parseFloat(oiArr[0]?.sumOpenInterest||0);
      if(oiChange > 0) { score += 5; signals.push('oi_rising'); }
      else { score -= 5; signals.push('oi_falling'); }
    }

    const fngVal = fng ? parseInt(fng.data[0].value) : 50;
    if(fngVal < 25) { score += 15; signals.push('extreme_fear_buy_zone'); }
    else if(fngVal > 75) { score -= 10; signals.push('extreme_greed_caution'); }

    score = Math.max(0, Math.min(100, score));

    return new Response(JSON.stringify({
      ok: true, symbol,
      sentiment_score: parseFloat(score.toFixed(0)),
      sentiment_label: score > 75 ? 'Very Bullish' : score > 60 ? 'Bullish' : score > 40 ? 'Neutral' : score > 25 ? 'Bearish' : 'Very Bearish',
      signals,
      components: {
        funding_rate_pct: parseFloat(fundRate.toFixed(4)),
        long_short_ratio: parseFloat(lsRatio.toFixed(3)),
        fear_greed: fngVal,
        fear_greed_label: fng?.data[0]?.value_classification || 'Unknown'
      },
      ai_summary: `Market sentiment for ${symbol}: Score ${score}/100. ` +
        `Funding ${fundRate > 0 ? '+' : ''}${fundRate.toFixed(3)}%, ` +
        `L/S ratio ${lsRatio.toFixed(2)}, ` +
        `F&G ${fngVal}/100. ` +
        signals.map(s=>s.replace(/_/g,' ')).join('. ') + '.'
    }), { headers: CORS });
  } catch(e) {
    return new Response(JSON.stringify({ ok:false, error:e.message }), { headers: CORS });
  }
}


