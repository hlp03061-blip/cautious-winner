import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 你的 Supabase 連線資訊
const SUPABASE_URL = 'https://dfeqgzgjnkcinduhaqbx.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_eOJwtn52IK-ud7RAvZlXKQ_8Io078XT'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentMarket = 'HK'; // 預設市場：'HK' 或 'SP500'
let currentTableName = 'money_flow_hk'; // 預設資料表
let latestMarketData = [];
let currentTab = 1;
let currentDisplayedTickers = []; // 用來儲存目前畫面上顯示的股票代號，供複製使用

// --- 觀察名單 (Watchlist) 管理功能 ---
function getWatchlistKey() {
    return currentMarket === 'HK' ? 'hk_watchlist' : 'sp500_watchlist';
}

function getWatchlist() {
    const list = localStorage.getItem(getWatchlistKey());
    return list ? JSON.parse(list) : [];
}

function toggleWatchlist(ticker) {
    let list = getWatchlist();
    if (list.includes(ticker)) {
        list = list.filter(t => t !== ticker); // 移除
    } else {
        list.push(ticker); // 加入
    }
    localStorage.setItem(getWatchlistKey(), JSON.stringify(list));
}
// ------------------------------------

// 智慧型圖表網址產生器 (港股去 AASTOCKS，美股去 TradingView)
function generateStockChartUrl(ticker) {
    if (currentMarket === 'SP500') {
        // 美股例如 AAPL, TSLA 直接前往 TradingView
        return `https://www.tradingview.com/symbols/NASDAQ-${ticker}/?coinbound_by_gpts=true`;
    } else {
        // 港股走原有 AASTOCKS 邏輯
        let cleanId = String(ticker).replace('.HK', '').trim();
        if (cleanId.length <= 4 && !isNaN(cleanId)) {
            cleanId = cleanId.padStart(6, '0');
        }
        return `https://charts.aastocks.com/servlet/Charts?fontsize=12&15MinDelay=T&lang=1&titlestyle=1&vol=1&Indicator=1&indpara1=10&indpara2=20&indpara3=50&indpara4=100&indpara5=150&subChart1=2&ref1para1=14&ref1para2=0&ref1para3=0&subChart2=3&ref2para1=12&ref2para2=26&ref2para3=9&subChart3=12&ref3para1=0&ref3para2=0&ref3para3=0&subChart4=9&ref4para1=0&ref4para2=0&ref4para3=0&subChart5=6&ref5para1=20&ref5para2=5&ref5para3=0&scheme=3&com=100&chartwidth=870&chartheight=1000&stockid=${cleanId}.HK&period=6&type=1&logoStyle=1&`;
    }
}

// 金額格式化
function formatMoney(value) {
    if (value == null) return '-';
    const num = Number(value);
    const absNum = Math.abs(num);
    const sign = num > 0 ? '+' : ''; 
    let formatted = '';

    if (absNum >= 1000000) {
        formatted = (absNum / 1000000).toFixed(2) + ' M';
    } else if (absNum >= 10000) {
        formatted = (absNum / 10000).toFixed(2) + ' 萬';
    } else {
        formatted = absNum.toFixed(2);
    }
    return `${sign}${num < 0 ? '-' : ''}${formatted}`;
}

// 判斷是否爆量 (依據 Python 傳入的 Volspike 比例，大於等於 1.5 倍算爆量)
function isSpike(val) {
    if (val === true || val === '1' || val === 'Yes' || val === 'true') return true;
    const num = Number(val);
    if (!isNaN(num) && num >= 1.5) return true;
    return false;
}

// 格式化成交量倍數顯示
function formatSpike(val) {
    const num = Number(val);
    if (!isNaN(num) && num > 0) return num.toFixed(1) + 'x';
    return '-';
}

