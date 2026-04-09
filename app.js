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
