import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 🔒 網頁端保障：此處使用 ANON_KEY，配合 Supabase 唯讀機制安全公開
const SUPABASE_URL = 'https://dfeqgzgjnkcinduhaqbx.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_eOJwtn52IK-ud7RAvZlXKQ_8Io078XT'; 
const TABLE_NAME = 'stock_data';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadDashboardData() {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('date', { ascending: false })
            .limit(500);

        if (error) throw error;

        if (!data || data.length === 0) {
            document.getElementById('buy-dip-body').innerHTML = `<tr><td colspan="4" class="text-center p-4">資料庫內無股票數據</td></tr>`;
            return;
        }

        const latestDate = data[0]?.date;
        document.getElementById('latest-date').textContent = `更新日期：${latestDate}`;
        
        const latestData = data.filter(row => row.date === latestDate);

        // 1. 渲染 Buy Dip 表格
        const buyDipStocks = latestData.filter(row => row.pullback_signal === 'BUY DIP');
        document.getElementById('buy-dip-count').textContent = `${buyDipStocks.length} 隻觸發`;
        renderTable('buy-dip-body', buyDipStocks, ['ticker', 'company_name', 'price', 'rating_hybrid'], true);

        // 2. 渲染 Vol Squeeze 表格 (過濾掉 Normal)
        const squeezeStocks = latestData.filter(row => row.vol_squeeze && row.vol_squeeze.includes('Squeeze'));
        document.getElementById('squeeze-count').textContent = `${squeezeStocks.length} 隻觸發`;
        renderTable('squeeze-body', squeezeStocks, ['ticker', 'company_name', 'price', 'macd_momentum'], false);

    } catch (error) {
        console.error("讀取失敗:", error);
        document.getElementById('buy-dip-body').innerHTML = `<tr><td colspan="4" class="text-red-400 p-4 text-center">連線失敗: ${error.message}</td></tr>`;
    }
}

function renderTable(tbodyId, dataArray, columns, isGreen) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = '';

    if (dataArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${columns.length}" class="p-4 text-center text-gray-500">今日無符合條件的股票</td></tr>`;
        return;
    }

    dataArray.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors';

        columns.forEach(col => {
            const td = document.createElement('td');
            td.className = 'p-3';
            
            if (col === 'price') {
                td.className += ' text-right font-mono text-yellow-400';
                td.textContent = row[col] !== null ? Number(row[col]).toFixed(2) : '-';
            } else if (col === 'rating_hybrid') {
                td.className += ' text-center text-yellow-500 font-bold';
                td.textContent = row[col];
            } else if (col === 'macd_momentum') {
                td.className += ` text-center font-semibold ${row[col] === 'Positive' ? 'text-green-400' : 'text-red-400'}`;
                td.textContent = row[col];
            } else {
                td.textContent = row[col] || '-';
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', loadDashboardData);
