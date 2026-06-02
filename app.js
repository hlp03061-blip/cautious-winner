import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://dfeqgzgjnkcinduhaqbx.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_eOJwtn52IK-ud7RAvZlXKQ_8Io078XT'; 
const TABLE_NAME = 'stock_data';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// AASTOCKS 基礎網址產生器
function generateAastocksUrl(ticker) {
    let cleanId = ticker.replace('.HK', '').trim();
    if (cleanId.length <= 4 && !isNaN(cleanId)) {
        cleanId = cleanId.padStart(6, '0');
    }
    return `https://charts.aastocks.com/servlet/Charts?fontsize=12&15MinDelay=T&lang=1&titlestyle=1&vol=1&Indicator=1&indpara1=10&indpara2=20&indpara3=50&indpara4=100&indpara5=150&subChart1=2&ref1para1=14&ref1para2=0&ref1para3=0&subChart2=3&ref2para1=12&ref2para2=26&ref2para3=9&subChart3=12&ref3para1=0&ref3para2=0&ref3para3=0&subChart4=9&ref4para1=0&ref4para2=0&ref4para3=0&subChart5=6&ref5para1=20&ref5para2=5&ref5para3=0&scheme=3&com=100&chartwidth=870&chartheight=1000&stockid=${cleanId}.HK&period=6&type=1&logoStyle=1&`;
}

// 將星星評級轉為數字，供排序使用
function getRatingScore(ratingStr) {
    if (!ratingStr || ratingStr === 'Avoid') return 0;
    return (ratingStr.match(/★/g) || []).length;
}

async function loadDashboardData() {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('date', { ascending: false })
            .limit(2000);

        if (error) throw error;
        if (!data || data.length === 0) return;

        const uniqueDataMap = new Map();
        data.forEach(row => {
            const uniqueKey = `${row.date}_${row.ticker}`;
            if (!uniqueDataMap.has(uniqueKey)) {
                uniqueDataMap.set(uniqueKey, row);
            }
        });
        const cleanedData = Array.from(uniqueDataMap.values());

        const allDates = [...new Set(cleanedData.map(row => row.date))].sort().reverse();
        const latestDate = allDates[0];
        const past5Dates = allDates.slice(0, 5); 

        const hsiToday = cleanedData.find(row => row.ticker === '^HSI' && row.date === latestDate);
        if (hsiToday) {
            document.getElementById('hsi-price').textContent = hsiToday.price ? Number(hsiToday.price).toFixed(2) : '-';
            const macdEl = document.getElementById('hsi-macd');
            macdEl.textContent = hsiToday.macd_momentum || 'N/A';
            macdEl.className = hsiToday.macd_momentum === 'Positive' 
                ? 'text-xs px-2 py-0.5 rounded ml-2 font-semibold bg-green-900 text-green-300'
                : 'text-xs px-2 py-0.5 rounded ml-2 font-semibold bg-red-900 text-red-300';
        }

        const stockData = cleanedData.filter(row => row.ticker !== '^HSI');

        const tickerMap = {};
        stockData.forEach(row => {
            if (!past5Dates.includes(row.date)) return;
            if (!tickerMap[row.ticker]) {
                tickerMap[row.ticker] = { ticker: row.ticker, history: [] };
            }
            tickerMap[row.ticker].history.push(row);
        });

        const compiledStocks = [];

        Object.values(tickerMap).forEach(stock => {
            const latestRecord = stock.history.find(h => h.date === latestDate);
            if (!latestRecord) return; 

            const squeezeCount = stock.history.filter(h => h.vol_squeeze && h.vol_squeeze.includes('Squeeze')).length;
            const hasBuyDipToday = latestRecord.pullback_signal === 'BUY DIP';

            if (squeezeCount > 0 || hasBuyDipToday) {
                compiledStocks.push({
                    ticker: stock.ticker,
                    company_name: latestRecord.company_name,
                    price: latestRecord.price,
                    squeeze_count: squeezeCount,
                    has_buy_dip: hasBuyDipToday,
                    rating_hybrid: latestRecord.rating_hybrid || 'Avoid',
                    rating_score: getRatingScore(latestRecord.rating_hybrid),
                    macd_momentum: latestRecord.macd_momentum,
                    rsi_14: latestRecord.rsi_14,
                    risk_note: latestRecord.risk_note,
                    market_cap: latestRecord.market_cap,
                    avg_money_vol_20d: latestRecord.avg_money_vol_20d,
                    dist_52w_high: latestRecord.dist_52w_high,
                    pe_ttm: latestRecord.pe_ttm,
                    forward_pe: latestRecord.forward_pe,
                    pb_ratio: latestRecord.pb_ratio,
                    div_yield: latestRecord.div_yield,
                    beta: latestRecord.beta,
                    sector: latestRecord.sector,
                    sma_trend: latestRecord.sma_trend,
                    total_return: latestRecord.total_return,
                    sharpe_ratio: latestRecord.sharpe_ratio,
                    max_drawdown: latestRecord.max_drawdown,
                    mkt_cap_check: latestRecord.mkt_cap_check,
                    money_vol_pct: latestRecord.money_vol_pct,
                    money_vol_signal: latestRecord.money_vol_signal
                });
            }
        });

        compiledStocks.sort((a, b) => {
            if (b.squeeze_count !== a.squeeze_count) {
                return b.squeeze_count - a.squeeze_count;
            }
            return b.rating_score - a.rating_score;
        });

        renderMainDashboard(compiledStocks);

    } catch (error) {
        console.error("處理數據失敗:", error);
        // colspan 改為 7
        document.getElementById('main-dashboard-body').innerHTML = `<tr><td colspan="7" class="text-red-400 p-4 text-center">系統優化出錯: ${error.message}</td></tr>`;
    }
}

