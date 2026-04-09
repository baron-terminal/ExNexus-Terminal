window.onload = function() {
    // Start with 1 chart immediately
    toggleLayout(1);
};

function toggleLayout(count) {
    const grid = document.getElementById('main-grid');
    
    // Switch the grid look
    if (count === 1) {
        grid.className = "flex-1 grid gap-[1px] bg-[#1c2024] grid-cols-1";
    } else {
        grid.className = "flex-1 grid gap-[1px] bg-[#1c2024] grid-cols-2 grid-rows-2";
    }

    // Show or hide the boxes and load charts
    for (let i = 1; i <= 4; i++) {
        const box = document.getElementById(chart-${i});
        if (i <= count) {
            box.classList.remove('hidden');
            // Only load the widget if the box is empty
            if (box.innerHTML === "") {
                new TradingView.widget({
                    "autosize": true,
                    "symbol": "BYBIT:BTCUSDT",
                    "interval": "60",
                    "theme": "dark",
                    "container_id": chart-${i},
                    "style": "1",
                    "overrides": { "mainSeriesProperties.candleStyle.upColor": "#00b15d" }
                });
            }
        } else {
            box.classList.add('hidden');
        }
    }
}
