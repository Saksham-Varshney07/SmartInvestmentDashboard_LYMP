function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
        tab.classList.remove('active-tab');
    });
    
    document.getElementById('tab-' + tabId).style.display = 'block';
    document.getElementById('tab-' + tabId).classList.add('active-tab');
    
    // Update nav classes
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    event.currentTarget.parentElement.classList.add('active');
}

// Chart Initializations
document.addEventListener("DOMContentLoaded", () => {
    // Dummy chart data for UI visual completion
    const ctx = document.getElementById('portfolioChart');
    if(ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul'],
                datasets: [{
                    label: 'Portfolio Value',
                    data: [100, 120, 115, 140, 135, 160, 180],
                    borderColor: '#2563eb',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(37, 99, 235, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // Call API on load
    fetchAssets();
});

async function runBackendAnalysis() {
    const symbol = document.getElementById('symbolInput').value;
    const btn = document.querySelector('.primary-btn');
    btn.innerText = 'Analyzing...';
    
    try {
        // Here we trigger the backend python pipeline. Normally you would pass the symbol.
        const response = await fetch('http://127.0.0.1:8000/api/run-pipeline', { method: 'POST' });
        const data = await response.json();
        
        // Refetch to get updated list
        await fetchAssets();
        
        btn.innerText = 'Analysis Complete!';
        setTimeout(() => { btn.innerText = 'Generate Risk Profile'; }, 3000);
    } catch(e) {
        console.error("Error triggering analysis", e);
        btn.innerText = 'Error - Retry';
    }
}

async function fetchAssets() {
    try {
        const res = await fetch('http://127.0.0.1:8000/api/assets');
        const list = await res.json();
        renderAssetsTable(list);
        if(list.length > 0) {
            populateRiskWidget(list[list.length - 1]); // Show latest generated one in Risk widget
        }
    } catch(e) {
        console.error("Error fetching assets", e);
    }
}

function renderAssetsTable(assets) {
    const tbody = document.getElementById('assets-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    assets.forEach(a => {
        let riskColor = a.risk === 'Low' ? 'var(--green)' : a.risk === 'Medium' ? '#f59e0b' : 'var(--red)';
        
        let html = `
            <tr>
                <td>
                    <strong>${a.asset}</strong><br/>
                    <small>${Math.round(a.latest_price)}</small>
                </td>
                <td>Stock</td>
                <td><span style="color: ${riskColor}; font-weight:600;">${a.risk}</span></td>
                <td>${a.stability}</td>
                <td class="${a.returns >= 0 ? 'positive' : 'negative'}">${a.returns > 0 ? '+' : ''}${a.returns.toFixed(2)}%</td>
                <td>⋮</td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}

function populateRiskWidget(assetData) {
    // update Risk Level
    const riskLevel = document.getElementById('risk-level');
    riskLevel.innerText = assetData.risk;
    riskLevel.style.color = assetData.risk === 'Low' ? 'var(--green)' : assetData.risk === 'Medium' ? '#f59e0b' : 'var(--red)';
    
    document.getElementById('risk-stability').innerText = assetData.stability;
    document.getElementById('risk-trend').innerText = assetData.trend;
    
    document.getElementById('risk-returns').innerText = (assetData.returns > 0 ? '+' : '') + assetData.returns + '%';
    document.getElementById('risk-yearly').innerText = (assetData.yearly_return > 0 ? '+' : '') + assetData.yearly_return + '%';
    document.getElementById('risk-volatility').innerText = (assetData.volatility * 100).toFixed(2) + '%';
    document.getElementById('risk-latest').innerText = '₹ ' + assetData.latest_price;
    
    let starsStr = '';
    for(let i=0; i<assetData.stars; i++) starsStr += '⭐';
    document.getElementById('risk-stars').innerText = starsStr;
}
