let currentCharts = 1; // Default is now 1 chart as requested

function authenticate() {
    const u = document.getElementById('user-id').value;
    const p = document.getElementById('user-pass').value;

    if(u && p) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('terminal-screen').style.display = 'flex';
        setTimeout(() => updateLayout(currentCharts), 200);
    } else {
        alert("Credentials Required");
    }
}

function updateLayout(count) {
    currentCharts = count;
    const grid = document.getElementById('tv-layout-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Responsive grid columns
    let gridCols = "grid-cols-1";
    if (count === 2) gridCols = "grid-cols-2";
    if (count === 4) gridCols = "grid-cols-2 grid-rows-2";

    grid.className = flex-1 grid gap-[1px] bg-[#1c2024] ${gridCols};

    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.id = tv-c${i};
        div.className = "bg-black w-full h-full";
        grid.appendChild(div);
    }

    setTimeout(() => {
        for (let i = 1; i <= count; i++) {
            if (typeof TradingView !== 'undefined') {
                new TradingView.widget({
                    "autosize": true,
                    "symbol": "BYBIT:BTCUSDT",
                    "interval": "60",
                    "theme": "dark",
                    "container_id": tv-c${i},
                    "overrides": {
                        "mainSeriesProperties.candleStyle.upColor": "#00b15d",
                        "mainSeriesProperties.candleStyle.borderUpColor": "#00b15d",
                        "mainSeriesProperties.candleStyle.wickUpColor": "#00b15d"
                    }
                });
            }
        }
    }, 100);
}
