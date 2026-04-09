window.onload = function() {
    setTimeout(() => { loadChart(1); }, 200);
};

function loadChart(count) {
    const container = document.getElementById('tv-chart-container');
    if (!container) return;
    container.innerHTML = '';
    
    let gridStyle = count === 1 ? "grid-cols-1" : "grid-cols-2 grid-rows-2";
    container.className = flex-1 grid gap-[1px] bg-[#1c2024] h-full w-full ${gridStyle};

    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.id = chart-v${i};
        div.className = "bg-black w-full h-full";
        container.appendChild(div);
        
        if (typeof TradingView !== 'undefined') {
            new TradingView.widget({
                "autosize": true,
                "symbol": "BYBIT:BTCUSDT",
                "interval": "60",
                "theme": "dark",
                "container_id": chart-v${i},
                "overrides": {
                    "mainSeriesProperties.candleStyle.upColor": "#00b15d",
                    "mainSeriesProperties.candleStyle.borderUpColor": "#00b15d"
                }
            });
        }
    }
}
