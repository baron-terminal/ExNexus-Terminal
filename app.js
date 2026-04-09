// COMPLETE CODE FOR app.js - FULL POWER MODE

function launch() {
    // 1. Transition from Login to Terminal
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('terminal-screen').classList.remove('hidden');
    
    // 2. Initialize the Advanced TradingView Widget
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
        "hide_side_toolbar": false, // Shows all drawing and measurement tools
        "allow_symbol_change": true,
        "save_image": true, // Allows you to take screenshots of your charts
        
        // --- 🟢 FULL TOOLSET ENABLED 🟢 ---
        "details": true,       // Shows symbol info/price on the right
        "hotlist": true,       // Shows top gainers/losers
        "calendar": true,      // Shows economic events
        "news": [              // Adds a news feed to the side panel
            "headlines"
        ],
        "show_popup_button": true,
        "popup_width": "1000",
        "popup_height": "650",
        
        // --- 🟢 USER CUSTOMIZATION ENABLED 🟢 ---
        "studies": [
            "Volume@tv-basicstudies" // Starts with volume, but lets you add any others
        ],
        "container_id": "tv-container"
    });
}
