import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 你的 Supabase 連線資訊
const SUPABASE_URL = 'https://dfeqgzgjnkcinduhaqbx.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_eOJwtn52IK-ud7RAvZlXKQ_8Io078XT'; 
const TABLE_NAME = 'money_flow_hk'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let latestMarketData = [];
let currentTab = 1;
let currentDisplayedTickers = []; // 用來儲存目前畫面上顯示的股票代號，供複製使用

// --- 觀察名單 (Watchlist) 管理功能 ---
function getWatchlist() {
    const list = localStorage.getItem('hk_watchlist');
    return list ? JSON.parse(list) : [];
}

function toggleWatchlist(ticker) {
    let list = getWatchlist();
    if (list.includes(ticker)) {
        list = list.filter(t => t !== ticker); // 移除
    } else {
        list.push(ticker); // 加入
    }
    localStorage.setItem('hk_watchlist', JSON.stringify(list));
}
// ------------------------------------

function generateAastocksUrl(ticker) {
    let cleanId = String(ticker).replace('.HK', '').trim();
    if (cleanId.length <= 4 && !isNaN(cleanId)) {
        cleanId = cleanId.padStart(6, '0');
    }
    return `https://charts.aastocks.com/servlet/Charts?fontsize=12&15MinDelay=T&lang=1&titlestyle=1&vol=1&Indicator=1&indpara1=10&indpara2=20&indpara3=50&indpara4=100&indpara5=150&subChart1=2&ref1para1=14&ref1para2=0&ref1para3=0&subChart2=3&ref2para1=12&ref2para2=26&ref2para3=9&subChart3=12&ref3para1=0&ref3para2=0&ref3para3=0&subChart4=9&ref4para1=0&ref4para2=0&ref4para3=0&subChart5=6&ref5para1=20&ref5para2=5&ref5para3=0&scheme=3&com=100&chartwidth=870&chartheight=1000&stockid=${cleanId}.HK&period=6&type=1&logoStyle=1&`;
}

