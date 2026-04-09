let currentCharts = 4;

// This function will now run no matter what is typed
function authenticate() {
    const loginScreen = document.getElementById('login-screen');
    const terminal = document.getElementById('terminal-screen');

    if (loginScreen && terminal) {
        // 1. Hide Login and Show Terminal
        loginScreen.style.display = 'none';
        terminal.classList.remove('opacity-0');
        terminal.style.opacity = '1';

        // 2. Load Icons
        if (window.lucide) window.lucide.createIcons();

        // 3. Force Chart Initialization
        setTimeout(() => {
            updateLayout(currentCharts);
        }, 100);
    }
}

function updateLayout(count) {
    currentCharts = count;
    const grid = document.getElementById('tv-layout-grid');
    if (!grid) return;

    grid.innerHTML = '';
    // Fix grid columns based on count
    grid.className = flex-1 grid gap-[1px] bg-[#1c2024] ${count === 1 ? 'grid-cols-1' : 'grid-cols-2'};

    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.id = tv-c${i};
        div.className = "bg-black w-full h-full";
        grid.appendChild(div);
    }

    // Initialize TradingView with Unified Green
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
        }
    }, 200);
}
