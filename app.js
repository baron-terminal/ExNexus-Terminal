let currentCharts = 1;

function authenticate() {
    const user = document.getElementById('user-id').value;
    const pass = document.getElementById('user-pass').value;

    if(user && pass) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('terminal-screen').style.display = 'flex';
        setTimeout(() => updateLayout(currentCharts), 200);
    } else {
        alert("Please enter credentials.");
    }
}

function updateLayout(count) {
    currentCharts = count;
    const grid = document.getElementById('tv-layout-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let gridCols = count === 1 ? "grid-cols-1" : "grid-cols-2";
    grid.className = flex-1 grid gap-[1px] bg-[#1c2024] ${gridCols};

    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.id = tv-c${i};
        div.className = "bg-black w-full h-full";
        grid.appendChild(div);
        
        new TradingView.widget({
            "autosize": true,
            "symbol": "BYBIT:BTCUSDT",
            "interval": "60",
            "theme": "dark",
            "container_id": tv-c${i},
            "overrides": {
                "mainSeriesProperties.candleStyle.upColor": "#00b15d",
                "mainSeriesProperties.candleStyle.borderUpColor": "#00b15d"
            }
        });
    }
}
