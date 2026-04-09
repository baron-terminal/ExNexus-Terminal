function initCharts() {
    const containers = ['tv-1', 'tv-2', 'tv-3', 'tv-4'];
    
    containers.forEach(id => {
        if (typeof TradingView !== 'undefined') {
            new TradingView.widget({
                "autosize": true,
                "symbol": "BYBIT:BTCUSDT",
                "interval": "60",
                "theme": "dark",
                "container_id": id,
                "overrides": {
                    "mainSeriesProperties.candleStyle.upColor": "#00b15d",
                    "mainSeriesProperties.candleStyle.borderUpColor": "#00b15d",
                    "mainSeriesProperties.candleStyle.wickUpColor": "#00b15d"
                }
            });
        }
    });
}
