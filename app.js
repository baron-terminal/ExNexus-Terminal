// ExNexus Core Logic
const proxyUrl = "https://exnexus-proxy.drorbaron18.workers.dev/";
let isSignUpMode = false;

// 1. AUTHENTICATION LOGIC
function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('auth-btn');
    const toggle = document.getElementById('auth-toggle');

    if(isSignUpMode) {
        title.innerText = "Create Account";
        btn.innerText = "Register & Enter";
        toggle.innerText = "Back to Login";
    } else {
        title.innerText = "Secure Terminal Access";
        btn.innerText = "Unlock Terminal";
        toggle.innerText = "Need an account? Sign Up";
    }
}

function handleAuth() {
    const user = document.getElementById('user-id').value.trim();
    const pass = document.getElementById('user-pass').value.trim();

    if (!user || !pass) {
        alert("Please enter both Username and Access Key");
        return;
    }

    if (isSignUpMode) {
        localStorage.setItem(nexus_user_${user}, pass);
        alert("Account Created! Now click 'Unlock' to enter.");
        toggleAuthMode();
    } else {
        const savedPass = localStorage.getItem(nexus_user_${user});
        // Backdoor for first-time setup
        if (savedPass === pass || (user === "admin" && pass === "nexus2026")) {
            enterApp();
        } else {
            alert("Invalid Credentials. If you haven't signed up, click 'Sign Up' below.");
        }
    }
}

function enterApp() {
    // Hide Login, Show Terminal
    document.getElementById('gatekeeper').classList.add('hidden');
    const wrapper = document.getElementById('terminal-wrapper');
    wrapper.classList.remove('opacity-0');
    wrapper.classList.add('opacity-100');
    
    // Start Systems
    initChart();
    updatePrice();
    setInterval(updatePrice, 3000);
}

// 2. MARKET DATA
async function updatePrice() {
    try {
        const res = await fetch('https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT');
        const data = await res.json();
        const price = parseFloat(data.result.list[0].lastPrice);
        const el = document.getElementById('btc-price');
        if(el) el.innerText = '$' + price.toLocaleString();
    } catch (e) { console.log("Price Feed Error"); }
}

// 3. CHART
function initChart() {
    if (typeof TradingView !== 'undefined') {
        new TradingView.widget({
            "autosize": true,
            "symbol": "BYBIT:BTCUSDT",
            "interval": "60",
            "theme": "dark",
            "style": "1",
            "container_id": "tradingview_chart"
        });
    }
}
