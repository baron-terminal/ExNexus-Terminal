function launch() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('terminal-screen').classList.remove('hidden');
    
    if (window.lucide) {
        window.lucide.createIcons();
    }

    new TradingView.widget({
        "autosize": true,
        "symbol": "BYBIT:BTCUSDT",
        "interval": "30",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#0a0e12",
        "enable_publishing": false,
        "withdateranges": true,
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "container_id": "tv-container",
        "details": false,
        "hotlist": false,
        "calendar": false,
        "save_image": false,
        "studies": [
            "Volume@tv-basicstudies"
        ]
    });
}