function formatMoney(value) {
    if (value == null) return '-';
    const num = Number(value);
    const absNum = Math.abs(num);
    // 解決 +- 顯示問題，保留原本的正負號邏輯
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

function isNotSpike(val) {
    return !val || val === '0' || val === 0 || val === 'No' || val === 'false';
}

function isSpike(val) {
    return val === true || val === '1' || val === 1 || val === 'Yes' || val === 'true';
}

async function loadStrategyData() {
    try {
        const { data: dateData, error: dateError } = await supabase
            .from(TABLE_NAME)
            .select('Record_Date')
            .order('Record_Date', { ascending: false })
            .limit(1);

        if (dateError) throw dateError;
        if (!dateData || dateData.length === 0) {
            document.getElementById('strategy-body').innerHTML = `<tr><td colspan="8" class="p-4 text-center">找不到任何數據，請檢查資料庫</td></tr>`;
            return;
        }

        const latestDate = dateData[0].Record_Date;
        document.getElementById('latest-date').textContent = latestDate;

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('Record_Date', latestDate)
            .limit(3000); 

        if (error) throw error;
        
        latestMarketData = data;
        renderStrategy(1);

    } catch (error) {
        console.error("載入策略資料失敗:", error);
        document.getElementById('strategy-body').innerHTML = `<tr><td colspan="8" class="text-red-400 p-4 text-center">讀取資料出錯: ${error.message}</td></tr>`;
    }
}

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

function renderStrategy(tabId) {
    let filteredData = [];
    let theadHTML = '';
    let title = '';
    const watchlist = getWatchlist(); // 取得目前的觀察名單

    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('strategy-body');

    // Tab 1: 密密吸納 (適合波段找底)
    if (tabId === 1) {
        title = '🕵️‍♂️ 策略：股價低於10日線 + RSI超賣(<40) + 5日資金連續流入 + MFI>RSI';
        filteredData = latestMarketData.filter(r => 
            Number(r.price) < Number(r['10D_price']) && 
            Number(r.RSI) < 40 && 
            Number(r['5D_flow']) > 0 && 
            Number(r.MFI) > Number(r.RSI) &&
            isNotSpike(r.Volspike) 
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
                <td class="p-4 font-mono font-bold"><a href="${generateAastocksUrl(r.ticker)}" target="_blank" class="text-blue-400 hover:underline">${r.ticker}</a> <br><span class="text-xs text-gray-500 font-sans">${r.company_name}</span></td>
                <td class="p-4 text-yellow-400 font-mono">${Number(r.price).toFixed(2)}</td>
                <td class="p-4 text-gray-400 font-mono">${Number(r['10D_price']).toFixed(2)}</td>
                <td class="p-4 text-red-400 font-mono">${Number(r.RSI).toFixed(1)}</td>
                <td class="p-4 text-emerald-400 font-mono font-bold">${Number(r.MFI).toFixed(1)}</td>
                <td class="p-4 text-right text-emerald-400 font-mono font-bold">${formatMoney(r['5D_flow'])}</td>
            </tr>
        `).join('');
    }
    // Tab 2: 波段動能 (加入 1D與5D 雙重確認，濾除一日遊)
    else if (tabId === 2) {
        title = '🚀 策略：站上5日線 + MACD多頭 + 1日與5日資金皆正向流入 + 爆量';
        filteredData = latestMarketData.filter(r => 
            Number(r.MACD) > 0 && 
            Number(r.price) > Number(r['5D_price']) &&
            Number(r['1D_flow']) > 0 && 
            Number(r['5D_flow']) > 0 && // 新增：確保5天也是流入的 (波段思維)
            isSpike(r.Volspike)
        ).sort((a, b) => Number(b.accel) - Number(a.accel)); 

        theadHTML = `
            <tr class="border-b border-gray-700 text-gray-400 font-medium bg-gray-900/40">
                <th class="p-4 w-12 text-center">🌟</th>
                <th class="p-4">股票</th> <th class="p-4">現價</th> <th class="p-4 text-center">爆量訊號</th>
                <th class="p-4 text-right">動能加速</th> <th class="p-4 text-right">1日資金流向</th><th class="p-4 text-right">5日資金流向</th>
            </tr>`;
            
        tbody.innerHTML = filteredData.map(r => `
            <tr class="border-b border-gray-700/50 hover:bg-gray-700/20">
                <td class="p-4 text-center">
                    <input type="checkbox" class="watchlist-cb w-4 h-4 cursor-pointer accent-yellow-500" data-ticker="${r.ticker}" ${watchlist.includes(r.ticker) ? 'checked' : ''}>
                </td>
                <td class="p-4 font-mono font-bold"><a href="${generateAastocksUrl(r.ticker)}" target="_blank" class="text-blue-400 hover:underline">${r.ticker}</a> <br><span class="text-xs text-gray-500 font-sans">${r.company_name}</span></td>
                <td class="p-4 text-yellow-400 font-mono">${Number(r.price).toFixed(2)}</td>
                <td class="p-4 text-center"><span class="bg-red-900 text-red-300 text-[10px] px-2 py-1 rounded font-bold">🔥 SPIKE</span></td>
                <td class="p-4 text-right text-yellow-400 font-mono">${Number(r.accel).toFixed(2)}</td>
                <td class="p-4 text-right text-emerald-400 font-mono font-bold">${formatMoney(r['1D_flow'])}</td>
                <td class="p-4 text-right text-emerald-400 font-mono">${formatMoney(r['5D_flow'])}</td>
            </tr>
        `).join('');
    }
    // Tab 3: 熱錢狙擊
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
                <td class="p-4 font-mono font-bold"><a href="${generateAastocksUrl(r.ticker)}" target="_blank" class="text-blue-400 hover:underline">${r.ticker}</a> <br><span class="text-xs text-gray-500 font-sans">${r.company_name}</span></td>
                <td class="p-4 text-yellow-400 font-mono">${Number(r.price).toFixed(2)}</td>
                <td class="p-4 text-gray-400 font-mono">${formatMoney(r.Mkt_cap)}</td>
                <td class="p-4 text-right text-emerald-400 font-mono">${formatMoney(r['1D_flow'])}</td>
                <td class="p-4 text-right text-pink-400 font-mono font-bold">${Number(r.Flow_Cap).toFixed(4)}</td>
            </tr>
        `).join('');
    }

    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-gray-500">今日無股票符合此策略條件</td></tr>`;
    }

    // 更新當前顯示的 Ticker 陣列，供複製功能使用
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

    // 綁定 Checkbox 點擊事件，存入 Watchlist
    document.querySelectorAll('.watchlist-cb').forEach(cb => {
        cb.addEventListener('change', function() {
            const ticker = this.getAttribute('data-ticker');
            toggleWatchlist(ticker);
        });
    });
}

// 綁定複製按鈕事件
document.getElementById('copy-btn').addEventListener('click', () => {
    if (currentDisplayedTickers.length === 0) return;
    
    // 將代號陣列用分號組合起來，例如：0992.HK;0354.HK
    const copyString = currentDisplayedTickers.join(';');
    
    // 寫入剪貼簿
    navigator.clipboard.writeText(copyString).then(() => {
        const feedback = document.getElementById('copy-feedback');
        feedback.classList.remove('opacity-0');
        setTimeout(() => {
            feedback.classList.add('opacity-0');
        }, 2000); // 2秒後提示消失
    }).catch(err => {
        console.error('複製失敗: ', err);
        alert('瀏覽器不支援自動複製，請手動選取複製。');
    });
});

document.addEventListener('DOMContentLoaded', loadStrategyData);
