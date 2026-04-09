window.onload = function() {
    setTimeout(() => {
        if (typeof TradingView !== 'undefined') {
            new TradingView.widget({
                "autosize": true,
                "symbol": "BYBIT:BTCUSDT",
                "interval": "60",
                "theme": "dark",
                "style": "1",
                "container_id": "tv-main-chart",
                "hide_side_toolbar": false,
                "allow_symbol_change": true,
                "overrides": {
                    "mainSeriesProperties.candleStyle.upColor": "#00b15d",
                    "mainSeriesProperties.candleStyle.borderUpColor": "#00b15d"
                }
            });
        }
    }, 200);
};
