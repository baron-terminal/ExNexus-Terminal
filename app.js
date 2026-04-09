// Function to fetch the real price from Bybit
async function updateBybitPrice() {
    const symbol = 'BTCUSDT';
    try {
        const response = await fetch(https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol});
        const data = await response.json();
        const price = data.result.list[0].lastPrice;
        
        const priceElement = document.getElementById('btc-price');
        priceElement.innerText = '$' + parseFloat(price).toLocaleString();
        
        // Change color based on price movement (Simple version)
        priceElement.className = "font-mono font-bold text-green-400"; 
    } catch (error) {
        console.error("Brain Error: Could not reach Bybit", error);
    }
}

// Run the price update every 2 seconds
setInterval(updateBybitPrice, 2000);

// Initial run
updateBybitPrice();

// Space for future AltFINS / AI Logic
console.log("Brain.js is active and thinking...");
// Function to show/hide the API window
function toggleApiModal() {
    const modal = document.getElementById('api-modal');
    modal.classList.toggle('hidden');
}

// Function to save keys to the browser's "Local Storage"
function saveApiKeys() {
    const exchange = document.getElementById('ex-name').value;
    const key = document.getElementById('ex-key').value;
    const secret = document.getElementById('ex-secret').value;

    if (!key || !secret) {
        alert("Please enter both Key and Secret");
        return;
    }

    // Save data (This is like a mini-database in your browser)
    const apiData = { exchange, key, secret };
    localStorage.setItem('user_api_keys', JSON.stringify(apiData));

    alert("Keys Saved Locally! Your 'Mirror' is now preparing connection.");
    toggleApiModal(); // Close the window
    
    // Change the button text to show we are connected
    document.querySelector('header button').innerText = "Bybit Connected ✅";
    document.querySelector('header button').classList.replace('bg-blue-600', 'bg-green-600');
}

// Check if keys already exist when page loads
window.onload = function() {
    const savedKeys = localStorage.getItem('user_api_keys');
    if (savedKeys) {
        document.querySelector('header button').innerText = "Bybit Connected ✅";
        document.querySelector('header button').classList.replace('bg-blue-600', 'bg-green-600');
    }
}
