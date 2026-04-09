// app.js - DYNAMIC LOGIN & LAYOUT
let currentCharts = 4;

function authenticate() {
    const user = document.getElementById('user-id').value;
    const pass = document.getElementById('user-pass').value;

    if(user.length > 0 && pass.length > 0) {
        // Fade out login, reveal terminal
        document.getElementById('login-screen').style.display = 'none';
        const terminal = document.getElementById('terminal-screen');
        terminal.classList.remove('opacity-0');
        terminal.style.opacity = '1';
        
        document.getElementById('user-display').innerText = SESSION: ${user.toUpperCase()};
        
        if (window.lucide) window.lucide.createIcons();
        
        // Final layout render
        setTimeout(() => updateLayout(currentCharts), 200);
    } else {
        alert("Please enter both Username and Password.");
    }
}

function togglePrefs() {
    document.getElementById('prefs-modal').classList.toggle('hidden');
}

function updateLayout(count) {
    currentCharts = count;
    const grid = document.getElementById('tv-layout-grid');
    grid.innerHTML = '';
    
    // Grid geometry logic
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
    
    // Inject TradingView Widgets with Unified Green Theme
    setTimeout(() => {
        for (let i = 1; i <= count; i++) {
            new TradingView.widget({
                "autosize": true,
                "symbol": "BYBIT:BTCUSDT",
                "interval": "60",
                "theme": "dark",
                "container_id": tv-c${i},
                "style": "1",
                "overrides": {
                    "mainSeriesProperties.candleStyle.upColor": "#00b15d",
                    "mainSeriesProperties.candleStyle.borderUpColor": "#00b15d",
                    "mainSeriesProperties.candleStyle.wickUpColor": "#00b15d"
                }
            });
        }
    }, 100);
}
