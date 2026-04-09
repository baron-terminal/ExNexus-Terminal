function launch() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('terminal-screen').classList.remove('hidden');
    
    new TradingView.widget({
        "autosize": true,
        "symbol": "BYBIT:BTCUSDT",
        "interval": "60",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "withdateranges": true,
        "hide_side_toolbar": false, /* Shows the tools */
        "allow_symbol_change": true,
        "details": true, /* Shows the Buy/Sell price details panel */
        "hotlist": true,
        "container_id": "tv-container"
    });
}
