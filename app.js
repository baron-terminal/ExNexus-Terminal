// app.js - SECURE MULTI-CHART CORE
let currentCharts = 4;

function authenticate() {
    // Basic gate logic - can be expanded with real API checks
    const pass = document.getElementById('access-pass').value;
    if(pass.length > 0) {
        document.getElementById('login-screen').classList.add('hidden');
        const main = document.getElementById('terminal-screen');
        main.classList.remove('opacity-0');
        
        if (window.lucide) window.lucide.createIcons();
        
        // Ensure DOM is ready before injecting TV widgets
        setTimeout(() => updateLayout(currentCharts), 100);
    } else {
        alert("License Key Required");
    }
}

function togglePrefs() {
    document.getElementById('prefs-modal').classList.toggle('hidden');
}

function updateLayout(count) {
    currentCharts = count;
    const grid = document.getElementById('tv-layout-grid');
    grid.innerHTML = '';
    
    // Grid logic based on count
    if (count === 1) grid.className = "flex-1 grid grid-cols-1 bg-[#1c2024] gap-[1px]";
    else if (count === 2) grid.className = "flex-1 grid grid-cols-2 bg-[#1c2024] gap-[1px]";
    else grid.className = "flex-1 grid grid-cols-2 grid-rows-2 bg-[#1c2024] gap-[1px]";

    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.id = tv-c${i};
        div.className = "bg-black w-full h-full";
        grid.appendChild(div);
    }

    if (!document.getElementById('prefs-modal').classList.contains('hidden')) togglePrefs();
    
    // Initialize Widgets with Unified Green
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
    }, 50);
}
