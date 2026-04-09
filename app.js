[18:47, 9.4.2026] Dror: /* COMPLETE style.css - GREEN UNIFICATION */
body { 
    background: #000; 
    color: #fff; 
    margin: 0; 
    overflow: hidden; 
    font-family: 'Inter', sans-serif; 
    -webkit-font-smoothing: antialiased; 
}
.hidden { display: none; }

/* Global Green Accents */
.text-green-pro { color: #00b15d; }
.bg-green-pro { background: #00b15d; }
.border-green-pro { border-color: #00b15d; }

/* Prefs Options */
.pref-card { 
    border: 1px solid #2d343b; 
    border-radius: 4px; 
    padding: 12px; 
    text-align: center; 
    cursor: pointer;
    font-size: 10px;
    font-weight: bold;
    color: #848e9c;
    transition: all 0.2s ease;
}
.pref-card.active { 
    border-color: #00b15d; 
    background: rgba(0, 177, 93, 0.1); 
    color: #00b15d;
}
.pref-card:hover { border-color: #00b15d; color: #fff; }

/* Inputs */
input:focus { border-color: #00b15d !important; outline: none; }

/* Custom Scrollbars */
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb { background: #00b15d; border-radius: 10px; }
[18:47, 9.4.2026] Dror: קוד בריין
[18:48, 9.4.2026] Dror: // app.js - UNIFIED GREEN ENGINE
let currentCharts = 4;

function launch() {
    if (window.lucide) window.lucide.createIcons();
    initCharts(currentCharts);
}

function togglePrefs() {
    const modal = document.getElementById('prefs-modal');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) switchTab('layout');
}

function switchTab(tab) {
    const content = document.getElementById('prefs-content');
    // Clear styles
    document.getElementById('tab-layout').className = "hover:text-white cursor-pointer";
    document.getElementById('tab-charts').className = "hover:text-white cursor-pointer";
    
    if (tab === 'layout') {
        document.getElementById('tab-layout').className = "text-[#00b15d] border-b border-[#00b15d] pb-1 cursor-pointer";
        content.innerHTML = `
            <div class="text-[9px] font-bold text-gray-500 uppercase mb-4">Order Panel Side</div>
            <div class="grid grid-cols-2 gap-4">
                <div class="pref-card active" id="side-right" onclick="setPanelSide('right')">Right</div>
                <div class="pref-card" id="side-left" onclick="setPanelSide('left')">Left</div>
            </div>`;
    } else if (tab === 'charts') {
        document.getElementById('tab-charts').className = "text-[#00b15d] border-b border-[#00b15d] pb-1 cursor-pointer";
        content.innerHTML = `
            <div class="text-[9px] font-bold text-gray-500 uppercase mb-4">Multi-Chart Configuration</div>
            <div class="grid grid-cols-4 gap-2">
                ${[1,2,4,5].map(n => <div class="pref-card ${n===currentCharts?'active':''}" onclick="updateLayout(${n})">${n} Charts</div>).join('')}
            </div>`;
    }
}

function setPanelSide(side) {
    const container = document.getElementById('main-container');
    document.getElementById('side-right').classList.remove('active');
    document.getElementById('side-left').classList.remove('active');
    document.getElementById(side-${side}).classList.add('active');
    
    if (side === 'left') container.classList.add('flex-row-reverse');
    else container.classList.remove('flex-row-reverse');
}

function updateLayout(count) {
    currentCharts = count;
    const grid = document.getElementById('tv-layout-grid');
    grid.className = flex-1 grid gap-[1px] bg-[#1c2024] grid-cols-${count > 2 ? 2 : count};
    grid.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.id = tv-c${i};
        div.className = 'bg-black relative';
        grid.appendChild(div);
    }
    initCharts(count);
    switchTab('charts'); // Refresh active state
}

function initCharts(count) {
    for (let i = 1; i <= count; i++) {
        new TradingView.widget({
            "autosize": true,
            "symbol": "BYBIT:BTCUSDT",
            "interval": "30",
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

launch();