// 核心載入數據邏輯
async function loadStrategyData() {
    const tbody = document.getElementById('strategy-body');
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-gray-500">正在連線資料庫 [${currentTableName}]，請稍候...</td></tr>`;
    document.getElementById('latest-date').textContent = "載入中...";

    try {
        const { data: dateData, error: dateError } = await supabase
            .from(currentTableName)
            .select('Record_Date')
            .order('Record_Date', { ascending: false })
            .limit(1);

        if (dateError) throw dateError;
        if (!dateData || dateData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center">找不到任何數據，請檢查資料庫名稱</td></tr>`;
            return;
        }

        const latestDate = dateData[0].Record_Date;
        let displayDate = latestDate;

        // 解決時差問題：如果是美股，將顯示的日期減 1 天並備註美國交易日
        if (currentMarket === 'SP500') {
            const d = new Date(latestDate);
            d.setDate(d.getDate() - 1); 
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            displayDate = `${yyyy}-${mm}-${dd} (美國交易日)`;
        }
        
        document.getElementById('latest-date').textContent = displayDate;

        const { data, error } = await supabase
            .from(currentTableName)
            .select('*')
            .eq('Record_Date', latestDate)
            .limit(3000); 

        if (error) throw error;
        
        latestMarketData = data;
        renderStrategy(currentTab);

    } catch (error) {
        console.error("載入策略資料失敗:", error);
        tbody.innerHTML = `<tr><td colspan="8" class="text-red-400 p-4 text-center">讀取資料出錯: ${error.message}</td></tr>`;
    }
}

// 切換市場功能 (HK / SP500)
window.switchMarket = function(marketCode) {
    if (currentMarket === marketCode) return;
    currentMarket = marketCode;
    currentTableName = marketCode === 'HK' ? 'money_flow_hk' : 'money_flow_sp500';

    const hkBtn = document.getElementById('market-hk');
    const spBtn = document.getElementById('market-sp500');
    const noteEl = document.getElementById('watchlist-note');

    if (marketCode === 'HK') {
        hkBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white transition-all";
        spBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-all";
        noteEl.textContent = "勾選 🌟 可加入港股觀察名單 (將儲存於瀏覽器中)";
    } else {
        spBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white transition-all";
        hkBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-all";
        noteEl.textContent = "勾選 🌟 可加入 S&P 500 觀察名單 (將儲存於瀏覽器中)";
    }
    loadStrategyData();
}

// 切換策略標籤
window.switchTab = function(tabId) {
    currentTab = tabId;
    
    document.querySelectorAll('.strategy-tab').forEach(btn => {
        btn.classList.remove('active', 'bg-indigo-600', 'border-indigo-400', 'text-white', 'border-2', 'bg-blue-600', 'border-blue-400', 'bg-pink-600', 'border-pink-400');
        btn.classList.add('bg-gray-800', 'border-gray-700', 'text-gray-400', 'border');
    });

    const activeBtn = document.getElementById(`tab-${tabId}`);
    activeBtn.classList.remove('bg-gray-800', 'border-gray-700', 'text-gray-400');
    activeBtn.classList.add('text-white', 'border-2');
    
    if (tabId === 1) activeBtn.classList.add('bg-indigo-600', 'border-indigo-400');
    if (tabId === 2) activeBtn.classList.add('bg-blue-600', 'border-blue-400');
    if (tabId === 3) activeBtn.classList.add('bg-pink-600', 'border-pink-400');

    renderStrategy(tabId);
}

