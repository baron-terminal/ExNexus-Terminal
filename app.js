window.onload = function() {
    // Small timeout to ensure the div is ready
    setTimeout(() => {
        if (typeof TradingView !== 'undefined') {
            new TradingView.widget({
                "autosize": true,
                "symbol": "BYBIT:BTCUSDT",
                "interval": "60",
                "theme": "dark",
                "style": "1",
                "container_id": "tv-single-chart",
                "hide_top_toolbar": false,
                "overrides": {
                    "mainSeriesProperties.candleStyle.upColor": "#00b15d",
                    "mainSeriesProperties.candleStyle.borderUpColor": "#00b15d"
                }
            });
        }
    }, 200);
};
