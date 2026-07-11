/* ===========================================================
   exchange.js
   負責：抓取 USD / CAD / CNY / AUD 兌 新台幣(TWD) 的即時匯率
   API：open.er-api.com（免費、免金鑰）。若你要換成其他匯率來源
        （例如台灣銀行牌告匯率），只要改 fetchRates() 內的網址即可。
=========================================================== */

const Exchange = (() => {
  const API_URL = 'https://open.er-api.com/v6/latest/USD';

  const CURRENCIES = [
    { code: 'USD', name: '美元', flag: '🇺🇸' },
    { code: 'CAD', name: '加拿大幣', flag: '🇨🇦' },
    { code: 'CNY', name: '人民幣', flag: '🇨🇳' },
    { code: 'AUD', name: '澳幣', flag: '🇦🇺' }
  ];

  async function fetchRates() {
    const gridEl = document.getElementById('rate-grid');
    const updatedEl = document.getElementById('rate-updated-time');
    gridEl.innerHTML = `<div class="rate-card loading"><div class="spinner"></div>載入中...</div>`;

    try {
      const res = await fetch(API_URL);
      const data = await res.json();

      if (data.result !== 'success') throw new Error('API 回傳失敗');

      const rates = data.rates; // 皆為「1 USD = ? 該幣別」
      const twdPerUsd = rates.TWD;

      gridEl.innerHTML = '';
      CURRENCIES.forEach((cur) => {
        // 換算成「1 該幣別 = ? TWD」
        const twdValue = cur.code === 'USD'
          ? twdPerUsd
          : twdPerUsd / rates[cur.code];

        const card = document.createElement('div');
        card.className = 'rate-card';
        card.innerHTML = `
          <div class="flag">${cur.flag}</div>
          <div class="code">1 ${cur.code}</div>
          <div class="value">${twdValue.toFixed(3)}</div>
          <div class="name">≈ ${twdValue.toFixed(2)} 新台幣 ・ ${cur.name}</div>
        `;
        gridEl.appendChild(card);
      });

      const t = new Date(data.time_last_update_utc || Date.now());
      updatedEl.textContent = `最後更新：${t.toLocaleString('zh-TW')}`;
    } catch (err) {
      gridEl.innerHTML = `<div class="rate-card loading">⚠️ 匯率載入失敗，請檢查網路連線後點「更新」重試。</div>`;
      console.error(err);
    }
  }

  function init() {
    fetchRates();
    document.getElementById('refresh-rate-btn').addEventListener('click', fetchRates);
    // 每 10 分鐘自動刷新一次
    setInterval(fetchRates, 10 * 60 * 1000);
  }

  return { init, fetchRates };
})();
