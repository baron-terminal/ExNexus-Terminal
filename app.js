// Simple, direct initialization for a single stable container
window.onload = function() {
    setTimeout(() => {
        if (typeof TradingView !== 'undefined') {
            new TradingView.widget({
                "autosize": true,
                "symbol": "BYBIT:BTCUSDT",
                "interval": "60",
                "theme": "dark",
                "style": "1",
                "locale": "en",
                "container_id": "tv-main-chart",
                "hide_side_toolbar": false,
                "allow_symbol_change": true,
                "save_image": false,
                "overrides": {
                    "mainSeriesProperties.candleStyle.upColor": "#00b15d",
                    "mainSeriesProperties.candleStyle.borderUpColor": "#00b15d",
                    "mainSeriesProperties.candleStyle.wickUpColor": "#00b15d"
                }
            });
        }
    }, 300); // 0.3s delay to ensure HTML is ready
};
