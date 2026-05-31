import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://dfeqgzgjnkcinduhaqbx.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_eOJwtn52IK-ud7RAvZlXKQ_8Io078XT'; 
const TABLE_NAME = 'stock_data';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadDashboardData() {
    try {
        // 為了涵蓋 200+ 隻股票過去 5 天的紀錄，我們一次拉取最新 1500 筆數據
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('date', { ascending: false })
            .limit(1500);

        if (error) throw error;
        if (!data || data.length === 0) return;

        // 1. 找出最新的一天是哪天（用於判斷今日訊號和大盤）
        const allDates = [...new Set(data.map(row => row.date))].sort().reverse();
        const latestDate = allDates[0];
        const past5Dates = allDates.slice(0, 5); // 取得最近的5個交易日

        // 2. 獨立抽離處理恒生指數 (^HSI)
        const hsiToday = data.find(row => row.ticker === '^HSI' && row.date === latestDate);
        if (hsiToday) {
            document.getElementById('hsi-price').textContent = Number(hsiToday.price).toFixed(2);
            const macdEl = document.getElementById('hsi-macd');
            macdEl.textContent = hsiToday.macd_momentum;
            if (hsiToday.macd_momentum === 'Positive') {
                macdEl.className = 'text-xs px-2 py-0.5 rounded ml-2 font-semibold bg-green-900 text-green-300';
            } else {
                macdEl.className = 'text-xs px-2 py-0.5 rounded ml-2 font-semibold bg-red-900 text-red-300';
            }
        }

        // 過濾掉大盤，只看個股
        const stockData = data.filter(row => row.ticker !== '^HSI');

        // 3. 核心大數據聚合：按 Ticker 分組計算過去 5 天的狀態
        const tickerMap = {};
        stockData.forEach(row => {
            // 只統計最近 5 個交易日內的數據
            if (!past5Dates.includes(row.date)) return;

            if (!tickerMap[row.ticker]) {
                tickerMap[row.ticker] = {
                    ticker: row.ticker,
                    company_name: row.company_name,
                    history: []
                };
            }
            tickerMap[row.ticker].history.push(row);
        });

        const compiledStocks = [];

        Object.values(tickerMap).forEach(stock => {
            // 找出該股最新一天的紀錄
            const latestRecord = stock.history.find(h => h.date === latestDate);
            if (!latestRecord) return; // 如果今天沒數據則跳過

            // 計算過去 5 天觸發 Squeeze 的次數
            const squeezeCount = stock.history.filter(h => h.vol_squeeze && h.vol_squeeze.includes('Squeeze')).length;
            
            // 檢查今天是否有 Buy Dip 訊號
            const hasBuyDipToday = latestRecord.pullback_signal === 'BUY DIP';

            // 🌟 篩選條件：只要 5 天內有觸發過 Squeeze，或者今天有 Buy Dip 的股票才放進來
            if (squeezeCount > 0 || hasBuyDipToday) {
                compiledStocks.push({
                    ticker: stock.ticker,
                    company_name: stock.company_name,
                    price: latestRecord.price,
                    squeeze_count: squeezeCount,
                    has_buy_dip: hasBuyDipToday,
                    // 以下保留給詳情面板顯示 (使用最新一天的數字)
                    rating_hybrid: latestRecord.rating_hybrid,
                    macd_momentum: latestRecord.macd_momentum,
                    rsi_14: latestRecord.rsi_14,
                    risk_note: latestRecord.risk_note,
                    sharpe_ratio: latestRecord.sharpe_ratio
                });
            }
        });

        // 4. 🚀 解決排序問題：優先按「5日擠壓次數」從多到少排，次數一樣則看「夏普值」性價比高低
        compiledStocks.sort((a, b) => {
            if (b.squeeze_count !== a.squeeze_count) {
                return b.squeeze_count - a.squeeze_count;
            }
            return (b.sharpe_ratio || 0) - (a.sharpe_ratio || 0);
        });

        // 5. 渲染表格
        renderMainDashboard(compiledStocks);

    } catch (error) {
        console.error("處理數據失敗:", error);
        document.getElementById('main-dashboard-body').innerHTML = `<tr><td colspan="5" class="text-red-400 p-4 text-center">系統優化出錯: ${error.message}</td></tr>`;
    }
}

