function launch() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('terminal-screen').classList.remove('hidden');
    
    if (window.lucide) {
        window.lucide.createIcons();
    }

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
        
        // --- 🟢 RESTORING THE MISSING INFO 🟢 ---
        "details": true,    // Restores the right-side price info
        "hotlist": true,    // Restores gainers/losers
        "calendar": true,   // Restores economic events
        "show_popup_button": true,
        "popup_width": "1000",
        "popup_height": "650"
    });
}