function renderMainDashboard(stocks) {
    const tbody = document.getElementById('main-dashboard-body');
    tbody.innerHTML = '';
    document.getElementById('main-count').textContent = `${stocks.length} 隻策略追蹤中`;

    if (stocks.length === 0) {
        // colspan 改為 7
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-gray-500">無符合條件的股票</td></tr>`;
        return;
    }

    stocks.forEach((stock, index) => {
        const mainTrId = `main-row-${index}`;
        const detailTrId = `detail-row-${index}`;

        const tr = document.createElement('tr');
        tr.id = mainTrId;
        tr.className = 'border-b border-gray-700/50 hover:bg-gray-700/20 cursor-pointer transition-colors';
        
        const tdArrow = document.createElement('td');
        tdArrow.className = 'p-4 text-center text-gray-500 text-xs';
        tdArrow.innerHTML = '▶';
        tr.appendChild(tdArrow);

        // 修改 2：加入 Checkbox 列
        const tdCheckbox = document.createElement('td');
        tdCheckbox.className = 'p-4 text-center';
        tdCheckbox.innerHTML = `<input type="checkbox" class="stock-checkbox w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded cursor-pointer" value="${stock.ticker}">`;
        tr.appendChild(tdCheckbox);

        const tdTicker = document.createElement('td');
        tdTicker.className = 'p-4 font-mono font-bold flex items-center gap-2';
        
        const aastocksUrl = generateAastocksUrl(stock.ticker);
        tdTicker.innerHTML = `<a href="${aastocksUrl}" target="_blank" class="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1" title="點擊前往 AASTOCKS 圖表">🔗 ${stock.ticker}</a>`;
        
        if (stock.has_buy_dip) {
            tdTicker.innerHTML += `<span class="bg-emerald-950 text-emerald-400 border border-emerald-500 text-[10px] px-1.5 py-0.5 rounded font-sans font-bold animate-pulse">🏷️ BUY DIP</span>`;
        }
        tr.appendChild(tdTicker);

        const tdName = document.createElement('td');
        tdName.className = 'p-4 text-gray-300';
        tdName.textContent = stock.company_name;
        tr.appendChild(tdName);

        const tdPrice = document.createElement('td');
        tdPrice.className = 'p-4 text-right font-mono text-yellow-400 font-bold';
        tdPrice.textContent = stock.price ? Number(stock.price).toFixed(2) : '-';
        tr.appendChild(tdPrice);

        const tdRating = document.createElement('td');
        tdRating.className = 'p-4 text-center text-yellow-500 font-bold';
        tdRating.textContent = stock.rating_hybrid;
        tr.appendChild(tdRating);

        const tdCount = document.createElement('td');
        tdCount.className = 'p-4 text-center';
        
        let colorStyle = 'bg-gray-800 text-gray-400'; 
        if (stock.squeeze_count >= 5) {
            colorStyle = 'bg-red-950 text-red-400 border border-red-600 font-extrabold'; 
        } else if (stock.squeeze_count >= 3) {
            colorStyle = 'bg-orange-950 text-orange-400 border border-orange-600'; 
        } else if (stock.squeeze_count > 0) {
            colorStyle = 'bg-blue-950 text-blue-400 border border-blue-800'; 
        }
        
        tdCount.innerHTML = `<span class="px-3 py-0.5 rounded-full text-xs font-bold ${colorStyle}">${stock.squeeze_count} 天</span>`;
        tr.appendChild(tdCount);

        tbody.appendChild(tr);

        const detailTr = document.createElement('tr');
        detailTr.id = detailTrId;
        detailTr.className = 'detail-row bg-gray-900/60 border-b border-gray-800 text-xs text-gray-400';
        
        const formattedCap = stock.market_cap ? (stock.market_cap / 1e8).toFixed(1) + ' 億' : '-';
        const formattedVol = stock.avg_money_vol_20d ? (stock.avg_money_vol_20d / 1e6).toFixed(1) + ' 百萬' : '-';
        const formattedDist = stock.dist_52w_high ? (stock.dist_52w_high * 100).toFixed(1) + '%' : '-';
        const formattedYield = stock.div_yield ? (stock.div_yield * 100).toFixed(1) + '%' : '-';
        const formattedReturn = stock.total_return ? (stock.total_return * 100).toFixed(1) + '%' : '-';
        const formattedMaxDd = stock.max_drawdown ? (stock.max_drawdown * 100).toFixed(1) + '%' : '-';
        const formattedVolPct = stock.money_vol_pct ? (stock.money_vol_pct * 100).toFixed(3) + '%' : '-';

        // 前面的空td改為 colspan="2" (應對 Checkbox + 箭頭)
        detailTr.innerHTML = `
            <td colspan="2"></td>
            <td colspan="5" class="p-5 bg-gray-900/40">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-300">
                    <div class="space-y-1.5 bg-gray-800/20 p-3 rounded-lg border border-gray-800">
                        <h4 class="text-blue-400 font-bold border-b border-gray-800 pb-1 mb-2">📈 技術指標群</h4>
                        <div><span class="text-gray-500">MACD 動能：</span><span class="${stock.macd_momentum === 'Positive' ? 'text-green-400' : 'text-red-400'} font-semibold">${stock.macd_momentum || '-'}</span></div>
                        <div><span class="text-gray-500">RSI (14)：</span><span class="font-mono text-yellow-500 font-bold">${stock.rsi_14 ? Number(stock.rsi_14).toFixed(2) : '-'}</span></div>
                        <div><span class="text-gray-500">SMA 趨勢：</span><span class="px-1 rounded bg-gray-800">${stock.sma_trend || '-'}</span></div>
                        <div><span class="text-gray-500">距52週高位：</span><span class="font-mono">${formattedDist}</span></div>
                    </div>
                    
                    <div class="space-y-1.5 bg-gray-800/20 p-3 rounded-lg border border-gray-800">
                        <h4 class="text-emerald-400 font-bold border-b border-gray-800 pb-1 mb-2">🏦 財報基本面</h4>
                        <div><span class="text-gray-500">市盈率 (PE TTM)：</span><span class="font-mono">${stock.pe_ttm || '-'}</span></div>
                        <div><span class="text-gray-500">預期市盈率：</span><span class="font-mono">${stock.forward_pe || '-'}</span></div>
                        <div><span class="text-gray-500">市淨率 (PB Ratio)：</span><span class="font-mono">${stock.pb_ratio || '-'}</span></div>
                        <div><span class="text-gray-500">股息率 (Yield)：</span><span class="font-mono text-emerald-400 font-semibold">${formattedYield}</span></div>
                    </div>

                    <div class="space-y-1.5 bg-gray-800/20 p-3 rounded-lg border border-gray-800">
                        <h4 class="text-purple-400 font-bold border-b border-gray-800 pb-1 mb-2">🛡️ 風險與資金流</h4>
                        <div><span class="text-gray-500">20日均成交額：</span><span class="font-mono">${formattedVol}</span></div>
                        <div><span class="text-gray-500">量能信號 / 佔比：</span><span class="text-purple-300 font-semibold">${stock.money_vol_signal || '-'}</span> <span class="text-gray-500">(${formattedVolPct})</span></div>
                        <div><span class="text-gray-500">貝塔係數 (Beta)：</span><span class="font-mono">${stock.beta || '-'}</span></div>
                        <div><span class="text-gray-500">綜合風險提示：</span><span class="text-red-300 font-semibold">${stock.risk_note || '-'}</span></div>
                    </div>

                    <div class="md:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-4 bg-gray-900/80 p-3 rounded-lg border border-gray-800 text-xs">
                        <div><span class="text-gray-500">所屬板塊：</span><span class="text-gray-300 font-medium">${stock.sector || '-'}</span></div>
                        <div><span class="text-gray-500">市值檢查：</span><span class="text-gray-300 font-mono">${formattedCap} (${stock.mkt_cap_check || '-'})</span></div>
                        <div><span class="text-gray-500">年化總回報：</span><span class="font-mono text-green-400">${formattedReturn}</span></div>
                        <div><span class="text-gray-500">夏普比率 (Sharpe)：</span><span class="font-mono text-yellow-400 font-bold">${stock.sharpe_ratio ? Number(stock.sharpe_ratio).toFixed(2) : '-'}</span></div>
                        <div><span class="text-gray-500">歷史最大回撤：</span><span class="font-mono text-red-400">${formattedMaxDd}</span></div>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(detailTr);

        // 修改 2：防止點擊 Checkbox 時觸發列展開
        tr.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' || e.target.tagName === 'INPUT') return; 

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

// 事件監聽與初始化
document.addEventListener('DOMContentLoaded', () => {
    // 載入表格數據
    loadDashboardData();

    // 複製按鈕功能
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const checkedBoxes = document.querySelectorAll('.stock-checkbox:checked');
            if (checkedBoxes.length === 0) {
                alert('請先勾選你要複製的股票！');
                return;
            }

            // 提取勾選的值並以 ";" 分隔
            const tickers = Array.from(checkedBoxes).map(cb => cb.value).join(';');
            
            navigator.clipboard.writeText(tickers).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '✅ 已複製！';
                copyBtn.classList.replace('bg-gray-700', 'bg-green-700');
                copyBtn.classList.replace('border-gray-600', 'border-green-600');
                
                setTimeout(() => { 
                    copyBtn.innerHTML = originalText;
                    copyBtn.classList.replace('bg-green-700', 'bg-gray-700');
                    copyBtn.classList.replace('border-green-600', 'border-gray-600');
                }, 2000);
            }).catch(err => {
                console.error('複製失敗:', err);
                alert('複製失敗，請檢查瀏覽器權限');
            });
        });
    }
});
// === 程式碼結束標記 ===
