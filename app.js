function authenticate() {
    const user = document.getElementById('user-id').value;
    const pass = document.getElementById('user-pass').value;

    if(user && pass) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('terminal-screen').style.display = 'flex';
        initCharts();
    } else {
        alert("Enter Credentials");
    }
}

function initCharts() {
    const ids = ['tv-c1', 'tv-c2', 'tv-c3', 'tv-c4'];
    ids.forEach(id => {
        new TradingView.widget({
            "autosize": true,
            "symbol": "BYBIT:BTCUSDT",
            "interval": "60",
            "theme": "dark",
            "container_id": id,
            "overrides": {
                "mainSeriesProperties.candleStyle.upColor": "#00b15d",
                "mainSeriesProperties.candleStyle.borderUpColor": "#00b15d"
            }
        });
    });
}
