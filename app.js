let currentCharts = 1; // Default to 1 chart

function authenticate() {
    const user = document.getElementById('user-id').value;
    const pass = document.getElementById('user-pass').value;

    if(user && pass) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('terminal-screen').style.display = 'flex';
        setTimeout(() => updateLayout(currentCharts), 200);
    } else {
        alert("Enter Credentials");
    }
}

function updateLayout(count) {
    const grid = document.getElementById('tv-layout-grid');
    grid.innerHTML = '';
    grid.className = flex-1 grid gap-[1px] bg-[#1c2024] grid-cols-1;

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
