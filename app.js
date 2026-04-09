// COMPLETE app.js - REPAIR VERSION
let currentCharts = 4;
let tvWidgets = [];

function launch() {
    if (window.lucide) window.lucide.createIcons();
    initCharts(currentCharts);
}

function togglePrefs() {
    document.getElementById('prefs-modal').classList.toggle('hidden');
}

function updateLayout(count) {
    currentCharts = count;
    const grid = document.getElementById('tv-layout-grid');
    
    // Clear and Redraw Grid
    grid.innerHTML = '';
    grid.className = flex-1 grid gap-[1px] bg-[#1c2024] ${count === 1 ? 'grid-cols-1' : 'grid-cols-2'};
    
    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.id = tv-c${i};
        div.className = 'bg-black w-full h-full';
        grid.appendChild(div);
    }

    togglePrefs();
    // Delay to allow DOM update
    setTimeout(() => initCharts(count), 100);
}

function initCharts(count) {
    // Clear previous widget memory
    tvWidgets = [];
    
    for (let i = 1; i <= count; i++) {
        const widget = new TradingView.widget({
            "autosize": true,
            "symbol": "BYBIT:BTCUSDT",
            "interval": "30",
            "theme": "dark",
            "style": "1",
            "container_id": tv-c${i},
            "locale": "en",
            "toolbar_bg": "#0a0e12",
            "overrides": {
                "mainSeriesProperties.candleStyle.upColor": "#00b15d",
                "mainSeriesProperties.candleStyle.borderUpColor": "#00b15d",
                "mainSeriesProperties.candleStyle.wickUpColor": "#00b15d"
            }
        });
        tvWidgets.push(widget);
    }
}

launch();
