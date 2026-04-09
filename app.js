let currentCharts = 4;

function authenticate() {
    const user = document.getElementById('user-id').value;
    const pass = document.getElementById('user-pass').value;

    // Login logic: proceeds if fields are filled
    if(user.length > 0 && pass.length > 0) {
        document.getElementById('login-screen').style.display = 'none';
        const terminal = document.getElementById('terminal-screen');
        terminal.classList.remove('opacity-0');
        terminal.style.opacity = '1';
        
        setTimeout(() => updateLayout(currentCharts), 200);
    } else {
        alert("Enter Credentials to Access Terminal");
    }
}

function updateLayout(count) {
    const grid = document.getElementById('tv-layout-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.id = tv-c${i};
        div.className = "bg-black w-full h-full";
        grid.appendChild(div);
    }

    setTimeout(() => {
        for (let i = 1; i <= count; i++) {
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
    }, 100);
}
