const proxyUrl = "https://exnexus-proxy.drorbaron18.workers.dev/";

// 1. GATEKEEPER
function unlockTerminal() {
    const user = document.getElementById('user-id').value;
    const pass = document.getElementById('user-pass').value;

    if (user && pass) {
        document.getElementById('gatekeeper').style.display = 'none';
        const wrapper = document.getElementById('terminal-wrapper');
        wrapper.classList.replace('opacity-0', 'opacity-100');
        
        initChart();
        updatePrice();
        checkConnectionStatus();
        setInterval(updatePrice, 3000);
    } else {
        alert("Enter Credentials");
    }
}

// 2. PRICE FEED
async function updatePrice() {
    try {
        const res = await fetch('https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT');
        const data = await res.json();
        const price = parseFloat(data.result.list[0].lastPrice);
        document.getElementById('btc-price').innerText = '$' + price.toLocaleString();
    } catch (e) { console.log("Feed Error"); }
}

// 3. CHART
function initChart() {
    new TradingView.widget({
        "autosize": true,
        "symbol": "BYBIT:BTCUSDT",
        "interval": "60",
        "theme": "dark",
        "style": "1",
        "container_id": "tradingview_chart"
    });
}

// 4. API & UI STATUS
function toggleApiModal() { document.getElementById('api-modal').classList.toggle('hidden'); }

function saveApiKeys() {
    const key = document.getElementById('ex-key').value.trim();
    const secret = document.getElementById('ex-secret').value.trim();
    localStorage.setItem('user_api_keys', JSON.stringify({ key, secret }));
    toggleApiModal();
    checkConnectionStatus();
