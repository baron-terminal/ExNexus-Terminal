// app.js - EMERGENCY BYPASS VERSION
let currentCharts = 4;

function authenticate() {
    console.log("Attempting to initialize session..."); // Check console for this
    
    // EMERGENCY BYPASS: Forces the screen to hide regardless of input
    const loginScreen = document.getElementById('login-screen');
    const terminal = document.getElementById('terminal-screen');
    
    if (loginScreen && terminal) {
        loginScreen.style.display = 'none';
        terminal.classList.remove('opacity-0');
        terminal.style.opacity = '1';
        
        // Ensure icons and charts load
        if (window.lucide) window.lucide.createIcons();
        
        console.log("Loading charts...");
        setTimeout(() => updateLayout(currentCharts), 300);
    } else {
        console.error("Critical Error: HTML elements not found.");
    }
}

function updateLayout(count) {
    currentCharts = count;
    const grid = document.getElementById('tv-layout-grid');
    if (!grid) return;

    grid.innerHTML = '';
    grid.className = flex-1 grid gap-[1px] bg-[#1c2024] ${count === 1 ? 'grid-cols-1' : 'grid-cols-2'};

    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.id = tv-c${i};
        div.className = "bg-black w-full h-full";
        grid.appendChild(div);
    }

    // Load TradingView with the Unified Green Theme
    setTimeout(() => {
        if (typeof TradingView !== 'undefined') {
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
        } else {
            console.warn("TradingView library not loaded yet.");
        }
    }, 200);
}
