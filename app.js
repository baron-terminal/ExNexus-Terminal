// COMPLETE app.js
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
        "toolbar_bg": "#0a0e12",
        "enable_publishing": false,
        "withdateranges": true,
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "container_id": "tv-container",
        "library_path": "/charting_library/",
        "drawings_access": { type: 'black', tools: [{ name: "Regression Trend" }] },
        "enabled_features": ["study_templates"],
        "charts_storage_url": 'https://saveload.tradingview.com',
        "client_id": 'tradingview.com',
        "user_id": 'public_user_id'
    });
}
