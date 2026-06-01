import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 替換為你的 Supabase 資訊 (與 app.js 相同)
const SUPABASE_URL = 'https://dfeqgzgjnkcinduhaqbx.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_eOJwtn52IK-ud7RAvZlXKQ_8Io078XT'; 
const TABLE_NAME = 'money_flow_hk'; // 你提供的新 table

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 全域變數儲存當日數據
let latestMarketData = [];
let currentTab = 1;

// AASTOCKS 基礎網址產生器 (共用邏輯)
function generateAastocksUrl(ticker) {
    let cleanId = String(ticker).replace('.HK', '').trim();
    if (cleanId.length <= 4 && !isNaN(cleanId)) {
        cleanId = cleanId.padStart(6, '0');
    }
    return `https://charts.aastocks.com/servlet/Charts?fontsize=12&15MinDelay=T&lang=1&titlestyle=1&vol=1&Indicator=1&indpara1=10&indpara2=20&indpara3=50&indpara4=100&indpara5=150&subChart1=2&ref1para1=14&ref1para2=0&ref1para3=0&subChart2=3&ref2para1=12&ref2para2=26&ref2para3=9&subChart3=12&ref3para1=0&ref3para2=0&ref3para3=0&subChart4=9&ref4para1=0&ref4para2=0&ref4para3=0&subChart5=6&ref5para1=20&ref5para2=5&ref5para3=0&scheme=3&com=100&chartwidth=870&chartheight=1000&stockid=${cleanId}.HK&period=6&type=1&logoStyle=1&`;
}

// 格式化大數字 (例如將資金流轉為百萬)
function formatMoney(value) {
    if (value == null) return '-';
    const num = Number(value);
    if (Math.abs(num) >= 1000000) {
        return (num / 1000000).toFixed(2) + ' M';
    } else if (Math.abs(num) >= 10000) {
        return (num / 10000).toFixed(2) + ' 萬';
    }
    return num.toFixed(2);
}

// 檢查 Volspike 是否為 false/無 (處理資料庫可能的不同型態)
function isNotSpike(val) {
    return !val || val === '0' || val === 0 || val === 'No' || val === 'false';
}

// 檢查 Volspike 是否為 true/有
function isSpike(val) {
    return val === true || val === '1' || val === 1 || val === 'Yes' || val === 'true';
}

// 載入資料
async function loadStrategyData() {
    try {
        // 1. 先找出資料庫中最新的一天
        const { data: dateData, error: dateError } = await supabase
            .from(TABLE_NAME)
            .select('Record_Date')
            .order('Record_Date', { ascending: false })
            .limit(1);

        if (dateError) throw dateError;
        if (!dateData || dateData.length === 0) {
            document.getElementById('strategy-body').innerHTML = `<tr><td colspan="7" class="p-4 text-center">找不到任何數據</td></tr>`;
            return;
        }

        const latestDate = dateData[0].Record_Date;
        document.getElementById('latest-date').textContent = latestDate;

        // 2. 抓取最新這一天的所有股票數據
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('Record_Date', latestDate)
            .limit(3000); // 確保能抓滿全市場數據

        if (error) throw error;
        
        latestMarketData = data;
        
        // 3. 初始渲染 Tab 1
        renderStrategy(1);

    } catch (error) {
        console.error("載入策略資料失敗:", error);
        document.getElementById('strategy-body').innerHTML = `<tr><td colspan="7" class="text-red-400 p-4 text-center">讀取資料出錯: ${error.message}</td></tr>`;
    }
}

