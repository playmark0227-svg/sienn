/* =========================================================
   令翠学 運命周期診断 ｜ script.js
   - 生年月日から「運命周期」の現在地と
     一番気になるタイミングを算出して表示します。
   ========================================================= */

(function () {
  "use strict";

  /* ===========================================================
     ① 設定（ここだけ変えれば運用できます）
     =========================================================== */
  const CONFIG = {
    // ▼ LINE公式アカウントの友だち追加URL。逸見弘子さんのURLに差し替えてください。
    //    例: "https://lin.ee/xxxxxxx"
    LINE_URL: "https://lin.ee/REPLACE_ME",

    // 診断対象にする生まれ年の範囲
    YEAR_MIN: 1930,
    YEAR_MAX: new Date().getFullYear(),

    // 「鑑定中…」の演出時間（ミリ秒）
    LOADING_MS: 1600,
  };

  /* ===========================================================
     ② 令翠学・運命周期データ（12時期 / 四季）
        ※ 時期名は令翠学の運命周期に基づく
     =========================================================== */
  // index 0..11 の順で一巡（春→夏→秋→冬）
  const PERIODS = [
    // --- 春（芽吹き・スタート）---
    { name: "開拓期", yomi: "かいたくき", season: "春",
      desc: "新しい扉が開く、種まきの時期。今まいた種が、これからの人生を形づくります。",
      highlight: false },
    { name: "生長期", yomi: "せいちょうき", season: "春",
      desc: "まいた種が芽を出し、ぐんぐん育つ時期。焦らず、丁寧に育てるほど実りが大きくなります。",
      highlight: false },
    { name: "決定期", yomi: "けっていき", season: "春",
      desc: "人生の方向が定まる大切な分かれ道。ここでの選択が、この先12年の流れを決めます。",
      highlight: true },

    // --- 夏（活発・華やか）---
    { name: "健康期", yomi: "けんこうき", season: "夏",
      desc: "勢いが増し、活動的になる時期。一方で無理がたまりやすく、心と体の土台づくりが鍵です。",
      highlight: false },
    { name: "人気期", yomi: "にんきき", season: "夏",
      desc: "人とのご縁が花ひらき、注目を集める華やかな時期。良い出会いとチャンスが舞い込みます。",
      highlight: false },
    { name: "油断期", yomi: "ゆだんき", season: "夏",
      desc: "好調だからこそ落とし穴のある時期。うまくいく時こそ、気のゆるみが思わぬ綻びを招きます。",
      highlight: true },

    // --- 秋（実り・収穫）---
    { name: "再開期", yomi: "さいかいき", season: "秋",
      desc: "止まっていた物事が再び動き出す時期。実りに向けて、もう一度エンジンをかけ直す頃です。",
      highlight: false },
    { name: "経済期", yomi: "けいざいき", season: "秋",
      desc: "これまでの努力が、成果や実利となって返ってくる時期。お金や評価が動きはじめます。",
      highlight: false },
    { name: "充実期", yomi: "じゅうじつき", season: "秋",
      desc: "努力が最大の実を結ぶ、人生の収穫期。同時に、次のステージへの大切な分岐点でもあります。",
      highlight: true },

    // --- 冬（休息・準備／要注意）---
    { name: "背信期", yomi: "はいしんき", season: "冬",
      desc: "冬の入り口。信じていたものが揺らぐこともあり、守りを固め、慎重に進みたい時期です。",
      highlight: true },
    { name: "令期", yomi: "れいき", season: "冬",
      desc: "静かに耐え、整える時期。大きく動くより、来たるべき春に向けて力を蓄えるのが吉です。",
      highlight: false },
    { name: "精算期", yomi: "せいさんき", season: "冬",
      desc: "ひとつの周期を清算し、リセットする大きな節目。古いものを手放し、新しい人生へ備える時です。",
      highlight: true },
  ];

  // 季節ごとの色と短い説明（運命周期グリッド用）
  const SEASONS = [
    { key: "春", color: "var(--spring)", sub: "芽吹き・スタート", from: 0 },
    { key: "夏", color: "var(--summer)", sub: "活発・華やか",     from: 3 },
    { key: "秋", color: "var(--autumn)", sub: "実り・収穫",       from: 6 },
    { key: "冬", color: "var(--winter)", sub: "休息・次への準備", from: 9 },
  ];

  /* ===========================================================
     ③ 算出ロジック（※近似版。後で公式ロジックに差し替え可）
        --------------------------------------------------------
        令翠学の正式な算出法は非公開のため、ここでは
        「運命は12年で一巡する」という考え方に基づいた
        再現性のある近似で現在地を求めています。

        ▼ 公式の対応表が手に入ったら、この関数の中身
          （periodIndexForAge）だけ差し替えればOKです。
     =========================================================== */

  // 生年月日から、その人固有の「周期のズレ（0..11）」を求める
  function personalOffset(y, m, d) {
    // 生年月日を一意な通し日数に変換し、12で割った余りを使う
    const days = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
    return ((days % 12) + 12) % 12;
  }

  // 満年齢（誕生日が来ているかを考慮）
  function ageAt(y, m, d, ref) {
    let age = ref.getFullYear() - y;
    const had =
      ref.getMonth() + 1 > m ||
      (ref.getMonth() + 1 === m && ref.getDate() >= d);
    if (!had) age -= 1;
    return age;
  }

  // 「年齢 n 歳のときの周期 index」を返す
  function periodIndexForAge(age, offset) {
    return (((age + offset) % 12) + 12) % 12;
  }

  // メインの診断計算
  function diagnose(y, m, d) {
    const now = new Date();
    const nowYear = now.getFullYear();
    const age = ageAt(y, m, d, now);
    const offset = personalOffset(y, m, d);

    // 今いる時期
    const currentIndex = periodIndexForAge(age, offset);

    // これから（今年含む）12年分を見て、「一番気になるタイミング」を探す。
    // highlight な時期のうち、もっとも近い年を採用する。
    let pick = null;
    for (let n = 0; n < 12; n++) {
      const idx = periodIndexForAge(age + n, offset);
      if (PERIODS[idx].highlight) {
        pick = { yearsAhead: n, calendarYear: nowYear + n, index: idx };
        break;
      }
    }
    // 念のためのフォールバック（highlightが見つからない設計上はあり得ない）
    if (!pick) {
      pick = { yearsAhead: 0, calendarYear: nowYear, index: currentIndex };
    }

    return {
      age,
      current: { index: currentIndex, period: PERIODS[currentIndex] },
      highlight: { ...pick, period: PERIODS[pick.index] },
    };
  }

  /* ===========================================================
     ④ DOM 構築
     =========================================================== */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);

  // 運命周期グリッド（四季×3時期）を描画
  function buildSeasonsGrid() {
    const grid = $("#seasonsGrid");
    if (!grid) return;
    SEASONS.forEach((s) => {
      const col = document.createElement("div");
      col.className = "season-col";
      col.style.setProperty("--season-color", s.color);
      let html =
        `<div class="season-head">${s.key}</div>` +
        `<p class="season-sub">${s.sub}</p>`;
      for (let i = s.from; i < s.from + 3; i++) {
        const p = PERIODS[i];
        html +=
          `<div class="period-item">` +
          `<span class="period-name">${p.name}</span>` +
          `<span class="period-yomi">${p.yomi}</span>` +
          `</div>`;
      }
      col.innerHTML = html;
      grid.appendChild(col);
    });
  }

  // 生年月日のセレクトを生成
  function buildDateSelects() {
    const yearSel = $("#year");
    const monthSel = $("#month");
    const daySel = $("#day");

    yearSel.appendChild(makeOption("", "----"));
    for (let y = CONFIG.YEAR_MAX; y >= CONFIG.YEAR_MIN; y--) {
      yearSel.appendChild(makeOption(y, y));
    }
    monthSel.appendChild(makeOption("", "--"));
    for (let m = 1; m <= 12; m++) monthSel.appendChild(makeOption(m, m));

    daySel.appendChild(makeOption("", "--"));
    rebuildDays();

    // 月・年を変えたら日数を調整
    yearSel.addEventListener("change", rebuildDays);
    monthSel.addEventListener("change", rebuildDays);

    function rebuildDays() {
      const prev = daySel.value;
      const y = parseInt(yearSel.value, 10);
      const m = parseInt(monthSel.value, 10);
      const max = y && m ? new Date(y, m, 0).getDate() : 31;
      // 既存の日オプションを一旦クリア（先頭の "--" は残す）
      daySel.length = 1;
      for (let d = 1; d <= max; d++) daySel.appendChild(makeOption(d, d));
      if (prev && parseInt(prev, 10) <= max) daySel.value = prev;
    }
  }

  function makeOption(value, label) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    return o;
  }

  /* ===========================================================
     ⑤ 診断結果の描画
     =========================================================== */
  function renderResult(result, nickname) {
    const box = $("#diagResult");
    const cur = result.current.period;
    const hi = result.highlight;

    const greet = nickname
      ? `<p class="result-greeting"><strong>${escapeHtml(nickname)}</strong> さんの運命周期</p>`
      : `<p class="result-greeting">あなたの運命周期</p>`;

    const whenLabel =
      hi.yearsAhead === 0
        ? `<span class="yr">${hi.calendarYear}年</span>・まさに今`
        : hi.yearsAhead === 1
        ? `<span class="yr">${hi.calendarYear}年</span>・来年`
        : `<span class="yr">${hi.calendarYear}年</span>（約${hi.yearsAhead}年後）`;

    box.innerHTML = `
      <div class="result-reveal">
        ${greet}

        <div class="result-now">
          <p class="result-now-label">あなたが今いる時期</p>
          <span class="result-now-season">${cur.season}の季節</span>
          <h3 class="result-now-name">${cur.name}</h3>
          <p class="result-now-yomi">${cur.yomi}</p>
          <p class="result-now-desc">${cur.desc}</p>
        </div>

        <div class="result-highlight">
          <span class="result-highlight-badge">★ 一番気になるタイミング</span>
          <p class="result-highlight-when">${whenLabel}</p>
          <p class="result-highlight-period">${hi.period.season}の季節 ｜ ${hi.period.name}（${hi.period.yomi}）</p>
          <p class="result-highlight-desc">${hi.period.desc}</p>
        </div>

        <div class="result-locked">
          <h3>…でも、わかるのはここまで。</h3>
          <p class="result-cta-text">
            この先のあなたの運命を本当に動かすには、もっと深い読み解きが必要です。
          </p>
          <ul class="locked-list">
            <li>あなたの<strong>宿星</strong>と、生まれ持った本来の性質</li>
            <li>これから12年、<strong>運命周期の全体像</strong></li>
            <li>その年・その月の<strong>具体的な開運の過ごし方</strong></li>
            <li>気になる相手との<strong>相性</strong>と縁の流れ</li>
          </ul>
          <a class="btn btn-line btn-lg btn-block result-line-btn" href="${CONFIG.LINE_URL}" target="_blank" rel="noopener">
            <span class="line-icon" aria-hidden="true">LINE</span>
            <span>逸見弘子に詳しく鑑定してもらう</span>
          </a>
        </div>

        <div class="result-actions">
          <button type="button" class="result-retry" id="retryBtn">別の生年月日で診断する</button>
        </div>
      </div>
    `;

    $("#retryBtn").addEventListener("click", resetToForm);
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  /* ===========================================================
     ⑥ フォーム送信フロー
     =========================================================== */
  function resetToForm() {
    $("#diagResult").hidden = true;
    $("#diagResult").innerHTML = "";
    $("#diagForm").hidden = false;
    $("#diagForm").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const y = parseInt($("#year").value, 10);
    const m = parseInt($("#month").value, 10);
    const d = parseInt($("#day").value, 10);
    const err = $("#formError");

    if (!y || !m || !d) {
      err.hidden = false;
      return;
    }
    err.hidden = true;

    const nickname = $("#nickname").value.trim();
    const result = diagnose(y, m, d);

    // フォームを隠して「鑑定中」演出 → 結果表示
    const form = $("#diagForm");
    const loading = $("#diagLoading");
    form.hidden = true;
    loading.hidden = false;
    loading.scrollIntoView({ behavior: "smooth", block: "center" });

    window.setTimeout(() => {
      loading.hidden = true;
      renderResult(result, nickname);
    }, CONFIG.LOADING_MS);
  }

  /* ===========================================================
     ⑦ 初期化
     =========================================================== */
  function applyLineLinks() {
    const cta = $("#ctaLineBtn");
    if (cta) cta.href = CONFIG.LINE_URL;
  }

  function init() {
    buildSeasonsGrid();
    buildDateSelects();
    applyLineLinks();
    $("#diagForm").addEventListener("submit", handleSubmit);

    const yearNow = $("#year-now");
    if (yearNow) yearNow.textContent = new Date().getFullYear();

    // 背景の星をふわっと表示
    requestAnimationFrame(() => {
      const stars = document.querySelector(".stars");
      if (stars) stars.style.opacity = "1";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