// 根據選定策略與市場渲染表格
function renderStrategy(tabId) {
    let filteredData = [];
    let theadHTML = '';
    let title = '';
    const watchlist = getWatchlist(); 

    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('strategy-body');

    // Tab 1: 密密吸納 (放寬限制優化版)
    if (tabId === 1) {
        title = '🕵️‍♂️ 策略：股價低於10日線 + 5日資金淨流入 + MFI>RSI (底背離吸籌)';
        filteredData = latestMarketData.filter(r => 
            Number(r.price) < Number(r['10D_price']) && 
            Number(r['5D_flow']) > 0 && 
            Number(r.MFI) > Number(r.RSI)
        ).sort((a, b) => Number(b['5D_flow']) - Number(a['5D_flow'])); 

        theadHTML = `
            <tr class="border-b border-gray-700 text-gray-400 font-medium bg-gray-900/40">
                <th class="p-4 w-12 text-center">🌟</th>
                <th class="p-4">股票</th> <th class="p-4">現價</th> <th class="p-4">10日價</th>
                <th class="p-4">RSI</th> <th class="p-4">MFI (量能)</th> <th class="p-4 text-right">5日資金流向</th>
            </tr>`;
            
        tbody.innerHTML = filteredData.map(r => `
            <tr class="border-b border-gray-700/50 hover:bg-gray-700/20">
                <td class="p-4 text-center">
                    <input type="checkbox" class="watchlist-cb w-4 h-4 cursor-pointer accent-yellow-500" data-ticker="${r.ticker}" ${watchlist.includes(r.ticker) ? 'checked' : ''}>
                </td>
                <td class="p-4 font-mono font-bold"><a href="${generateStockChartUrl(r.ticker)}" target="_blank" class="text-blue-400 hover:underline">${r.ticker}</a> <br><span class="text-xs text-gray-500 font-sans">${r.company_name || '-'}</span></td>
                <td class="p-4 text-yellow-400 font-mono">${Number(r.price).toFixed(2)}</td>
                <td class="p-4 text-gray-400 font-mono">${Number(r['10D_price']).toFixed(2)}</td>
                <td class="p-4 text-red-400 font-mono">${Number(r.RSI).toFixed(1)}</td>
                <td class="p-4 text-emerald-400 font-mono font-bold">${Number(r.MFI).toFixed(1)}</td>
                <td class="p-4 text-right text-emerald-400 font-mono font-bold">${formatMoney(r['5D_flow'])}</td>
            </tr>
        `).join('');
    }
    // Tab 2: 波段動能 (完美修正 "Y" 字串與倍數數值)
    else if (tabId === 2) {
        title = '🚀 策略：站上5日線 + MACD多頭 + 1日與5日資金皆正向流入';
        filteredData = latestMarketData.filter(r => 
            Number(r.MACD) > 0 && 
            Number(r.price) > Number(r['5D_price']) &&
            Number(r['1D_flow']) > 0 && 
            Number(r['5D_flow']) > 0
        ).sort((a, b) => Number(b['5D_flow']) - Number(a['5D_flow'])); // 改用5日波段資金流大小做排序

        theadHTML = `
            <tr class="border-b border-gray-700 text-gray-400 font-medium bg-gray-900/40">
                <th class="p-4 w-12 text-center">🌟</th>
                <th class="p-4">股票</th> <th class="p-4">現價</th> <th class="p-4 text-center">成交量比</th>
                <th class="p-4 text-center">動能加速</th> <th class="p-4 text-right">1日資金流向</th><th class="p-4 text-right">5日資金流向</th>
            </tr>`;
            
        tbody.innerHTML = filteredData.map(r => {
            // 處理「動能加速」: Python 端傳入的是字串 "Y"
            let accelDisplay = '-';
            if (r.accel === 'Y' || r.accel === 'Yes' || r.accel === true) {
                accelDisplay = '✅';
            }

            // 處理「爆量訊號」: Python 端傳入的是倍數 (例如 1.83)
            let spikeHtml = '-';
            if (isSpike(r.Volspike)) {
                 spikeHtml = `<span class="bg-red-900 text-red-300 text-[10px] px-2 py-1 rounded font-bold" title="${formatSpike(r.Volspike)}">🔥 ${formatSpike(r.Volspike)}</span>`;
            } else if (r.Volspike && Number(r.Volspike) > 0) {
                 spikeHtml = `<span class="text-gray-500 text-xs font-mono">${formatSpike(r.Volspike)}</span>`;
            }

            return `
            <tr class="border-b border-gray-700/50 hover:bg-gray-700/20">
                <td class="p-4 text-center">
                    <input type="checkbox" class="watchlist-cb w-4 h-4 cursor-pointer accent-yellow-500" data-ticker="${r.ticker}" ${watchlist.includes(r.ticker) ? 'checked' : ''}>
                </td>
                <td class="p-4 font-mono font-bold"><a href="${generateStockChartUrl(r.ticker)}" target="_blank" class="text-blue-400 hover:underline">${r.ticker}</a> <br><span class="text-xs text-gray-500 font-sans">${r.company_name || '-'}</span></td>
                <td class="p-4 text-yellow-400 font-mono">${Number(r.price).toFixed(2)}</td>
                <td class="p-4 text-center">${spikeHtml}</td>
                <td class="p-4 text-center text-yellow-400 font-bold">${accelDisplay}</td>
                <td class="p-4 text-right text-emerald-400 font-mono font-bold">${formatMoney(r['1D_flow'])}</td>
                <td class="p-4 text-right text-emerald-400 font-mono">${formatMoney(r['5D_flow'])}</td>
            </tr>
            `;
        }).join('');
    }
    // Tab 3: 熱錢狙擊 (維持不變)
    else if (tabId === 3) {
        title = '🔥 策略：今日資金流入佔市值比重最高 (Flow_Cap) 排行榜';
        filteredData = latestMarketData.filter(r => 
            Number(r.Flow_Cap) > 0 && Number(r.MACD) > 0
        ).sort((a, b) => Number(b.Flow_Cap) - Number(a.Flow_Cap))
         .slice(0, 30); 

        theadHTML = `
            <tr class="border-b border-gray-700 text-gray-400 font-medium bg-gray-900/40">
                <th class="p-4 w-12 text-center">🌟</th>
                <th class="p-4">股票</th> <th class="p-4">現價</th> <th class="p-4">總市值</th>
                <th class="p-4 text-right">1日資金流向</th> <th class="p-4 text-right">資金影響力 (Flow_Cap)</th>
            </tr>`;
            
        tbody.innerHTML = filteredData.map(r => `
            <tr class="border-b border-gray-700/50 hover:bg-gray-700/20">
                <td class="p-4 text-center">
                    <input type="checkbox" class="watchlist-cb w-4 h-4 cursor-pointer accent-yellow-500" data-ticker="${r.ticker}" ${watchlist.includes(r.ticker) ? 'checked' : ''}>
                </td>
                <td class="p-4 font-mono font-bold"><a href="${generateStockChartUrl(r.ticker)}" target="_blank" class="text-blue-400 hover:underline">${r.ticker}</a> <br><span class="text-xs text-gray-500 font-sans">${r.company_name || '-'}</span></td>
                <td class="p-4 text-yellow-400 font-mono">${Number(r.price).toFixed(2)}</td>
                <td class="p-4 text-gray-400 font-mono">${formatMoney(r.Mkt_cap)}</td>
                <td class="p-4 text-right text-emerald-400 font-mono">${formatMoney(r['1D_flow'])}</td>
                <td class="p-4 text-right text-pink-400 font-mono font-bold">${RichmondFixFlowCap(r.Flow_Cap)}</td>
            </tr>
        `).join('');
    }

    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-gray-500">今日無股票符合此策略條件</td></tr>`;
    }

    currentDisplayedTickers = filteredData.map(r => r.ticker);
    document.getElementById('strategy-title').textContent = title;
    
    const countBadge = document.getElementById('strategy-count');
    countBadge.textContent = `${filteredData.length} 隻符合`;
    countBadge.className = `text-xs font-semibold px-2.5 py-0.5 rounded ${
        tabId === 1 ? 'bg-indigo-900 text-indigo-300' : 
        tabId === 2 ? 'bg-blue-900 text-blue-300' : 
        'bg-pink-900 text-pink-300'
    }`;
    
    thead.innerHTML = theadHTML;

    // 重新綁定自選 Checkbox 事件
    document.querySelectorAll('.watchlist-cb').forEach(cb => {
        cb.addEventListener('change', function() {
            const ticker = this.getAttribute('data-ticker');
            toggleWatchlist(ticker);
        });
    });
}

function RichmondFixFlowCap(val) {
    return val ? Number(val).toFixed(4) : '-';
}

// 複製此頁所有股票代號按鈕事件
document.getElementById('copy-btn').addEventListener('click', () => {
    if (currentDisplayedTickers.length === 0) return;
    
    const copyString = currentDisplayedTickers.join(';');
    
    navigator.clipboard.writeText(copyString).then(() => {
        const feedback = document.getElementById('copy-feedback');
        feedback.classList.remove('opacity-0');
        setTimeout(() => {
            feedback.classList.add('opacity-0');
        }, 2000);
    }).catch(err => {
        console.error('複製失敗: ', err);
        alert('瀏覽器不支援自動複製，請手動選取複製。');
    });
});

// 初始化載入
document.addEventListener('DOMContentLoaded', loadStrategyData);