// 切換 Tab UI
window.switchTab = function(tabId) {
    currentTab = tabId;
    
    // 更新按鈕樣式
    document.querySelectorAll('.strategy-tab').forEach(btn => {
        btn.classList.remove('active', 'bg-indigo-600', 'border-indigo-400', 'text-white', 'border-2', 'bg-blue-600', 'border-blue-400', 'bg-pink-600', 'border-pink-400');
        btn.classList.add('bg-gray-800', 'border-gray-700', 'text-gray-400', 'border');
    });

    const activeBtn = document.getElementById(`tab-${tabId}`);
    activeBtn.classList.remove('bg-gray-800', 'border-gray-700', 'text-gray-400');
    activeBtn.classList.add('text-white', 'border-2');
    
    // 依據策略給予不同顏色
    if (tabId === 1) activeBtn.classList.add('bg-indigo-600', 'border-indigo-400');
    if (tabId === 2) activeBtn.classList.add('bg-blue-600', 'border-blue-400');
    if (tabId === 3) activeBtn.classList.add('bg-pink-600', 'border-pink-400');

    // 重新渲染表格
    renderStrategy(tabId);
}

// 根據策略渲染資料
function renderStrategy(tabId) {
    let filteredData = [];
    let theadHTML = '';
    let title = '';

    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('strategy-body');

    // ==========================================
    // 策略一：密密吸納區 (底背離)
    // ==========================================
    if (tabId === 1) {
        title = '🕵️‍♂️ 策略：現價小於10日均價 + RSI低於40 + 5日資金淨流入 + MFI大於RSI';
        
        filteredData = latestMarketData.filter(r => 
            Number(r.price) < Number(r['10D_price']) && 
            Number(r.RSI) < 40 && 
            Number(r['5D_flow']) > 0 && 
            Number(r.MFI) > Number(r.RSI) &&
            isNotSpike(r.Volspike) // 避免已經爆量的股票
        ).sort((a, b) => Number(b['5D_flow']) - Number(a['5D_flow'])); // 依 5 日流入量排序

        theadHTML = `
            <tr class="border-b border-gray-700 text-gray-400 font-medium bg-gray-900/40">
                <th class="p-4">股票</th> <th class="p-4">現價</th> <th class="p-4">10日價</th>
                <th class="p-4">RSI</th> <th class="p-4">MFI (量能)</th> <th class="p-4 text-right">5日資金流向</th>
            </tr>`;
            
        tbody.innerHTML = filteredData.map(r => `
            <tr class="border-b border-gray-700/50 hover:bg-gray-700/20">
                <td class="p-4 font-mono font-bold"><a href="${generateAastocksUrl(r.ticker)}" target="_blank" class="text-blue-400 hover:underline">${r.ticker}</a> <br><span class="text-xs text-gray-500 font-sans">${r.company_name}</span></td>
                <td class="p-4 text-yellow-400 font-mono">${Number(r.price).toFixed(2)}</td>
                <td class="p-4 text-gray-400 font-mono">${Number(r['10D_price']).toFixed(2)}</td>
                <td class="p-4 text-red-400 font-mono">${Number(r.RSI).toFixed(1)}</td>
                <td class="p-4 text-emerald-400 font-mono font-bold">${Number(r.MFI).toFixed(1)}</td>
                <td class="p-4 text-right text-emerald-400 font-mono font-bold">+${formatMoney(r['5D_flow'])}</td>
            </tr>
        `).join('');
    }

    // ==========================================
    // 策略二：資金爆發區 (量價齊揚)
    // ==========================================
    else if (tabId === 2) {
        title = '🚀 策略：MACD多頭 + 現價突破5日均價 + 單日資金大流入 + 動能加速 + 出現爆量';
        
        filteredData = latestMarketData.filter(r => 
            Number(r.MACD) > 0 && 
            Number(r.price) > Number(r['5D_price']) &&
            Number(r['1D_flow']) > 0 && 
            Number(r.accel) > 0 &&
            isSpike(r.Volspike)
        ).sort((a, b) => Number(b.accel) - Number(a.accel)); // 依動能加速排序

        theadHTML = `
            <tr class="border-b border-gray-700 text-gray-400 font-medium bg-gray-900/40">
                <th class="p-4">股票</th> <th class="p-4">現價</th> <th class="p-4">MACD</th>
                <th class="p-4 text-center">爆量訊號</th> <th class="p-4 text-right">動能加速</th> <th class="p-4 text-right">1日資金流向</th>
            </tr>`;
            
        tbody.innerHTML = filteredData.map(r => `
            <tr class="border-b border-gray-700/50 hover:bg-gray-700/20">
                <td class="p-4 font-mono font-bold"><a href="${generateAastocksUrl(r.ticker)}" target="_blank" class="text-blue-400 hover:underline">${r.ticker}</a> <br><span class="text-xs text-gray-500 font-sans">${r.company_name}</span></td>
                <td class="p-4 text-yellow-400 font-mono">${Number(r.price).toFixed(2)}</td>
                <td class="p-4 text-emerald-400 font-mono">${Number(r.MACD).toFixed(3)}</td>
                <td class="p-4 text-center"><span class="bg-red-900 text-red-300 text-[10px] px-2 py-1 rounded font-bold">🔥 VOL SPIKE</span></td>
                <td class="p-4 text-right text-yellow-400 font-mono">${Number(r.accel).toFixed(2)}</td>
                <td class="p-4 text-right text-emerald-400 font-mono font-bold">+${formatMoney(r['1D_flow'])}</td>
            </tr>
        `).join('');
    }

    // ==========================================
    // 策略三：熱錢狙擊區 (高影響力)
    // ==========================================
    else if (tabId === 3) {
        title = '🔥 策略：今日資金流入佔市值比重最高 (Flow_Cap) 排行榜';
        
        filteredData = latestMarketData.filter(r => 
            Number(r.Flow_Cap) > 0 && Number(r.MACD) > 0
        ).sort((a, b) => Number(b.Flow_Cap) - Number(a.Flow_Cap))
         .slice(0, 30); // 取前 30 名

        theadHTML = `
            <tr class="border-b border-gray-700 text-gray-400 font-medium bg-gray-900/40">
                <th class="p-4">股票</th> <th class="p-4">現價</th> <th class="p-4">總市值</th>
                <th class="p-4 text-right">1日資金流向</th> <th class="p-4 text-right">資金影響力 (Flow_Cap)</th>
            </tr>`;
            
        tbody.innerHTML = filteredData.map(r => `
            <tr class="border-b border-gray-700/50 hover:bg-gray-700/20">
                <td class="p-4 font-mono font-bold"><a href="${generateAastocksUrl(r.ticker)}" target="_blank" class="text-blue-400 hover:underline">${r.ticker}</a> <br><span class="text-xs text-gray-500 font-sans">${r.company_name}</span></td>
                <td class="p-4 text-yellow-400 font-mono">${Number(r.price).toFixed(2)}</td>
                <td class="p-4 text-gray-400 font-mono">${formatMoney(r.Mkt_cap)}</td>
                <td class="p-4 text-right text-emerald-400 font-mono">+${formatMoney(r['1D_flow'])}</td>
                <td class="p-4 text-right text-pink-400 font-mono font-bold">${Number(r.Flow_Cap).toFixed(4)}</td>
            </tr>
        `).join('');
    }

    // 處理空數據畫面
    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-gray-500">今日無股票符合此策略條件</td></tr>`;
    }

    // 更新 UI 標題與數量
    document.getElementById('strategy-title').textContent = title;
    
    // 依據 Tab 改變 badge 顏色
    const countBadge = document.getElementById('strategy-count');
    countBadge.textContent = `${filteredData.length} 隻符合`;
    countBadge.className = `text-xs font-semibold px-2.5 py-0.5 rounded ${
        tabId === 1 ? 'bg-indigo-900 text-indigo-300' : 
        tabId === 2 ? 'bg-blue-900 text-blue-300' : 
        'bg-pink-900 text-pink-300'
    }`;
    
    thead.innerHTML = theadHTML;
}

// 啟動程式
document.addEventListener('DOMContentLoaded', loadStrategyData);
