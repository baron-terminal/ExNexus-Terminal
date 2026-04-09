window.onload = function() {
    // Starts with 1 chart by default as discussed
    updateLayout(1);
};

function updateLayout(count) {
    const grid = document.getElementById('tv-layout-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Set grid columns based on layout choice
    let gridStyle = "grid-cols-1";
    if (count === 2) gridStyle = "grid-cols-2";
    if (count === 4) gridStyle = "grid-cols-2 grid-rows-2";
    
    grid.className = flex-1 grid gap-[1px] bg-[#1c2024] ${gridStyle};

    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.id = tv-c${i};
        div.className = "bg-black w-full h-full";
        grid.appendChild(div);
        
        // Initialize TradingView Widgets
        new TradingView.widget({
            "autosize": true,
            "symbol": "BYBIT:BTCUSDT",
            "interval": "60",
            "theme": "dark",
            "container_id": tv-c${i},
            "style": "1",
            "locale": "en",
            "toolbar_bg": "#0a0e12",
            "overrides": {
                "mainSeriesProperties.candleStyle.upColor": "#00b15d",
                "mainSeriesProperties.candleStyle.borderUpColor": "#00b15d",
                "mainSeriesProperties.candleStyle.wickUpColor": "#00b15d"
            }
        });
    }
}