function renderMainDashboard(stocks) {
    const tbody = document.getElementById('main-dashboard-body');
    tbody.innerHTML = '';
    document.getElementById('main-count').textContent = `${stocks.length} 隻策略追蹤中`;

    if (stocks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500">今日市埸風平浪靜，無觸發訊號的股票</td></tr>`;
        return;
    }

    stocks.forEach((stock, index) => {
        const mainTrId = `main-row-${index}`;
        const detailTrId = `detail-row-${index}`;

        // 主行 (只看關鍵資訊)
        const tr = document.createElement('tr');
        tr.id = mainTrId;
        tr.className = 'border-b border-gray-700/50 hover:bg-gray-700/20 cursor-pointer transition-colors';
        
        // 1. 箭頭欄位
        const tdArrow = document.createElement('td');
        tdArrow.className = 'p-4 text-center text-gray-500 text-xs';
        tdArrow.innerHTML = '▶';
        tr.appendChild(tdArrow);

        // 2. Ticker 欄位 (加上 Buy Dip 標籤)
        const tdTicker = document.createElement('td');
        tdTicker.className = 'p-4 font-mono font-bold flex items-center gap-2';
        tdTicker.textContent = stock.ticker;
        if (stock.has_buy_dip) {
            tdTicker.innerHTML += `<span class="bg-emerald-950 text-emerald-400 border border-emerald-500 text-[10px] px-1.5 py-0.5 rounded font-sans font-bold animate-pulse">🏷️ BUY DIP</span>`;
        }
        tr.appendChild(tdTicker);

        // 3. 名稱
        const tdName = document.createElement('td');
        tdName.className = 'p-4 text-gray-300';
        tdName.textContent = stock.company_name;
        tr.appendChild(tdName);

        // 4. 現價
        const tdPrice = document.createElement('td');
        tdPrice.className = 'p-4 text-right font-mono text-yellow-400 font-bold';
        tdPrice.textContent = stock.price ? Number(stock.price).toFixed(2) : '-';
        tr.appendChild(tdPrice);

        // 5. 擠壓次數
        const tdCount = document.createElement('td');
        tdCount.className = 'p-4 text-center';
        tdCount.innerHTML = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${stock.squeeze_count >= 3 ? 'bg-red-950 text-red-400 border border-red-700' : 'bg-blue-950 text-blue-400'}">${stock.squeeze_count} 天</span>`;
        tr.appendChild(tdCount);

        tbody.appendChild(tr);

        // 隱藏的詳情行 (Accordion)
        const detailTr = document.createElement('tr');
        detailTr.id = detailTrId;
        detailTr.className = 'detail-row bg-gray-900/50 border-b border-gray-800 text-xs text-gray-400';
        detailTr.innerHTML = `
            <td></td>
            <td colspan="4" class="p-4 bg-gray-900/30">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><span class="text-gray-500">綜合評級：</span><span class="text-yellow-500 font-bold">${stock.rating_hybrid || 'Avoid'}</span></div>
                    <div><span class="text-gray-500">MACD 動能：</span><span class="${stock.macd_momentum === 'Positive' ? 'text-green-400' : 'text-red-400'} font-semibold">${stock.macd_momentum}</span></div>
                    <div><span class="text-gray-500">RSI (14)：</span><span class="font-mono">${stock.rsi_14 ? Number(stock.rsi_14).toFixed(1) : '-'}</span></div>
                    <div><span class="text-gray-500">風險提示：</span><span class="text-gray-300">${stock.risk_note || 'Stable'}</span></div>
                </div>
            </td>
        `;
        tbody.appendChild(detailTr);

        // 綁定點擊事件控制展開與收合
        tr.addEventListener('click', () => {
            const isOpened = detailTr.classList.contains('open');
            if (isOpened) {
                detailTr.classList.remove('open');
                tdArrow.innerHTML = '▶';
                tr.classList.remove('bg-gray-700/20');
            } else {
                detailTr.classList.add('open');
                tdArrow.innerHTML = '▼';
                tr.classList.add('bg-gray-700/20');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', loadDashboardData);
