function checkTaxSchedule() {
  if (typeof getCurrentTaxRates !== 'function') return;
  const rates = getCurrentTaxRates();
  const cfg = getTaxConfig();
  if (rates.standard !== cfg.standard || rates.reduced !== cfg.reduced) {
    const today = new Date().toISOString().slice(0,10);
    showToast(' 消費税率が ' + rates.standard + '% / ' + rates.reduced + '% に切り替わりました（' + today + '）');
  }
}


// ── シートメニュー（freee風 下から展開） ──
function openSheet(titleText, items) {
  // 既存のシートがあれば削除
  const existing = document.getElementById('sheet-container');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'sheet-container';

  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.onclick = function() { closeSheet(); };

  const sheet = document.createElement('div');
  sheet.className = 'sheet';

  let inner = '<div class="sheet-handle"></div>';
  if (titleText) inner += '<div class="sheet-title">' + titleText + '</div>';

  items.forEach(function(item, idx) {
    inner += '<div class="sheet-item" data-sheet-idx="' + idx + '">'
      + '<div class="sheet-item-icon">' + item.icon + '</div>'
      + '<div class="sheet-item-text">'
      + '<div class="sheet-item-label">' + item.label + '</div>'
      + (item.sub ? '<div class="sheet-item-sub">' + item.sub + '</div>' : '')
      + '</div>'
      + '<div class="sheet-item-arrow">›</div>'
      + '</div>';
  });

  sheet.innerHTML = inner;
  // イベントをDOMで設定（インラインonclickを避ける）
  sheet.querySelectorAll('.sheet-item').forEach(function(el) {
    var idx = parseInt(el.dataset.sheetIdx);
    var item = items[idx];
    if (!item) return;
    el.onclick = function() {
      closeSheet();
      try { eval(item.action); } catch(e) { console.error('sheet action error:', e); }
    };
  });
  container.appendChild(bg);
  container.appendChild(sheet);
  document.getElementById('app').appendChild(container);

  // アニメーション
  requestAnimationFrame(function() {
    bg.classList.add('open');
    sheet.classList.add('open');
  });
}

function closeSheet() {
  const container = document.getElementById('sheet-container');
  if (!container) return;
  const bg = container.querySelector('.sheet-bg');
  const sheet = container.querySelector('.sheet');
  if (bg) bg.classList.remove('open');
  if (sheet) sheet.classList.remove('open');
  setTimeout(function() { if (container.parentNode) container.remove(); }, 280);
}

// ── 撮影メニュー（シート版） ──
function showCaptureMenu() {
  if (!currentAcct) { mobileTab('receipt'); return; }
  openSheet('記録する', [
    { icon: '', label: 'レシートを撮影', sub: 'カメラで撮影 → AI自動仕訳', action: "mobileTab('receipt')" },
    { icon: '', label: 'カード明細CSV', sub: '楽天・三井住友・アメックスなど8社対応', action: "showCardCSVImport()" },
    { icon: '', label: 'Gmail取込', sub: 'メール本文から仕訳を作成', action: "mobileTab('gmail')" },
    { icon: '', label: '自動仕訳', sub: '銀行明細・まとめて処理', action: "mobileTab('auto')" },
    { icon: '!', label: '要確認リスト', sub: '未確定の仕訳を確認・修正', action: "mobileTab('review')" },
  ]);
}

// ── 帳簿メニュー（シート版） ──
function showLedgerMenu() {
  if (!currentAcct) { mobileTab('journal'); return; }
  openSheet('帳簿を確認', [
    { icon: '', label: '仕訳帳', sub: '全仕訳の一覧・修正・CSV出力', action: "mobileTab('journal')" },
    { icon: '', label: '損益計算書', sub: '売上・経費・利益の集計', action: "mobileTab('pl')" },
    { icon: '', label: '消費税集計', sub: '課税・非課税・納付額', action: "mobileTab('tax')" },
    { icon: '', label: '貸借対照表', sub: '資産・負債・純資産', action: "mobileTab('bs')" },
  ]);
}

// ── 申告メニュー（シート版） ──
function showTaxMenu() {
  if (!currentAcct) { mobileTab('checklist'); return; }
  openSheet('確定申告の準備', [
    { icon: '', label: '確定申告チェック', sub: 'AI診断・提出前の確認', action: "mobileTab('checklist')" },
    { icon: '', label: '家事按分', sub: '家賃・光熱費の事業割合', action: "mobileTab('kasan')" },
    { icon: '', label: '固定資産台帳', sub: '減価償却・一括償却', action: "mobileTab('assets')" },
  ]);
}

// ── メニュー（シート版） ──
function showMobileMenu() {
  var isRE = currentAcct && typeof hasRealEstate === 'function' && hasRealEstate(currentAcct);
  var plan = currentAcct ? getPlan(currentAcct) : { name: 'フリー' };
  var panel = document.getElementById('mobile-menu-panel');
  var inner = document.getElementById('mobile-menu-inner');
  if (!panel || !inner) return;

  var acctKeys = Object.keys(accounts);
  var acctHtml = '';
  if (acctKeys.length > 1) {
    acctHtml = '<div style="margin-bottom:12px">'
      + '<div style="font-family:var(--sans);font-size:9px;font-weight:700;letter-spacing:2px;color:var(--text3);margin-bottom:8px">事業所を切り替える</div>'
      + '<div style="display:flex;flex-direction:column;gap:6px" id="acct-switch-list"></div>'
      + '</div>'
      + '<div style="height:1px;background:var(--border);margin-bottom:12px"></div>';
  }

  // ── 家計簿セクション ──
  var kakeiboHtml = '<div style="margin-bottom:12px">'
    + '<div style="font-family:var(--sans);font-size:9px;font-weight:700;letter-spacing:2px;color:var(--text3);margin-bottom:8px">家計簿</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">'
    + menuBtn('家計ホーム', "mobileTab('kakeibo_home')", false, true)
    + menuBtn('収支一覧', "mobileTab('kakeibo_list')", false, true)
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
    + menuBtn('予算管理', "mobileTab('kakeibo_budget')", false, true)
    + menuBtn('グラフ', "mobileTab('kakeibo_graph')", false, true)
    + '</div>'
    + '</div>'
    + '<div style="height:1px;background:var(--border);margin-bottom:12px"></div>';

  var financeHtml = '<div style="margin-bottom:12px">'
    + '<div style="font-family:var(--sans);font-size:9px;font-weight:700;letter-spacing:2px;color:var(--text3);margin-bottom:8px">財務</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">'
    + menuBtn('損益計算書', "mobileTab('pl')", false, true)
    + menuBtn('貸借対照表', "mobileTab('bs')", false, true)
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
    + menuBtn('試算表', "mobileTab('trialbalance')", false, true)
    + menuBtn('資金繰り', "mobileTab('cashflow')", false, true)
    + '</div>'
    + '</div>'
    + '<div style="height:1px;background:var(--border);margin-bottom:12px"></div>';

  var otherItems = [];
  if (isRE) otherItems.push({ label: '不動産管理', sub: '物件・入居者・家賃管理', tab: 'realestate' });
  otherItems.push(
    { label: '請求書', sub: 'インボイス番号・源泉徴収', tab: 'invoices' },
    { label: '取引先', sub: '支払調書・取引先管理', tab: 'partners' },
    { label: '予算管理', sub: '月次予算・超過アラート', tab: 'budget' },
    { label: '判定ルール', sub: 'AI学習・ルール管理', tab: 'rules' },
    { label: '通知設定', sub: 'LINE・アラート設定', tab: 'notify' },
    { label: '消費税率の設定', sub: '税率変更・改定スケジュール', tab: '_taxconfig' },
    { label: '+ 事業者を追加', sub: '新しい事業者・屋号を追加', tab: '_addacct' }
  );

  var otherHtml = otherItems.map(function(item, i) {
    return '<button class="mm-other-btn" data-tab="' + item.tab + '" style="'
      + 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;'
      + 'background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);'
      + 'font-family:var(--font);font-size:13px;cursor:pointer;text-align:left;width:100%;margin-bottom:6px">'
      + '<div><div style="font-weight:700">' + item.label + '</div>'
      + '<div style="font-size:10px;color:var(--text3);font-family:var(--sans)">' + item.sub + '</div></div>'
      + '<span style="color:var(--text3)">→</span></button>';
  }).join('');

  inner.innerHTML = '<div style="width:36px;height:4px;background:var(--border2);border-radius:99px;margin:0 auto 16px"></div>'
    + '<div style="font-family:var(--sans);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--text3);margin-bottom:12px">'
    + (plan.name || '') + 'プラン</div>'
    + acctHtml + kakeiboHtml + financeHtml + otherHtml;

  // 事業所ボタンをDOMで生成（クォート問題を回避）
  var switchList = document.getElementById('acct-switch-list');
  if (switchList) {
    acctKeys.forEach(function(key) {
      var ac = accounts[key];
      var isActive = key === currentAcct;
      var btn = document.createElement('button');
      btn.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;'
        + 'background:' + (isActive ? 'var(--text)' : 'var(--bg3)') + ';'
        + 'color:' + (isActive ? '#fff' : 'var(--text)') + ';'
        + 'border:1px solid var(--border);border-radius:var(--radius);'
        + 'font-family:var(--font);font-size:13px;cursor:pointer;text-align:left;width:100%';
      btn.innerHTML = '<div style="flex:1"><div style="font-weight:700">' + (ac.name || key) + '</div>'
        + '<div style="font-size:10px;opacity:0.6;font-family:var(--sans)">' + key + '</div></div>'
        + (isActive ? '<div style="font-size:10px;font-family:var(--sans)">使用中</div>' : '');
      btn.onclick = function() { selectAccount(key); hideMobileMenu(); };
      switchList.appendChild(btn);
    });
  }

  // その他メニューのイベント設定
  inner.querySelectorAll('.mm-other-btn').forEach(function(btn) {
    btn.onclick = function() {
      var tab = btn.dataset.tab;
      if (tab === '_taxconfig') { hideMobileMenu(); showTaxConfigModal(); }
      else if (tab === '_addacct') { hideMobileMenu(); showAddAccount(); }
      else { mobileTab(tab); hideMobileMenu(); }
    };
  });

  panel.style.display = 'block';
}

function menuBtn(label, action, active, small) {
  return '<button onclick="' + action + ';hideMobileMenu()" style="'
    + 'padding:' + (small ? '10px 8px' : '12px') + ';'
    + 'background:' + (active ? 'var(--text)' : 'var(--bg3)') + ';'
    + 'color:' + (active ? '#fff' : 'var(--text)') + ';'
    + 'border:1px solid var(--border);border-radius:var(--radius);'
    + 'font-family:var(--font);font-size:' + (small ? '12px' : '13px') + ';'
    + 'font-weight:700;cursor:pointer;text-align:center;width:100%">'
    + label + '</button>';
}


// ── デスクトップナビの描画 ──


// デスクトップ用サイドバーのロゴ描画


const APP_VERSION = '20260510';
var APP_PASSWORD = 'ninja2026';
var PW_KEY = 'ninja_choba_auth';
const MODEL="claude-sonnet-4-20250514";
let currentAcct=null,accounts={},currentTab="dashboard";
let searchTimer=null,clockTimer=null,rtTimer=null;
let processingQueue=false;

// ── 時計 ──
function startClock(){
  clockTimer=setInterval(()=>{
    const now=new Date();
    var clockEl=document.getElementById('clock');if(clockEl)clockEl.textContent=now.toLocaleTimeString('ja-JP');
    checkScheduledTasks(now);
  },1000);
}

// ── スケジュールチェック（毎秒）──
function checkScheduledTasks(now){
  if(!currentAcct)return;
  const a=accounts[currentAcct];
  const hhmm=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  if(hhmm==='21:00'&&now.getSeconds()===0){triggerAutoJournal('scheduled');}
}

// ── キーワード辞書（独自分類ルール） ──
const KW={
  '旅費交通費':{kw:['suica','pasmo','jr','新幹線','ana','jal','タクシー','uber','電車','バス','地下鉄','高速','etc','ホテル','旅館','宿泊','inn','出張'],tax:10,type:'課税'},
  '通信費':{kw:['aws','google cloud','azure','chatgpt','anthropic','openai','notion','slack','zoom','teams','dropbox','github','vercel','ntt','ドコモ','au','softbank','インターネット','携帯','スマホ','wifi'],tax:10,type:'課税'},
  '消耗品費':{kw:['amazon','ヨドバシ','ビックカメラ','コジマ','アスクル','コクヨ','文具','コピー用紙','ノート','インク','usb','ケーブル','マウス','袋代','レジ袋','コンビニ袋'],tax:10,type:'課税'},
  '水道光熱費':{kw:['東京電力','関西電力','中部電力','電気代','東京ガス','大阪ガス','ガス代','水道代','灯油'],tax:10,type:'課税'},
  '広告宣伝費':{kw:['google広告','facebook広告','instagram広告','広告費','チラシ','パンフレット','名刺'],tax:10,type:'課税'},
  '外注費':{kw:['業務委託','外注','フリーランス','制作委託'],tax:10,type:'課税'},
  '仕入高':{kw:['食材','原材料','仕入','業務スーパー'],tax:8,type:'課税（軽減）'},
  '新聞図書費':{kw:['書籍','参考書','資格','テキスト'],tax:10,type:'課税'},
  '地代家賃':{kw:['家賃','賃料','地代','事務所','店舗'],tax:10,type:'課税'},
  '研究開発費':{kw:['セミナー','研修','講習','勉強会','スクール','受講料'],tax:10,type:'課税'},
  '車両費':{kw:['ガソリン','eneos','出光','コスモ','車検'],tax:10,type:'課税'},
  '支払手数料':{kw:['決済手数料','振込手数料','クレジット手数料','エアレジ手数料','square手数料'],tax:10,type:'課税'},
};
const EXCLUDE=[
  {id:'ex1',label:'内容不明デビット',pat:/^デビット[\d\s]+$/i},
  {id:'ex2',label:'借入金返済',pat:/公庫|融資|ローン返済|借入金返済/i},
  {id:'ex3',label:'社会保険・税金',pat:/年金|厚生年金|健保|源泉税|所得税|住民税/i},
  {id:'ex4',label:'給与支払い',pat:/^給与|^給料|^賃金/},
  {id:'ex5',label:'投資・証券',pat:/証券|株式|投資信託|fx|仮想通貨/i},
  {id:'ex6',label:'ATM出金',pat:/atm出金|atm引出|現金引出/i},
  {id:'ex7',label:'内部振替',pat:/自社振替|内部取引/i},
];
const SMBC_SPECIAL=[
  {pat:/宿泊税|入湯税|観光税/i,cat:'旅費交通費',tax:0,type:'不課税'},
  {pat:/印紙税|登録免許税|固定資産税/i,cat:'租税公課',tax:0,type:'不課税'},
  {pat:/火災保険|自動車保険|損害保険|保険料/i,cat:'損害保険料',tax:0,type:'非課税'},
  {pat:/支払利息|借入.*利息/i,cat:'利子割引料',tax:0,type:'非課税'},
];

// ── コメント・摘要から人数を抽出するユーティリティ ──
// 例: "2名", "3人", "4 people", "5名で" などに対応
function extractPersons(text){
  if(!text)return 0;
  const m=text.match(/([1-9][0-9]?)\s*(?:名|人|名様|名で|pax|people|persons)/);
  return m?parseInt(m[1]):0;
}

function phase1(desc,amount=0,personsOverride){
  // 学習ルールを最優先で適用
  if (typeof applyLearningRules === 'function') {
    const learned = applyLearningRules(desc, currentAcct);
    if (learned) return learned;
  }
  const d=desc.toLowerCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g,s=>String.fromCharCode(s.charCodeAt(0)-0xFEE0));
  for(const ex of EXCLUDE)if(ex.pat.test(desc))return{excluded:true,rule:ex};
  // 振込パターン
  if(/振込.*[ァ-ヶー]{2,}/.test(desc))return{category:'外注費',tax:10,type:'課税',note:'振込＋カタカナ人名→外注費',phase:'phase1',confidence:'high'};
  if(/振込.*(弁護士|司法書士|税理士|会計士|社労士)/.test(desc))return{category:'支払報酬料',tax:10,type:'課税',note:'振込＋士業名→支払報酬料',phase:'phase1',confidence:'high'};
  // SMBC特殊
  for(const r of SMBC_SPECIAL)if(r.pat.test(desc))return{category:r.cat,tax:r.tax,type:r.type,phase:'phase1',confidence:'high'};
  // ── 飲食費 1人あたり単価判定ルール（改訂版）──
  // 合計金額ではなく「合計÷人数＝1人あたり単価」で判定する。
  // 人数が不明（persons=0）の場合は1人として計算し、信頼度を medium に落とす。
  // 1人あたり5,000円以下 → 会議費（一般的な基準）
  // 1人あたり5,000円超  → 接待交際費
  const isRestaurant=/(飲食|食堂|レストラン|居酒屋|ラーメン|寿司|焼き|カフェ|coffee|スタバ|スターバックス|ドトール|タリーズ|コメダ|割烹|焼肉|しゃぶ|天ぷら|bar|バー|izakaya|bistro)/.test(d);
  if(isRestaurant&&amount>0){
    // persons は phase1() の第3引数として受け取る（デフォルト0）
    const n=arguments[2]||0;
    const knownPersons=n>0;
    const persons=knownPersons?n:1;
    const unitPrice=Math.round(amount/persons);
    const threshold=5000; // 1人あたり5,000円が会議費/接待交際費の境界
    const cat=unitPrice<=threshold?'会議費':'接待交際費';
    const conf=knownPersons?'high':'medium';
    const note=knownPersons
      ? `1人あたり${unitPrice.toLocaleString()}円（${amount.toLocaleString()}円÷${persons}名）→ ${unitPrice<=threshold?'5,000円以下→会議費':'5,000円超→接待交際費'}`
      : `人数不明のため1人として計算。単価${unitPrice.toLocaleString()}円 → ${cat}（人数確認推奨）`;
    return{category:cat,tax:10,type:'課税',note,phase:'phase1',confidence:conf,unit_price:unitPrice,persons};
  }
  // キーワードマッチ
  for(const[cat,rule]of Object.entries(KW)){
    if(rule.kw.some(kw=>d.includes(kw.toLowerCase())))
      return{category:cat,tax:rule.tax,type:rule.type,phase:'phase1',confidence:'high'};
  }
  return null;
}

// ── ストレージ ──
async function loadAccounts(){
  // ── 1. Supabase（設定済みの場合）──
  const sbReady = await SB.init();
  if (sbReady && SB.client) {
    // セッション確認
    try {
      const { data: { session } } = await SB.client.auth.getSession();
      if (session && session.user) {
        SB.userId = session.user.id;
        const sbLoaded = await loadFromSupabase(session.user.id);
        if (sbLoaded) {
          renderSidebar(); startClock(); return;
        }
      }
    } catch(e) {}
  }

  // ── 2. window.storage（Claude.ai環境）──
  try{
    if(typeof window !== 'undefined' && window.storage && typeof window.storage.list === 'function'){
      const r = await window.storage.list('ninja7:');
      if(r && r.keys){
        for(const k of r.keys){
          try{ const d=await window.storage.get(k); if(d&&d.value) accounts[k.replace('ninja7:','')]=JSON.parse(d.value); }catch(e2){}
        }
      }
    }
  }catch(e){}

  // ── 3. localStorage（本番ブラウザ）──
  if(!Object.keys(accounts).length){
    let loaded = false;
    try{
      for(const k of Object.keys(localStorage)){
        if(k.startsWith('ninjaX:')){
          try {
            const email = k.replace('ninjaX:','');
            const parsed = JSON.parse(localStorage.getItem(k));
            if(parsed && parsed.name) { accounts[email] = parsed; loaded = true; }
          } catch(e2) {}
        }
      }
    }catch(e){}
    if(!loaded) loadDemo(); else renderSidebar();
  } else renderSidebar();
  startClock();
  // accounts読み込み後、currentAcctが未設定なら最初の事業者を選択
  _autoSelectAccount();
}

function _autoSelectAccount() {
  if (currentAcct && accounts[currentAcct]) return;
  var keys = Object.keys(accounts);
  if (keys.length === 0) return;
  // デモアカウントのemailがある場合は優先
  var loginEmail = '';
  try { loginEmail = sessionStorage.getItem('login_email') || ''; } catch(e) {}
  var target = (loginEmail && accounts[loginEmail]) ? loginEmail : keys[0];
  currentAcct = target;
  // UIを更新
  if (typeof renderSidebar === 'function') renderSidebar();
  var titleEl = document.getElementById('topbar-title');
  var a = accounts[target];
  if (titleEl && a) titleEl.textContent = (a.name || '') + (a.business ? ' — ' + a.business : '');
  var tabsBar = document.getElementById('tabs-bar');
  if (tabsBar) tabsBar.style.display = 'flex';
  if (typeof updateBadges === 'function') updateBadges();
  if (typeof updateMobileNav === 'function') updateMobileNav();
}
async function save(email){
  // Supabase（設定済みの場合）
  if (SB.client && SB.userId) {
    saveAccountToSupabase(email).catch(function(){});
    // 仕訳も同期
    const a = accounts[email];
    if (a && a.journals) {
      const recentJournals = a.journals.filter(function(j){ return !j._synced; });
      recentJournals.forEach(function(j) {
        saveJournalToSupabase(email, j).then(function(ok){ if(ok) j._synced = true; }).catch(function(){});
      });
    }
  }
  // localStorage（バックアップ）
  try{ localStorage.setItem('ninjaX:'+email, JSON.stringify(accounts[email])); }catch(e){}
  // window.storage（Claude.ai環境）
  try{
    if(typeof window !== 'undefined' && window.storage && typeof window.storage.set === 'function')
      await window.storage.set('ninja7:'+email, JSON.stringify(accounts[email]));
  }catch(e){}
}


function mkJournals(){
  const year = new Date().getFullYear();
  return [
    {id:1,date:`${year}-01-10`,type:'income', category:'売上高',       description:'デザイン料 A社', amount:300000, tax_rate:10, tax_type:'課税', status:'confirmed', phase:'phase1'},
    {id:2,date:`${year}-01-15`,type:'expense',category:'通信費',       description:'ソフトバンク',   amount:8800,   tax_rate:10, tax_type:'課税', status:'confirmed', phase:'phase1'},
    {id:3,date:`${year}-01-20`,type:'expense',category:'消耗品費',     description:'ヨドバシカメラ', amount:15400,  tax_rate:10, tax_type:'課税', status:'confirmed', phase:'phase1'},
    {id:4,date:`${year}-02-05`,type:'income', category:'売上高',       description:'デザイン料 B社', amount:250000, tax_rate:10, tax_type:'課税', status:'confirmed', phase:'phase1'},
    {id:5,date:`${year}-02-14`,type:'expense',category:'接待交際費',   description:'銀座 鮨さいとう', amount:28000, tax_rate:10, tax_type:'課税', status:'confirmed', phase:'phase2'},
    {id:6,date:`${year}-02-20`,type:'expense',category:'会議費',       description:'スターバックス',  amount:1200,  tax_rate:10, tax_type:'課税', status:'confirmed', phase:'phase1'},
    {id:7,date:`${year}-03-01`,type:'income', category:'売上高',       description:'デザイン料 C社', amount:400000, tax_rate:10, tax_type:'課税', status:'confirmed', phase:'phase1'},
    {id:8,date:`${year}-03-10`,type:'expense',category:'地代家賃',     description:'事務所家賃',     amount:80000,  tax_rate:10, tax_type:'課税', status:'confirmed', phase:'phase1'},
    {id:9,date:`${year}-03-15`,type:'expense',category:'水道光熱費',   description:'東京電力',       amount:12000,  tax_rate:10, tax_type:'課税', status:'confirmed', phase:'phase1'},
    {id:10,date:`${year}-04-01`,type:'expense',category:'広告宣伝費',  description:'Google広告',     amount:30000,  tax_rate:10, tax_type:'課税', status:'confirmed', phase:'phase1'},
  ];
}

function loadDemo(){
  const today=new Date().toISOString().slice(0,10);
  accounts['tanaka@example.com']={
    name:'田中 太郎',email:'tanaka@example.com',business:'フリーランスデザイナー',year:2026,plan:'solo',trial_start:'2026-04-01',
    journals:mkJournals(),
    receipts:[],invoices:[
      {id:1,date:'2026-03-01',vendor:'山田デザイン事務所',amount:55000,withholding:5621,net:49379,category:'外注費',status:'unpaid',due_date:'2026-04-30',is_qualified:true},
      {id:2,date:'2026-04-01',vendor:'鈴木カメラマン',amount:33000,withholding:3366,net:29634,category:'外注費',status:'unpaid',due_date:'2026-04-25',is_qualified:false},
    ],
    pending:[],gmail_items:[],
    auto_queue:[
      {id:1,date:today,description:'スターバックス渋谷店',amount:1650,status:'pending',raw:'STARBUCKS SHIBUYA 1650'},
      {id:2,date:today,description:'AWS Tokyo',amount:9240,status:'pending',raw:'Amazon Web Services'},
      {id:3,date:today,description:'振込 ヤマダタロウ',amount:88000,status:'pending',raw:'振込 ヤマダタロウ'},
      {id:4,date:today,description:'東京電力 電気代',amount:9800,status:'pending',raw:'トウキョウデンリョク'},
      {id:5,date:today,description:'ローン返済 住宅',amount:85000,status:'pending',raw:'ローン返済'},
      {id:6,date:today,description:'JRタクシー渋谷',amount:1360,status:'pending',raw:'タクシー'},
      {id:7,date:today,description:'コンビニ袋代',amount:3,status:'pending',raw:'コンビニ袋代'},
      {id:8,date:today,description:'Notion月額',amount:3300,status:'pending',raw:'Notion'},
    ],
    depreciation:[{id:1,name:'MacBook Pro',cost:248000,method:'straight',years:4,start:'2025-04-01',current_year_amount:62000}]
  };
  save('tanaka@example.com');
  const q2={
    name:'鈴木 花子',email:'suzuki@example.com',business:'カフェ 花',year:2026,plan:'pro',trial_start:'2026-04-01',
    journals:[
      {id:1,date:'2026-01-10',description:'エアレジ売上 1月',amount:485000,type:'income',category:'売上高',tax_type:'課税',status:'confirmed'},
      {id:2,date:'2026-02-10',description:'エアレジ売上 2月',amount:512000,type:'income',category:'売上高',tax_type:'課税',status:'confirmed'},
      {id:3,date:'2026-03-10',description:'エアレジ売上 3月',amount:498000,type:'income',category:'売上高',tax_type:'課税',status:'confirmed'},
      {id:4,date:'2026-01-15',description:'業務スーパー 食材仕入',amount:88000,type:'expense',category:'仕入高',tax_rate:8,tax_type:'課税（軽減）',status:'confirmed'},
      {id:5,date:'2026-02-15',description:'業務スーパー 食材仕入',amount:92000,type:'expense',category:'仕入高',tax_rate:8,tax_type:'課税（軽減）',status:'confirmed'},
      {id:6,date:'2026-03-15',description:'業務スーパー 食材仕入',amount:85000,type:'expense',category:'仕入高',tax_rate:8,tax_type:'課税（軽減）',status:'confirmed'},
      {id:7,date:'2026-01-01',description:'店舗家賃',amount:120000,type:'expense',category:'地代家賃',tax_rate:10,tax_type:'課税',status:'confirmed'},
      {id:8,date:'2026-02-01',description:'店舗家賃',amount:120000,type:'expense',category:'地代家賃',tax_rate:10,tax_type:'課税',status:'confirmed'},
      {id:9,date:'2026-03-01',description:'店舗家賃',amount:120000,type:'expense',category:'地代家賃',tax_rate:10,tax_type:'課税',status:'confirmed'},
    ],
    receipts:[],invoices:[],pending:[],gmail_items:[],auto_queue:[],depreciation:[]
  };
  accounts['suzuki@example.com']=q2;save('suzuki@example.com');

  // 不動産オーナーのデモ
  const q3={
    name:'山田 健一',email:'yamada@realestate.com',business:'不動産賃貸業',year:2026,plan:'realestate',trial_start:'2026-04-01',
    journals:[
      {id:1,date:'2026-01-25',description:'[不]賃料収入 1月（101号室〜305号室）',amount:680000,type:'income',category:'[不]賃料収入',tax_type:'非課税',status:'confirmed',income_type:'realestate'},
      {id:2,date:'2026-02-25',description:'[不]賃料収入 2月',amount:660000,type:'income',category:'[不]賃料収入',tax_type:'非課税',status:'confirmed',income_type:'realestate'},
      {id:3,date:'2026-03-25',description:'[不]賃料収入 3月',amount:680000,type:'income',category:'[不]賃料収入',tax_type:'非課税',status:'confirmed',income_type:'realestate'},
      {id:4,date:'2026-01-01',description:'[不]管理委託費 1月',amount:34000,type:'expense',category:'[不]管理委託費',tax_rate:10,tax_type:'課税',status:'confirmed',income_type:'realestate'},
      {id:5,date:'2026-02-01',description:'[不]管理委託費 2月',amount:34000,type:'expense',category:'[不]管理委託費',tax_rate:10,tax_type:'課税',status:'confirmed',income_type:'realestate'},
      {id:6,date:'2026-03-01',description:'[不]管理委託費 3月',amount:34000,type:'expense',category:'[不]管理委託費',tax_rate:10,tax_type:'課税',status:'confirmed',income_type:'realestate'},
      {id:7,date:'2026-01-31',description:'[不]固定資産税 第1期',amount:185000,type:'expense',category:'[不]租税公課',tax_rate:0,tax_type:'不課税',status:'confirmed',income_type:'realestate'},
      {id:8,date:'2026-02-10',description:'[不]損害保険料（火災・地震）',amount:48000,type:'expense',category:'[不]損害保険料',tax_rate:0,tax_type:'非課税',status:'confirmed',income_type:'realestate'},
      {id:9,date:'2026-02-20',description:'[不]修繕費 101号室エアコン交換',amount:85000,type:'expense',category:'[不]修繕費',tax_rate:10,tax_type:'課税',status:'confirmed',income_type:'realestate'},
      {id:10,date:'2026-03-31',description:'[不]借入金利息 3月分',amount:62000,type:'expense',category:'[不]借入金利息',tax_rate:0,tax_type:'非課税',status:'confirmed',income_type:'realestate'},
    ],
    receipts:[],invoices:[],pending:[],gmail_items:[],auto_queue:[],depreciation:[],
    budgets:{},line_token:'',partners_custom:[],freee_config:{connected:false},freee_sync_log:[],
    // 不動産専用データ
    properties:[
      {
        id:'p1', name:'グリーンハイツ渋谷', type:'apartment',
        address:'東京都渋谷区代々木1-1-1', built:'1998-04-01',
        structure:'rc', floors:3, total_units:8,
        acquisition_cost:45000000, acquisition_date:'2015-03-01',
        land_cost:20000000, building_cost:25000000,
        loan_balance:28000000, loan_rate:1.2, loan_monthly:95000,
        management_company:'渋谷不動産管理株式会社', management_fee_rate:5,
        notes:''
      }
    ],
    tenants:[
      {id:'t1',property_id:'p1',room:'101',name:'田中 太郎',rent:82000,common_fee:3000,parking:0,deposit:164000,key_money:82000,contract_start:'2023-04-01',contract_end:'2025-03-31',status:'active',notes:'更新済み'},
      {id:'t2',property_id:'p1',room:'102',name:'佐藤 花子',rent:78000,common_fee:3000,parking:0,deposit:156000,key_money:0,contract_start:'2024-07-01',contract_end:'2026-06-30',status:'active',notes:''},
      {id:'t3',property_id:'p1',room:'201',name:'',rent:85000,common_fee:3000,parking:0,deposit:0,key_money:0,contract_start:'',contract_end:'',status:'vacant',notes:'2026年1月退去'},
      {id:'t4',property_id:'p1',room:'202',name:'鈴木 一郎',rent:85000,common_fee:3000,parking:5000,deposit:170000,key_money:85000,contract_start:'2022-10-01',contract_end:'2024-09-30',status:'active',notes:'更新済み'},
      {id:'t5',property_id:'p1',room:'301',name:'山本 次郎',rent:90000,common_fee:3000,parking:5000,deposit:180000,key_money:90000,contract_start:'2025-01-01',contract_end:'2026-12-31',status:'active',notes:''},
      {id:'t6',property_id:'p1',room:'302',name:'伊藤 三郎',rent:88000,common_fee:3000,parking:0,deposit:176000,key_money:0,contract_start:'2024-04-01',contract_end:'2026-03-31',status:'active',notes:''},
      {id:'t7',property_id:'p1',room:'303',name:'加藤 四郎',rent:88000,common_fee:3000,parking:5000,deposit:176000,key_money:88000,contract_start:'2023-08-01',contract_end:'2025-07-31',status:'active',notes:'更新済み'},
      {id:'t8',property_id:'p1',room:'304',name:'渡辺 五郎',rent:82000,common_fee:3000,parking:0,deposit:164000,key_money:82000,contract_start:'2025-06-01',contract_end:'2027-05-31',status:'active',notes:''},
    ],
    deposits:[] // 敷金管理
  };
  accounts['yamada@realestate.com']=q3;save('yamada@realestate.com');
  renderSidebar();
  _autoSelectAccount();
}

// ── 集計ヘルパー ──
function calcPL(a){
  const J=a.journals||[];
  const income=J.filter(j=>j.type==='income').reduce((s,j)=>s+j.amount,0);
  const cogs=J.filter(j=>j.type==='expense'&&j.category==='仕入高').reduce((s,j)=>s+j.amount,0);
  const expense=J.filter(j=>j.type==='expense'&&j.category!=='仕入高').reduce((s,j)=>s+j.amount,0);
  const dep=(a.depreciation||[]).reduce((s,d)=>s+d.current_year_amount,0);
  const grossProfit=income-cogs;
  const operatingProfit=grossProfit-expense-dep;
  const wh=(a.invoices||[]).reduce((s,i)=>s+(i.withholding||0),0);
  const bycat=J.filter(j=>j.type==='expense').reduce((acc,j)=>{acc[j.category]=(acc[j.category]||0)+j.amount;return acc},{});
  return{income,cogs,grossProfit,expense,dep,operatingProfit,wh,bycat,grossMargin:income>0?Math.round(grossProfit/income*100):0,opMargin:income>0?Math.round(operatingProfit/income*100):0};
}

function monthlyData(a){
  const months=['01','02','03','04','05','06','07','08','09','10','11','12'];
  return months.map(m=>{
    const J=(a.journals||[]).filter(j=>j.date.slice(5,7)===m);
    const income=J.filter(j=>j.type==='income').reduce((s,j)=>s+j.amount,0);
    const expense=J.filter(j=>j.type==='expense').reduce((s,j)=>s+j.amount,0);
    return{month:m+'月',income,expense,profit:income-expense};
  });
}


function renderSidebar(){
  const list=document.getElementById('acct-list');
  if(!list) return;
  const keys=Object.keys(accounts);
  if(!keys.length){list.innerHTML='<div style="padding:12px;font-size:11px;color:var(--text3)">事業者がいません</div>';return;}
  list.innerHTML=keys.map(email=>{
    const a=accounts[email];
    const pl=calcPL(a);
    const pend=getPendingCount(a);
    const queue=(a.auto_queue||[]).filter(q=>q.status==='pending').length;
    return`<div class="acct-item${currentAcct===email?' active':''}" onclick="selectAccount('${email}')">
      <div class="acct-name">${a.name}</div>
      <div class="acct-biz">${a.business}</div>
      <div style="margin-top:4px;display:flex;gap:3px;flex-wrap:wrap">
        <span style="font-size:10px;padding:1px 6px;border-radius:99px;background:${pl.operatingProfit>=0?'var(--green-bg)':'var(--red-bg)'};color:${pl.operatingProfit>=0?'var(--green)':'var(--red)'}">${Math.round(pl.operatingProfit/10000)}万</span>
        ${pend>0?`<span class="badge b-red" style="font-size:10px">要確認${pend}</span>`:''}
        ${queue>0?`<span class="badge b-yellow" style="font-size:10px">待機${queue}</span>`:''}
      </div>
    </div>`;
  }).join('');
  if(typeof updateMobileAcctBar==='function')updateMobileAcctBar();
  if(typeof renderDesktopNav==='function')renderDesktopNav();
  renderSidebarLogo();
  // 不動産タブの表示・非表示をプランで制御
  const _reTab = document.getElementById('tab-realestate');
  if (_reTab) _reTab.style.display = typeof hasRealEstate==='function' && hasRealEstate(currentAcct) ? '' : 'none';
}

function selectAccount(email){
  currentAcct=email;renderSidebar();
  const a=accounts[email];
  document.getElementById('topbar-title').textContent=`${a.name} — ${a.business}`;
  document.getElementById('tabs-bar').style.display='flex';
  updateBadges();switchTab('dashboard');
  if(typeof updateMobileAcctBar==='function')updateMobileAcctBar();
  // 不動産タブの表示・非表示をプランで制御
  const _reTab = document.getElementById('tab-realestate');
  if (_reTab) _reTab.style.display = typeof hasRealEstate==='function' && hasRealEstate(currentAcct) ? '' : 'none';
}
function updateBadges(){
  if(!currentAcct)return;
  const pend=getPendingCount(accounts[currentAcct]);
  const rb=document.getElementById('review-badge');
  if(rb){rb.style.display=pend>0?'inline-block':'none';rb.textContent=pend;}
}
function switchTab(name){
  currentTab=name;
  if(typeof renderDesktopNav==='function')renderDesktopNav();
  if(name==='cashflow' && typeof checkBankSetupOnOpen==='function') setTimeout(checkBankSetupOnOpen, 200);
  // 不動産タブはプランチェック
  if (name==='realestate' && typeof hasRealEstate==='function' && !hasRealEstate(currentAcct)) {
    showUpgradePrompt('realestate');
    return;
  }
  const names=['dashboard','auto','pl','receipt','review','gmail','invoices','journal','rules','freee','hojoconfirm','checklist','partners','budget','notify','realestate','tax','kasan','assets','bs'];
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',names[i]===name));
  if (typeof updateMobileNav === 'function') updateMobileNav(name);
  ({monzen:renderMonzen,dashboard:renderDashboard,auto:renderAuto,pl:renderPL,receipt:renderReceipt,review:renderReview,gmail:renderGmail,invoices:renderInvoices,journal:renderJournal,rules:renderRules,freee:renderFreee,hojoconfirm:renderHojoConfirm,trialbalance:renderTrialBalance,dokuritsu:renderDokuritsu,cashflow:renderCashflow,kakeibo_home:renderKakeiboHome,kakeibo_list:renderKakeiboList,kakeibo_budget:renderKakeiboBudget,kakeibo_graph:renderKakeiboGraph,items:renderPurchaseItems,checklist:renderChecklist,kakutei:renderKakuteiPreview,migration:renderMigration,partners:renderPartners,budget:renderBudget,notify:renderNotify,realestate:renderRealEstate,tax:renderTax,kasan:renderKasan,assets:renderAssets,bs:renderBS})[name]();
  if(typeof renderDesktopNav==='function') renderDesktopNav();
}

// ── SEARCH ──
function handleSearch(val){
  clearTimeout(searchTimer);const box=document.getElementById('search-results');
  if(!val.trim()){box.classList.remove('open');return;}
  const ph1=phase1(val,0);
  box.classList.add('open');
  if(ph1&&!ph1.excluded){
    box.innerHTML=`<div class="search-result-item"><div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><span class="badge b-gray">${ph1.category}</span><span class="${ph1.tax===8?'tax8':ph1.tax===0?'taxfree':'tax10'}">${ph1.type}</span><span class="phase1">Phase1即時</span></div><div style="font-size:11px;color:var(--text2)">${ph1.note||'キーワードマッチで判定'}</div></div>`;
    return;
  }
  box.innerHTML='<div class="search-loading">分析中<span class="dot-anim"></span></div>';
  searchTimer=setTimeout(async()=>{
    try{
      const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,max_tokens:300,messages:[{role:"user",content:`忍者帳場AIとして: 「${val}」の勘定科目・税率を具体的に2文で。`}]})});
      const d=await res.json();
      box.innerHTML=`<div class="search-result-item"><div style="font-size:10px;color:var(--accent);margin-bottom:4px">AI判定（Phase2）</div><div style="font-size:12px;color:var(--text2);line-height:1.75">${d.content[0].text.replace(/\n/g,'<br>')}</div></div>`;
    }catch(e){box.innerHTML='<div class="search-loading" style="color:var(--red)">検索できませんでした</div>';}
  },600);
}
function closeSearch(){document.getElementById('search-results').classList.remove('open');}

// ════════════════════════════
// ── DASHBOARD（メイン） ──
// ════════════════════════════
function renderDashboard(){
  if (!currentAcct || !accounts[currentAcct]) {
    var el=document.getElementById('main-content');
    if(el) el.innerHTML='<div class="card" style="text-align:center;padding:40px"><div style="font-size:14px;color:var(--text3)">事業者を選択してください</div></div>';
    return;
  }
  const a=accounts[currentAcct];
  const pl=calcPL(a);
  const monthly=monthlyData(a);
  const pend=getPendingCount(a);
  const queue=(a.auto_queue||[]).filter(q=>q.status==='pending').length;
  const recentJournals=(a.journals||[]).slice(-5).reverse();
  const onboardingBanner = typeof renderOnboardingBanner === 'function' ? renderOnboardingBanner(a) : '';
  const alertsCard = typeof renderAlertsCard === 'function' ? renderAlertsCard(a) : '';

  // 月次グラフデータ（直近6ヶ月）
  const last6=monthly.filter(m=>m.income>0||m.expense>0).slice(-6);
  const maxVal=Math.max(...last6.map(m=>Math.max(m.income,m.expense)),1);

  document.getElementById('main-content').innerHTML=`
    <div id="duplicate-warning"></div>
    <div id="dashboard-alerts"></div>
    <div id="member-stats-card" class="card" style="margin-bottom:11px"></div>
    <div id="monthly-chart-card" class="card" style="margin-bottom:11px"><div class="card-title" style="margin-bottom:10px">月別収支（直近6ヶ月）</div><canvas id="monthly-chart-canvas" width="600" height="180" style="width:100%;height:160px"></canvas></div>
    <div id="learning-status-card" class="card" style="margin-bottom:11px"></div>
    <!-- KPI -->
    <div class="kpi-grid" id="kpi-grid">
      <div class="kpi green">
        <div class="kpi-icon"></div>
        <div class="kpi-label">売上高</div>
        <div class="kpi-value" style="color:var(--green)" id="kpi-income">${fmtM(pl.income)}</div>
        <div class="kpi-sub"><span class="kpi-badge b-green">今年度累計</span></div>
        <div class="kpi-bar" style="background:var(--green);width:100%"></div>
      </div>
      <div class="kpi red">
        <div class="kpi-icon"></div>
        <div class="kpi-label">売上原価</div>
        <div class="kpi-value" style="color:var(--red)" id="kpi-cogs">${fmtM(pl.cogs)}</div>
        <div class="kpi-sub"><span class="kpi-badge b-red">仕入高</span></div>
        <div class="kpi-bar" style="background:var(--red);width:${pl.income>0?Math.min(100,pl.cogs/pl.income*100):0}%"></div>
      </div>
      <div class="kpi blue">
        <div class="kpi-icon"></div>
        <div class="kpi-label">粗利益</div>
        <div class="kpi-value" style="color:var(--blue)" id="kpi-gross">${fmtM(pl.grossProfit)}</div>
        <div class="kpi-sub"><span class="kpi-badge b-blue">粗利率 ${pl.grossMargin}%</span></div>
        <div class="kpi-bar" style="background:var(--blue);width:${pl.income>0?Math.min(100,pl.grossProfit/pl.income*100):0}%"></div>
      </div>
      <div class="kpi ${pl.operatingProfit>=0?'green':'red'}">
        <div class="kpi-icon"></div>
        <div class="kpi-label">営業利益</div>
        <div class="kpi-value" style="color:${pl.operatingProfit>=0?'var(--green)':'var(--red)'}" id="kpi-op">${fmtM(pl.operatingProfit)}</div>
        <div class="kpi-sub"><span class="kpi-badge ${pl.operatingProfit>=0?'b-green':'b-red'}">利益率 ${pl.opMargin}%</span></div>
        <div class="kpi-bar" style="background:${pl.operatingProfit>=0?'var(--green)':'var(--red)'};width:${pl.income>0?Math.min(100,Math.abs(pl.operatingProfit)/pl.income*100):0}%"></div>
      </div>
    </div>

    <!-- アラート -->
    ${pend>0?`<div class="alert a-red" style="cursor:pointer" onclick="switchTab('review')">! 勘定科目の判断待ちが <strong>${pend}件</strong> — 要確認タブで処理してください</div>`:''}
    ${queue>0?`<div class="alert a-yellow" style="cursor:pointer" onclick="switchTab('auto')"> 自動仕訳待ちが <strong>${queue}件</strong> — 自動仕訳タブで処理</div>`:''}

    <div class="pl-grid">
      <!-- 月次推移グラフ -->
      <div class="card">
        <div class="card-title">月次推移（売上 / 経費 / 利益）</div>
        <div style="display:flex;gap:10px;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text3)"><div style="width:8px;height:8px;border-radius:2px;background:var(--green)"></div>売上</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text3)"><div style="width:8px;height:8px;border-radius:2px;background:var(--red)"></div>経費</div>
          <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text3)"><div style="width:8px;height:8px;border-radius:2px;background:var(--blue)"></div>利益</div>
        </div>
        <div class="monthly-chart">
          ${last6.map(m=>`
            <div class="month-col">
              <div class="month-bar-wrap">
                <div class="month-bar" style="height:${m.income/maxVal*70}px;background:var(--green);opacity:0.8"></div>
                <div class="month-bar" style="height:${m.expense/maxVal*70}px;background:var(--red);opacity:0.8"></div>
                <div class="month-bar" style="height:${Math.max(0,m.profit/maxVal*70)}px;background:var(--blue);opacity:0.9"></div>
              </div>
              <div class="month-label">${m.month}</div>
            </div>`).join('')}
        </div>
        <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
          ${last6.filter(m=>m.income>0).map(m=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:11px">
              <span style="color:var(--text3)">${m.month}</span>
              <span style="color:var(--green);font-family:var(--mono)">${m.income.toLocaleString()}円</span>
              <span style="color:var(--red);font-family:var(--mono)">-${m.expense.toLocaleString()}円</span>
              <span style="color:${m.profit>=0?'var(--blue)':'var(--red)'};font-family:var(--mono);font-weight:700">${m.profit.toLocaleString()}円</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- 経費内訳 -->
      <div class="card">
        <div class="card-title">経費内訳（科目別）</div>
        <div class="chart-wrap">
          ${Object.entries(pl.bycat).sort(([,a],[,b])=>b-a).slice(0,8).map(([cat,val])=>`
            <div class="chart-bar-row">
              <div class="chart-bar-label">${cat}</div>
              <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width:${pl.expense+pl.cogs>0?val/(pl.expense+pl.cogs)*100:0}%;background:${catColor(cat)}"></div>
              </div>
              <div class="chart-bar-value">${fmtK(val)}</div>
            </div>`).join('')}
        </div>
        <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
            <div style="text-align:center;padding:6px;background:var(--bg3);border-radius:var(--radius-sm)">
              <div style="color:var(--text3);font-size:10px">販管費合計</div>
              <div style="color:var(--red);font-family:var(--mono);font-weight:700">${pl.expense.toLocaleString()}円</div>
            </div>
            <div style="text-align:center;padding:6px;background:var(--bg3);border-radius:var(--radius-sm)">
              <div style="color:var(--text3);font-size:10px">減価償却費</div>
              <div style="color:var(--text2);font-family:var(--mono);font-weight:700">${pl.dep.toLocaleString()}円</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- リアルタイム仕訳ストリーム -->
    <div class="card">
      <div class="card-title">
        <span>⚡ リアルタイム仕訳ストリーム</span>
        <div style="display:flex;gap:6px;align-items:center">
          ${queue>0?`<span class="badge b-yellow">${queue}件待機</span>`:''}
          <button class="btn btn-primary btn-sm" onclick="triggerAutoJournal('manual')">今すぐ処理</button>
          <button class="btn btn-sm" onclick="addDemoQueue()">＋ デモデータ</button>
        </div>
      </div>
      <div class="stream-container" id="stream-container">
        ${recentJournals.map(j=>streamRow(j,false)).join('')}
        ${recentJournals.length===0?'<div class="empty" style="padding:16px">仕訳データがありません</div>':''}
      </div>
      <div id="auto-loading" style="display:none" class="loading-inline">
        <div class="realtime-badge" style="display:inline-flex;margin:auto"><div class="pulse-dot"></div><span>Phase1辞書→Phase2 Claude でリアルタイム処理中</span><span class="dot-anim"></span></div>
      </div>
    </div>

    <!-- 未払請求書 -->
    ${(a.invoices||[]).filter(i=>i.status==='unpaid').length>0?`
    <div class="card">
      <div class="card-title">未払請求書アラート</div>
      ${(a.invoices||[]).filter(i=>i.status==='unpaid').map(i=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
          <div><span style="font-weight:600">${i.vendor}</span><span style="color:var(--text3);margin-left:8px;font-size:11px">期日: ${i.due_date}</span></div>
          <div style="display:flex;gap:6px;align-items:center">
            ${i.withholding>0?`<span style="font-family:var(--mono);font-size:11px;color:var(--yellow)">源泉-${i.withholding.toLocaleString()}円</span>`:''}
            <span style="font-family:var(--mono);font-weight:700">${i.amount.toLocaleString()}円</span>
            <span class="badge b-red">未払い</span>
          </div>
        </div>`).join('')}
    </div>`:''}`;
}

function streamRow(j, isNew=true){
  // 飲食費の場合は1人あたり単価を表示
  const unitInfo=(j.unit_price&&j.unit_price>0&&(j.category==='会議費'||j.category==='接待交際費'))
    ?`<span style="font-size:9px;color:var(--text3);font-family:var(--mono);margin-left:4px">@${j.unit_price.toLocaleString()}円/人</span>`:'';
  const ambiguousNote=j.status==='ambiguous'?`<span style="font-size:9px;color:var(--yellow);margin-left:4px">人数要確認</span>`:'';
  return`<div class="stream-row${isNew?' new':''}">
    <div class="stream-time">${j.date.slice(5)}</div>
    <div class="stream-desc" title="${j.description}">${j.description}${unitInfo}${ambiguousNote}</div>
    <div class="stream-cat"><span class="badge b-gray" style="font-size:9px">${j.category}</span></div>
    <div class="stream-amount" style="color:${j.type==='income'?'var(--green)':'var(--red)'}">${j.type==='income'?'+':'-'}${j.amount.toLocaleString()}円</div>
    <div class="stream-phase"><span class="${j.phase==='phase1'?'phase1':'phase2'}" style="font-size:9px">${j.phase==='phase1'?'P1':'P2'}</span></div>
    <div class="stream-status"><span class="badge ${j.status==='confirmed'?'b-green':j.status==='ambiguous'?'b-yellow':'b-red'}" style="font-size:9px">${j.status==='confirmed'?'':j.status==='ambiguous'?'△':'?'}</span></div>
  </div>`;
  // ── ダッシュボード追加アラート（予算・空室・更新期限）──
  setTimeout(function() {
    try {
      const _a = accounts[currentAcct]; if(!_a) return;
      const _content = document.getElementById('main-content'); if(!_content) return;
      const _kpi = _content.querySelector('.kpi-grid'); if(!_kpi) return;
      // 予算アラート
      const _budgetAlerts = typeof getBudgetAlerts==='function' ? getBudgetAlerts(_a) : [];
      if (_budgetAlerts.length > 0) {
        const _el = document.createElement('div');
        _el.className='alert a-yellow'; _el.style.cursor='pointer';
        _el.onclick=()=>switchTab('budget');
        _el.innerHTML=' 予算アラート: <strong>'+_budgetAlerts.map(function(al){return al.cat+'('+Math.round(al.actual/al.budget*100)+'%)';}).join('・')+'</strong> — 予算管理タブで確認';
        _kpi.after(_el);
      }
      // 空室アラート
      const _va = typeof getVacantAlerts==='function' ? getVacantAlerts(_a) : {vacant:[],soonExpire:[]};
      if (_va.vacant.length > 0) {
        const _el2 = document.createElement('div');
        _el2.className='alert a-red'; _el2.style.cursor='pointer';
        _el2.onclick=()=>switchTab('realestate');
        _el2.innerHTML=' 空室アラート: <strong>'+_va.vacant.length+'室が空室</strong>（'+_va.vacant.map(function(t){return t.room+'号室';}).join('・')+'）';
        _kpi.after(_el2);
      }
      if (_va.soonExpire.length > 0) {
        const _el3 = document.createElement('div');
        _el3.className='alert a-yellow'; _el3.style.cursor='pointer';
        _el3.onclick=()=>switchTab('realestate');
        _el3.innerHTML=' 更新期限90日以内: <strong>'+_va.soonExpire.map(function(t){return t.room+'号室 '+t.name;}).join('・')+'</strong>';
        _kpi.after(_el3);
      }
    } catch(e) {}
  }, 50);

}

function catColor(cat){
  const colors={'仕入高':'#ff5f7e','地代家賃':'#fb923c','通信費':'#4d9fff','旅費交通費':'#c084fc','外注費':'#2ecc8c','消耗品費':'#ffcc44','水道光熱費':'#5eead4','広告宣伝費':'#f472b6','研究開発費':'#a78bfa','支払手数料':'#94a3b8','雑費':'#6b7280'};
  return colors[cat]||'#6b7280';
}
function fmtM(v){return Math.abs(v)>=1000000?`${(v/10000).toFixed(0)}万`:`${v.toLocaleString()}円`;}
function fmtK(v){return v>=10000?`${Math.round(v/1000)}k`:v.toLocaleString();}

// ════════════════════════════
// ── 自動仕訳（リアルタイム） ──
// ════════════════════════════
async function triggerAutoJournal(mode='manual'){
  const a=accounts[currentAcct];
  const pending=(a.auto_queue||[]).filter(q=>q.status==='pending');
  if(!pending.length){
    if(mode==='manual')alert('処理待ちの取引がありません。「デモデータ追加」で試せます。');
    return;
  }
  if(processingQueue)return;
  processingQueue=true;

  const rtBadge=document.getElementById('rt-badge');
  const rtCount=document.getElementById('rt-count');
  if(rtBadge)rtBadge.style.display='flex';
  const loadDiv=document.getElementById('auto-loading');
  if(loadDiv)loadDiv.style.display='block';

  let processed=0;
  const phase2Queue=[];

  for(const q of pending){
    rtCount&&(rtCount.textContent=`${processed+1}/${pending.length}件`);

    // 除外チェック
    const excl=EXCLUDE.find(ex=>ex.pat.test(q.description));
    if(excl){q.status='excluded';q.result={excluded:true,rule:excl,phase:'phase1'};processed++;pushStreamRow(q);continue;}

    // Phase 1（コメントから人数を抽出してPhase1に渡す）
    const personsFromComment=extractPersons(q.description+' '+(q.comment||''));
    const ph1=phase1(q.description,q.amount,personsFromComment);
    if(ph1&&!ph1.excluded){
      q.status='processed';q.result={...ph1};
      const jConf=ph1.confidence||'high';
      const j={id:Date.now()+Math.random(),date:q.date,description:q.description,amount:q.amount,type:'expense',category:ph1.category,tax_rate:ph1.tax,tax_type:ph1.type,status:jConf==='high'?'confirmed':'ambiguous',phase:'phase1',confidence:jConf,unit_price:ph1.unit_price,persons:ph1.persons};
      if(!a.journals)a.journals=[];a.journals.push(j);
      pushStreamRow(j,true);
      await delay(180);
    }else{
      phase2Queue.push(q);
    }
    processed++;
  }

  // Phase 2: Claude AI（バッチ）
  if(phase2Queue.length>0){
    const items=phase2Queue.map(q=>`${q.id}|${q.description}|${q.amount}`).join('\n');
    try{
      const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        model:MODEL,max_tokens:1000,
        messages:[{role:"user",content:`以下の銀行取引を一括で勘定科目判定してください。各行 id|摘要|金額 の形式です。
使用可能科目: 旅費交通費/通信費/消耗品費/会議費/接待交際費/外注費/地代家賃/水道光熱費/広告宣伝費/仕入高/支払手数料/新聞図書費/研究開発費/車両費/雑費
飲食費の会議費/接待交際費判定は合計金額÷人数の1人あたり単価で行う。単価5,000円以下→会議費、5,000円超→接待交際費。人数不明の場合は1人として計算しconfidence=mediumにする。宿泊税→旅費交通費・不課税。

${items}

JSON配列のみ返答: [{"id":数値,"category":"科目","tax_rate":8または10または0,"tax_type":"課税/課税（軽減）/不課税/非課税","confidence":"high/medium/low","reason":"1文"}]`}]
      })});
      const d=await res.json();
      const results=JSON.parse(d.content[0].text.replace(/```json|```/g,'').trim());
      for(const r of results){
        const q=phase2Queue.find(q=>q.id==r.id);if(!q)continue;
        q.status=r.confidence==='low'?'review':'processed';
        q.result={...r,phase:'phase2'};
        if(!a.journals)a.journals=[];
        if(r.confidence!=='low'){
          const j={id:Date.now()+Math.random(),date:q.date,description:q.description,amount:q.amount,type:'expense',category:r.category,tax_rate:r.tax_rate,tax_type:r.tax_type,status:r.confidence==='high'?'confirmed':'ambiguous',phase:'phase2',confidence:r.confidence};
          a.journals.push(j);
          pushStreamRow(j,true);
        }else{
          if(!a.pending)a.pending=[];
          a.pending.push({id:Date.now()+Math.random(),date:q.date,description:q.description,amount:q.amount,category:r.category,status:'pending',reason:`AI信頼度LOW: ${r.reason}`});
          pushStreamRow({...q,type:'expense',category:'?',status:'ambiguous',phase:'phase2'},true);
        }
        await delay(150);
      }
    }catch(e){phase2Queue.forEach(q=>q.status='error');}
  }

  save(currentAcct);processingQueue=false;
  if(rtBadge)rtBadge.style.display='none';
  if(loadDiv)loadDiv.style.display='none';
  updateBadges();renderSidebar();

  // KPI をリアルタイムで更新
  updateKPIAnimated();
}

function pushStreamRow(j, isNew=true){
  const container=document.getElementById('stream-container');
  if(!container)return;
  const div=document.createElement('div');
  div.innerHTML=streamRow(j,isNew);
  container.insertBefore(div.firstElementChild,container.firstChild);
  if(container.children.length>20)container.lastElementChild.remove();
}

function updateKPIAnimated(){
  const a=accounts[currentAcct];if(!a)return;
  const pl=calcPL(a);
  const targets={
    'kpi-income':{val:pl.income,color:'var(--green)'},
    'kpi-cogs':{val:pl.cogs,color:'var(--red)'},
    'kpi-gross':{val:pl.grossProfit,color:'var(--blue)'},
    'kpi-op':{val:pl.operatingProfit,color:pl.operatingProfit>=0?'var(--green)':'var(--red)'},
  };
  for(const[id,{val,color}]of Object.entries(targets)){
    const el=document.getElementById(id);
    if(el){el.textContent='' +fmtM(val);el.style.color=color;el.classList.remove('animate-count');void el.offsetWidth;el.classList.add('animate-count');}
  }
}

function delay(ms){return new Promise(r=>setTimeout(r,ms));}

function addDemoQueue(){
  const a=accounts[currentAcct];if(!a.auto_queue)a.auto_queue=[];
  const today=new Date().toISOString().slice(0,10);
  const demos=[
    // 1名 × 1,650円 = 単価1,650円 → 会議費（5,000円以下）
    {id:Date.now()+1,date:today,description:'スターバックス渋谷店 打ち合わせ 1名',amount:1650,status:'pending',comment:'1名で作業'},
    // 3名 × 5,500円 = 単価5,500円 → 接待交際費（5,000円超）
    {id:Date.now()+11,date:today,description:'焼肉 太郎 接待 3名',amount:16500,status:'pending',comment:'A社 山田部長ほか3名'},
    // 2名 × 4,500円 = 単価4,500円 → 会議費（5,000円以下）
    {id:Date.now()+12,date:today,description:'居酒屋さくら 打ち合わせ 2名',amount:9000,status:'pending',comment:'B社と2名で打ち合わせ'},
    // 人数不明 → 1人計算でmedium
    {id:Date.now()+13,date:today,description:'レストランA 会食',amount:8000,status:'pending',comment:''},
    {id:Date.now()+2,date:today,description:'AWS Tokyo リージョン',amount:9240,status:'pending'},
    {id:Date.now()+3,date:today,description:'振込 ヤマダタロウ',amount:88000,status:'pending'},
    {id:Date.now()+4,date:today,description:'東京電力 電気代',amount:9800,status:'pending'},
    {id:Date.now()+5,date:today,description:'ローン返済 住宅',amount:85000,status:'pending'},
    {id:Date.now()+6,date:today,description:'コンビニ袋代',amount:3,status:'pending'},
  ];
  a.auto_queue.push(...demos);save(currentAcct);renderSidebar();
  alert(`${demos.length}件のデモデータを追加しました。「今すぐ処理」で自動仕訳を実行してください。`);
}

// ── 自動仕訳タブ ──
function renderAuto(){
  if(!currentAcct||!accounts[currentAcct]){var _el=document.getElementById('main-content');if(_el)_el.innerHTML='<div class="card"><div class="card-title">事業者を選択してください</div></div>';return;}
  const a=accounts[currentAcct];
  const queue=a.auto_queue||[];
  const pending=queue.filter(q=>q.status==='pending');
  const done=queue.filter(q=>q.status!=='pending');
  document.getElementById('main-content').innerHTML=`
    <div class="card">
      <div class="card-title"> 2段階リアルタイム自動仕訳 <span style="font-size:10px;color:var(--text3);margin-left:6px">独自分類ルール</span></div>
      <div class="alert a-blue">Phase1: キーワード辞書（即時）→ Phase2: Claude AI（フォールバック）の2段階。除外ルール7種で先に弾き、判断待ちは「要確認」タブへ。</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
        <div class="kpi" style="padding:10px"><div class="kpi-label">待機中</div><div class="kpi-value" style="font-size:18px;color:var(--yellow)">${pending.length}件</div></div>
        <div class="kpi" style="padding:10px"><div class="kpi-label">Phase1完了</div><div class="kpi-value" style="font-size:18px;color:var(--green)">${done.filter(d=>d.result?.phase==='phase1'&&!d.result?.excluded).length}件</div></div>
        <div class="kpi" style="padding:10px"><div class="kpi-label">除外 / AI判定</div><div class="kpi-value" style="font-size:18px;color:var(--accent)">${done.filter(d=>d.result?.excluded).length} / ${done.filter(d=>d.result?.phase==='phase2').length}件</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <button class="btn btn-primary btn-sm" onclick="triggerAutoJournal('manual')">⚡ 自動仕訳を実行（全件）</button>
        <button class="btn btn-sm" onclick="addDemoQueue()">＋ デモデータ追加</button>
      </div>
      <div id="auto-loading" style="display:none" class="loading-inline"><div class="realtime-badge" style="display:inline-flex;margin:auto"><div class="pulse-dot"></div><span>リアルタイム処理中</span><span class="dot-anim"></span></div></div>
    </div>

    <div class="card">
      <div class="card-title">処理待ちキュー（${pending.length}件）</div>
      ${pending.length?`<table><thead><tr><th>日付</th><th>摘要</th><th>金額</th><th>Phase1プレビュー</th><th></th></tr></thead>
      <tbody>${pending.map(q=>{
        const _qPersons=extractPersons(q.description+' '+(q.comment||''));
        const ph1=phase1(q.description,q.amount,_qPersons);
        const ex=EXCLUDE.find(ex=>ex.pat.test(q.description));
        const unitNote=ph1&&ph1.unit_price?` <span style="font-size:9px;color:var(--text3)">@${ph1.unit_price.toLocaleString()}円/人${ph1.confidence==='medium'?' !人数不明':''}` +'</span>':'';
        return`<tr>
          <td style="font-family:var(--mono);font-size:10px">${q.date.slice(5)}</td>
          <td>${q.description}</td>
          <td style="font-family:var(--mono)">${q.amount.toLocaleString()}円</td>
          <td>${ex?`<span class="badge b-red">除外: ${ex.label}</span>`:ph1?`<span class="badge b-gray">${ph1.category}</span> <span class="${ph1.tax===8?'tax8':ph1.tax===0?'taxfree':'tax10'}">${ph1.tax===0?ph1.type:ph1.tax+'%'}</span>${unitNote}`:'<span class="badge b-purple">→ Claude AI</span>'}</td>
          <td><button class="btn btn-sm btn-success" onclick="processSingle(${q.id})">処理</button></td>
        </tr>`;
      }).join('')}</tbody></table>`:'<div class="empty">処理待ちの取引がありません<br><button class="btn btn-sm" style="margin-top:8px" onclick="addDemoQueue()">デモデータを追加</button></div>'}
    </div>

    <div class="card">
      <div class="card-title">除外ルール 7種類</div>
      ${EXCLUDE.map(r=>`<div class="exclude-row"><strong style="min-width:90px">${r.label}</strong><span>→ 手動確認へ</span></div>`).join('')}
    </div>

    ${done.length?`<div class="card">
      <div class="card-title">処理済み（${done.length}件）</div>
      <table><thead><tr><th>日付</th><th>摘要</th><th>金額</th><th>科目</th><th>判定</th><th>信頼度</th></tr></thead>
      <tbody>${done.slice(-15).reverse().map(q=>`<tr>
        <td style="font-family:var(--mono);font-size:10px">${q.date.slice(5)}</td>
        <td>${q.description}</td>
        <td style="font-family:var(--mono)">${q.amount.toLocaleString()}円</td>
        <td>${q.result?.excluded?'<span class="badge b-red">除外</span>':`<span class="badge b-gray">${q.result?.category||'—'}</span>`}</td>
        <td><span class="${q.result?.phase==='phase1'?'phase1':'phase2'}">${q.result?.phase==='phase1'?'Phase1':'Phase2'}</span></td>
        <td><span class="badge ${q.result?.confidence==='high'?'b-green':q.result?.confidence==='medium'?'b-blue':'b-yellow'}">${q.result?.confidence||'—'}</span></td>
      </tr>`).join('')}</tbody></table>
    </div>`:''} `;
}

async function processSingle(id){
  const a=accounts[currentAcct];
  const q=(a.auto_queue||[]).find(q=>q.id==id);if(!q)return;
  const ex=EXCLUDE.find(ex=>ex.pat.test(q.description));
  if(ex){q.status='excluded';q.result={excluded:true,rule:ex,phase:'phase1'};}
  else{
    // コメントと摘要から人数を抽出して単価判定に使う
    const _persons=extractPersons(q.description+' '+(q.comment||''));
    const ph1=phase1(q.description,q.amount,_persons);
    if(ph1&&!ph1.excluded){
      q.status='processed';q.result={...ph1};if(!a.journals)a.journals=[];
      const _conf=ph1.confidence||'high';
      const _j={id:Date.now(),date:q.date,description:q.description,amount:q.amount,type:'expense',category:ph1.category,tax_rate:ph1.tax,tax_type:ph1.type,status:_conf==='high'?'confirmed':'ambiguous',phase:'phase1',confidence:_conf,unit_price:ph1.unit_price,persons:ph1.persons};
      a.journals.push(_j);pushStreamRow(_j,true);
    }else{
      q.status='processed';q.result={category:'雑費',phase:'phase2',confidence:'low'};
      if(!a.pending)a.pending=[];
      a.pending.push({id:Date.now(),date:q.date,description:q.description,amount:q.amount,category:'雑費',status:'pending',reason:'キーワード未マッチ。手動確認が必要です。'});
    }
  }
  save(currentAcct);updateBadges();renderSidebar();updateKPIAnimated();renderAuto();
}

// ── 損益計算書タブ ──
function renderPL(){
  if(!currentAcct||!accounts[currentAcct]){var _el=document.getElementById('main-content');if(_el)_el.innerHTML='<div class="card"><div class="card-title">事業者を選択してください</div></div>';return;}
  const a=accounts[currentAcct];
  const pl=calcPL(a);
  const monthly=monthlyData(a);
  document.getElementById('main-content').innerHTML=`
    <div class="card">
      <div class="card-title">損益計算書（P/L） <span style="font-size:10px;color:var(--text3)">${a.year}年度 累計</span></div>
      <div style="max-width:500px">
        ${plLine('売上高（Revenue）',pl.income,'var(--green)',true)}
        ${plLine('売上原価（COGS）',-pl.cogs,'var(--red)')}
        ${plLineSep()}
        ${plLine('粗利益（Gross Profit）',pl.grossProfit,'var(--blue)',true)}
        <div style="font-size:10px;color:var(--text3);padding:2px 0 6px 16px">粗利率: ${pl.grossMargin}%</div>
        ${Object.entries(pl.bycat).filter(([k])=>k!=='仕入高').sort(([,a],[,b])=>b-a).map(([cat,val])=>plLine(`  ${cat}`,-val,'var(--text3)')).join('')}
        <div style="padding:4px 0 4px 16px;font-size:11px;color:var(--text3)">  減価償却費: -${pl.dep.toLocaleString()}円</div>
        ${plLineSep()}
        ${plLine('営業利益（Operating Profit）',pl.operatingProfit,pl.operatingProfit>=0?'var(--green)':'var(--red)',true)}
        <div style="font-size:10px;color:var(--text3);padding:2px 0 6px 16px">営業利益率: ${pl.opMargin}%</div>
        ${pl.wh>0?plLine('源泉徴収（控除可）',pl.wh,'var(--yellow)'):''}
      </div>
    </div>

    <div class="pl-grid">
      <div class="card">
        <div class="card-title">売上構成</div>
        <div class="pl-bar-container">
          <div class="pl-bar-label"><span>売上高</span><span style="font-family:var(--mono)">${pl.income.toLocaleString()}円</span></div>
          <div class="pl-bar-track"><div class="pl-bar-fill" style="width:100%;background:var(--green)"></div></div>
        </div>
        <div class="pl-bar-container">
          <div class="pl-bar-label"><span>売上原価</span><span style="font-family:var(--mono);color:var(--red)">${pl.cogs.toLocaleString()}円</span></div>
          <div class="pl-bar-track"><div class="pl-bar-fill" style="width:${pl.income>0?pl.cogs/pl.income*100:0}%;background:var(--red)"></div></div>
        </div>
        <div class="pl-bar-container">
          <div class="pl-bar-label"><span>粗利益</span><span style="font-family:var(--mono);color:var(--blue)">${pl.grossProfit.toLocaleString()}円</span></div>
          <div class="pl-bar-track"><div class="pl-bar-fill" style="width:${pl.income>0?Math.max(0,pl.grossProfit/pl.income*100):0}%;background:var(--blue)"></div></div>
        </div>
        <div class="pl-bar-container">
          <div class="pl-bar-label"><span>営業利益</span><span style="font-family:var(--mono);color:${pl.operatingProfit>=0?'var(--green)':'var(--red)'}">${pl.operatingProfit.toLocaleString()}円</span></div>
          <div class="pl-bar-track"><div class="pl-bar-fill" style="width:${pl.income>0?Math.max(0,Math.abs(pl.operatingProfit)/pl.income*100):0}%;background:${pl.operatingProfit>=0?'var(--green)':'var(--red)'}"></div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">月次推移詳細</div>
        <table><thead><tr><th>月</th><th>売上</th><th>経費</th><th>利益</th><th>利益率</th></tr></thead>
        <tbody>${monthly.filter(m=>m.income>0||m.expense>0).map(m=>`<tr>
          <td style="font-family:var(--mono)">${m.month}</td>
          <td style="font-family:var(--mono);color:var(--green)">${m.income.toLocaleString()}円</td>
          <td style="font-family:var(--mono);color:var(--red)">${m.expense.toLocaleString()}円</td>
          <td style="font-family:var(--mono);color:${m.profit>=0?'var(--blue)':'var(--red)'}">${m.profit.toLocaleString()}円</td>
          <td style="font-family:var(--mono)">${m.income>0?Math.round(m.profit/m.income*100):0}%</td>
        </tr>`).join('')}</tbody></table>
      </div>
    </div>`;
}

function plLine(label,val,color,bold=false){
  return`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);${bold?'border-top:1px solid var(--border2);margin-top:4px;':''}">
    <span style="font-size:${bold?'12':'11'}px;font-weight:${bold?700:400};color:${bold?'var(--text)':'var(--text2)'}">${label}</span>
    <span style="font-family:var(--mono);font-size:${bold?'13':'11'}px;font-weight:${bold?700:400};color:${color}">${val>=0?'':'-'}${Math.abs(val).toLocaleString()}円</span>
  </div>`;
}
function plLineSep(){return`<div style="height:1px;background:var(--border2);margin:6px 0"></div>`;}

// ── レシートタブ ──
function renderReceipt(){
  if(!currentAcct||!accounts[currentAcct]){var _el=document.getElementById('main-content');if(_el)_el.innerHTML='<div class="card"><div class="card-title">事業者を選択してください</div></div>';return;}
  document.getElementById('main-content').innerHTML=`
    <div class="card">
      <div class="card-title"> レシート・領収書 <span class="badge b-green"> スマホ対応</span></div>
      <div class="alert a-blue">2段階判定（Phase1辞書→Phase2 Claude）+ 銀行明細ルール34項目。コメント入力で精度向上。</div>
      <div class="form-row"><span class="form-label">コメント</span><textarea id="r-comment" placeholder="例：A社 山田部長と打ち合わせ 2名&#10;例：大阪出張 ホテルパール1泊"></textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">目的</div>
          <select id="r-purpose"><option value="">自動判断</option><option value="entertainment">接待・交際</option><option value="meeting">打ち合わせ</option><option value="supply">消耗品・備品</option><option value="purchase">仕入れ</option><option value="travel">出張・旅費</option></select></div>
        <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">人数</div>
          <select id="r-persons"><option value="0">指定なし</option>${[1,2,3,4,5,6].map(n=>`<option value="${n}">${n}名</option>`).join('')}</select></div>
      </div>
      <div class="upload-area" onclick="document.getElementById('r-file').click()">
        <input type="file" id="r-file" accept="image/*" capture="environment" style="display:none" onchange="handleReceipt(event)">
        <div style="font-size:26px;margin-bottom:8px"></div>
        <div style="font-weight:700;color:var(--text2)">写真を選択 または カメラで撮影</div>
        <div style="font-size:11px;color:var(--text3);margin-top:4px">スマホ・タブレットから直接撮影可能</div>
      </div>
      <div id="r-loading" style="display:none" class="loading-inline"><div class="realtime-badge" style="display:inline-flex;margin:auto"><div class="pulse-dot"></div><span>Phase1→Phase2 分析中</span><span class="dot-anim"></span></div></div>
    </div>
    <div id="r-result" style="display:none" class="card">
      <div class="card-title" id="r-result-title">読み取り結果</div>
      <div id="r-data"></div>
      <div id="r-actions" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="saveReceiptResult()"> 仕訳に登録</button>
        <button class="btn btn-sm" style="color:var(--yellow);border-color:var(--yellow)" onclick="sendToPending()">判断待ちへ</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('r-result').style.display='none'">キャンセル</button>
      </div>
    </div>`;
}

async function handleReceipt(e){
  const file=e.target.files[0];if(!file)return;
  const comment=document.getElementById('r-comment').value;
  const purpose=document.getElementById('r-purpose').value;
  const persons=parseInt(document.getElementById('r-persons').value)||0;
  document.getElementById('r-loading').style.display='block';
  const b64=await toBase64(file);
  const purposeMap={entertainment:'接待・交際',meeting:'打ち合わせ',supply:'消耗品',purchase:'仕入れ',travel:'出張'};
  try{
    const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,max_tokens:1800,messages:[{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:file.type,data:b64}},
      {type:"text",text:`忍者帳場AIとして分析。コメント:${comment||'なし'} 目的:${purposeMap[purpose]||'自動'} 人数:${persons>0?persons+'名':'不明'}
ルール: 飲食費は合計÷人数の1人あたり単価で判定（5,000円以下→会議費/超→接待交際費）。人数不明は1人計算でconfidence=medium。袋代→消耗品費10%/宿泊税→旅費交通費不課税
JSONのみ: {"store":"店名","date":"YYYY-MM-DD","total":数値,"items":[{"name":"商品","amount":数値,"tax_rate":8または10または0,"tax_type":"課税/課税（軽減）/不課税/非課税","category":"科目","reason":"理由","status":"confirmed/review","review_reason":"要確認の場合のみ"}],"overall_note":"注意点"}`}
    ]}]})});
    const d=await res.json();
    const p=JSON.parse(d.content[0].text.replace(/```json|```/g,'').trim());
    // Phase1でオーバーライド
    p.items=p.items.map(item=>{const ph1=phase1(item.name,item.amount,persons);return(ph1&&!ph1.excluded)?{...item,category:ph1.category,tax_rate:ph1.tax,tax_type:ph1.type,auto_rule:true,reason:ph1.note||item.reason,confidence:ph1.confidence}:item;});
    document.getElementById('r-result')._data={...p,comment,persons};
    document.getElementById('r-data').innerHTML=`
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
        <span style="font-size:16px;font-weight:900">${p.store}</span>
        <span style="font-family:var(--mono);color:var(--text3)">${p.date}</span>
        <span style="font-family:var(--mono);font-size:14px;font-weight:700">${p.total.toLocaleString()}円</span>
      </div>
      ${p.items.some(i=>i.status==='review')?`<div class="alert a-yellow">! ${p.items.filter(i=>i.status==='review').length}件が要確認</div>`:'<div class="alert a-green"> 全項目が自動確定</div>'}
      <table><thead><tr><th>商品・項目</th><th>金額</th><th>税率</th><th>勘定科目</th><th>判定</th><th>状態</th></tr></thead>
      <tbody>${p.items.map((item,idx)=>`<tr style="${item.status==='review'?'background:rgba(255,204,68,0.04)':''}">
        <td><div>${item.name}</div><div style="font-size:10px;color:${item.auto_rule?'var(--accent)':'var(--text3)'}">${item.auto_rule?' Phase1: ':''} ${item.status==='review'?'! '+(item.review_reason||''):item.reason||''}</div></td>
        <td style="font-family:var(--mono)">${item.amount.toLocaleString()}円</td>
        <td><span class="${item.tax_rate===8?'tax8':item.tax_rate===0?'taxfree':'tax10'}">${item.tax_rate===0?item.tax_type:item.tax_rate+'%'}</span></td>
        <td><select id="item-cat-${idx}" style="font-size:10px;padding:2px 6px;background:var(--bg3);border-color:var(--border)">
          ${['仕入高','接待交際費','会議費','消耗品費','旅費交通費','通信費','広告宣伝費','地代家賃','水道光熱費','支払手数料','外注費','租税公課','損害保険料','新聞図書費','研究開発費','車両費','雑費'].map(c=>`<option${c===item.category?' selected':''}>${c}</option>`).join('')}
        </select></td>
        <td><span class="${item.auto_rule?'phase1':'phase2'}">${item.auto_rule?'P1':'P2'}</span></td>
        <td><span class="badge ${item.status==='confirmed'?'b-green':'b-yellow'}">${item.status==='confirmed'?'確定':'要確認'}</span></td>
      </tr>`).join('')}</tbody></table>
      ${p.overall_note?`<div class="ai-box">${p.overall_note}</div>`:''}`;
    // 全itemがconfirmedなら確認なしで即登録
    const hasReviewItem = p.items.some(i => i.status === 'review');
    if (!hasReviewItem) {
      // 即時自動登録
      document.getElementById('r-result')._data = p;
      saveReceiptResult();
      // 完了トースト
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,rgba(46,204,140,0.97),rgba(30,160,100,0.97));color:#fff;padding:11px 22px;border-radius:99px;font-size:13px;font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.4);white-space:nowrap;pointer-events:none';
      toast.innerHTML = ' ' + p.store + ' ' + p.total.toLocaleString() + '円' + ' を登録しました';
      document.body.appendChild(toast);
      setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity 0.3s'; setTimeout(()=>toast.remove(),300); }, 2500);
    } else {
      // 要確認ありのときだけ確認画面を表示
      const reviewCount = p.items.filter(i=>i.status==='review').length;
      document.getElementById('r-result-title').innerHTML =
        '! ' + reviewCount + '件確認が必要です <span style="font-size:11px;color:var(--text3);font-weight:400">— 残りは自動登録されます</span>';
      document.getElementById('r-result').style.display='block';
      // 確認不要なitemは非表示に
      document.querySelectorAll('#r-data tr').forEach((tr,i) => {
        if (i === 0) return; // ヘッダー
        const badge = tr.querySelector('.badge');
        if (badge && badge.textContent === '確定') {
          tr.style.opacity = '0.4';
        }
      });
    }
  }catch(err){alert('読み取り失敗。再度お試しください。');}
  document.getElementById('r-loading').style.display='none';
}

function saveReceiptResult(){
  const d=document.getElementById('r-result')._data;if(!d)return;
  const a=accounts[currentAcct];if(!a.receipts)a.receipts=[];
  const items=d.items.map((item,idx)=>({...item,category:document.getElementById('item-cat-'+idx)?.value||item.category}));
  const hasReview=items.some(i=>i.status==='review');
  a.receipts.push({id:Date.now(),date:d.date,store:d.store,comment:d.comment||'',total:d.total,items,status:hasReview?'partial':'confirmed'});
  if(!a.journals)a.journals=[];
  items.filter(i=>i.status==='confirmed').forEach(item=>{
    const j={id:Date.now()+Math.random(),date:d.date,type:'expense',category:item.category,description:`${d.store}${d.comment?'（'+d.comment+'）':''}`,amount:item.amount,tax_rate:item.tax_rate||getEffectiveTaxRate(item.tax_type==='課税（軽減）'?'reduced':'standard',d.date),tax_type:item.tax_type,status:'confirmed',phase:item.auto_rule?'phase1':'phase2'};
    a.journals.push(j);pushStreamRow(j,true);
  });
  save(currentAcct);updateBadges();renderSidebar();updateKPIAnimated();
  document.getElementById('r-result').style.display='none';document.getElementById('r-comment').value='';document.getElementById('r-file').value='';
  if(hasReview&&confirm(`${items.filter(i=>i.status==='review').length}件が未確定。要確認タブを開きますか？`))switchTab('review');
  else renderReceipt();
}
function sendToPending(){
  const d=document.getElementById('r-result')._data;if(!d)return;
  const a=accounts[currentAcct];if(!a.pending)a.pending=[];
  a.pending.push({id:Date.now(),date:d.date,description:`${d.store} — ${d.comment||'コメントなし'}`,amount:d.total,category:'?',status:'pending',reason:'手動で判断待ちに送られました'});
  save(currentAcct);updateBadges();renderSidebar();document.getElementById('r-result').style.display='none';renderReceipt();
}

// ── 要確認タブ ──
function renderReview(){
  const a=accounts[currentAcct];
  const rvReceipts=(a.receipts||[]).filter(r=>r.items&&r.items.some(i=>i.status==='review'));
  const pendItems=(a.pending||[]).filter(p=>p.status==='pending');
  document.getElementById('main-content').innerHTML=`
    ${!rvReceipts.length&&!pendItems.length?'<div class="alert a-green"> すべての項目が確定済みです</div>':''}
    ${pendItems.length?`<div class="card"><div class="card-title" style="color:var(--red)">! 判断待ちリスト（${pendItems.length}件）</div>
      ${pendItems.map(p=>`<div class="review-item">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="font-weight:700">${p.description}</span>
          <span style="font-family:var(--mono);font-weight:700">${p.amount.toLocaleString()}円</span>
        </div>
        <div class="alert a-red" style="font-size:11px;margin-bottom:8px">${p.reason}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <select id="pend-cat-${p.id}" style="font-size:11px;padding:3px 8px;background:var(--bg3);border-color:var(--border)">
            ${['接待交際費','会議費','消耗品費','旅費交通費','通信費','外注費','雑費','租税公課'].map(c=>`<option${c===p.category?' selected':''}>${c}</option>`).join('')}
          </select>
          <select id="pend-tax-${p.id}" style="font-size:11px;padding:3px 8px;background:var(--bg3);border-color:var(--border)">
            <option value="10">課税 10%</option><option value="8">軽減 8%</option><option value="0">不課税</option>
          </select>
          <button class="btn btn-success btn-sm" onclick="resolvePending(${p.id})">確定</button>
          <button class="btn btn-ghost btn-sm" onclick="askClaude('pend-adv-${p.id}','${(p.description||'').replace(/'/g,"\\'")}','')">AI</button>
        </div>
        <div id="pend-adv-${p.id}" style="display:none" class="ai-box"></div>
      </div>`).join('')}
    </div>`:''}
    ${rvReceipts.map(r=>`<div class="card" style="border-color:rgba(255,204,68,0.3)">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px"><span style="font-weight:700">${r.store}</span><span style="font-family:var(--mono)">${r.total.toLocaleString()}円</span></div>
      ${r.items.filter(i=>i.status==='review').map((item,idx)=>`
        <div class="review-item">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-weight:700">${item.name}</span><span style="font-family:var(--mono)">${item.amount.toLocaleString()}円</span></div>
          <div class="alert a-yellow" style="font-size:11px;margin-bottom:6px">${item.review_reason||''}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <select id="rv-cat-${r.id}-${idx}" style="font-size:11px;padding:3px 8px;background:var(--bg3);border-color:var(--border)">
              ${['仕入高','接待交際費','会議費','消耗品費','旅費交通費','通信費','外注費','雑費'].map(c=>`<option${c===item.category?' selected':''}>${c}</option>`).join('')}
            </select>
            <select id="rv-tax-${r.id}-${idx}" style="font-size:11px;padding:3px 8px;background:var(--bg3);border-color:var(--border)">
              <option value="10"${item.tax_rate===10?' selected':''}>課税 10%</option>
              <option value="8"${item.tax_rate===8?' selected':''}>軽減 8%</option>
              <option value="0"${item.tax_rate===0?' selected':''}>不課税</option>
            </select>
            <button class="btn btn-success btn-sm" onclick="resolveReview('${r.id}',${idx})">確定</button>
            <button class="btn btn-ghost btn-sm" onclick="askClaude('rv-adv-${r.id}-${idx}','${item.name.replace(/'/g,"\\'")}','${(item.review_reason||'').replace(/'/g,"\\'")}')">AI</button>
          </div>
          <div id="rv-adv-${r.id}-${idx}" style="display:none" class="ai-box"></div>
        </div>`).join('')}
    </div>`).join('')}`;
}

function resolveReview(receiptId,itemIdx){
  const a=accounts[currentAcct];const r=(a.receipts||[]).find(r=>r.id==receiptId);if(!r)return;
  const item=r.items.filter(i=>i.status==='review')[itemIdx];if(!item)return;
  const prevCategory = item.category;
  item.category=document.getElementById(`rv-cat-${receiptId}-${itemIdx}`).value;
  item.tax_rate=parseInt(document.getElementById(`rv-tax-${receiptId}-${itemIdx}`).value);
  item.tax_type=item.tax_rate===0?'不課税':item.tax_rate===8?'課税（軽減）':'課税';
  item.status='confirmed';delete item.review_reason;
  // 学習: カテゴリが変更された場合のみ学習
  if (typeof learnFromCorrection === 'function') {
    learnFromCorrection(
      { description: item.name, category: prevCategory || '?' },
      { category: item.category, tax_rate: item.tax_rate, tax_type: item.tax_type, type: 'expense' }
    );
  }
  if(!a.journals)a.journals=[];
  const j={id:Date.now(),date:r.date,type:'expense',category:item.category,description:r.store,amount:item.amount,tax_rate:item.tax_rate||getEffectiveTaxRate(item.tax_type==='課税（軽減）'?'reduced':'standard',d.date),tax_type:item.tax_type,status:'confirmed',phase:'phase2'};
  a.journals.push(j);pushStreamRow(j,true);
  r.status=r.items.some(i=>i.status==='review')?'partial':'confirmed';
  save(currentAcct);updateBadges();renderSidebar();updateKPIAnimated();renderReview();
}
function resolvePending(id){
  const a=accounts[currentAcct];const p=(a.pending||[]).find(p=>p.id==id);if(!p)return;
  const cat=document.getElementById(`pend-cat-${id}`).value;
  const taxRate=parseInt(document.getElementById(`pend-tax-${id}`).value);
  const taxType=taxRate===0?'不課税':taxRate===8?'課税（軽減）':'課税';
  // 学習: ユーザーが選択した科目を覚える
  if (typeof learnFromCorrection === 'function') {
    learnFromCorrection(
      { description: p.description, category: p.category || '?' },
      { category: cat, tax_rate: taxRate, tax_type: taxType, type: 'expense' }
    );
  }
  if(!a.journals)a.journals=[];
  const j={id:Date.now(),date:p.date,type:'expense',category:cat,description:p.description,amount:p.amount,tax_rate:taxRate,tax_type:taxType,status:'confirmed',phase:'phase2'};
  a.journals.push(j);pushStreamRow(j,true);
  p.status='resolved';save(currentAcct);updateBadges();renderSidebar();updateKPIAnimated();renderReview();
}
async function askClaude(boxId,name,reason){
  const box=document.getElementById(boxId);if(!box)return;
  box.style.display='block';box.innerHTML='AI分析中<span class="dot-anim"></span>';
  try{
    const prompt = '忍者帳場: 「' + name + '」' + (reason ? '課題「'+reason+'」' : '') + 'の勘定科目・税率を2〜3文で。情報提供として。';
    const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,max_tokens:300,messages:[{role:"user",content:prompt}]})});
    const d=await r.json();
    box.innerHTML=d.content[0].text.replace(/\n/g,'<br>');
  }catch(e){box.innerHTML='取得できませんでした。';}
}


// ── freeeタブに送信履歴・送信状態を追加 ──
function appendFreeeHistory() {
  const el = document.getElementById('freee-history-section');
  if (el) el.innerHTML = renderFreeeHistory();
}
// ── Gmail ──
function renderGmail() {
  const a = accounts[currentAcct];
  const el = document.getElementById('main-content');
  if (!el) return;

  const gmailLogs = (a && a.gmail_logs) || [];

  let html = '';

  // 取込方法の選択
  html += '<div class="card" style="margin-bottom:12px">'
    + '<div class="card-title">Gmail取込</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'
    + '<button id="gmail-paste-tab" class="gmail-tab-btn" style="padding:10px;border:2px solid var(--text);border-radius:var(--radius);background:var(--text);color:#fff;font-family:var(--font);font-size:12px;cursor:pointer">本文を貼り付け</button>'
    + '<button id="gmail-delivery-tab" class="gmail-tab-btn" style="padding:10px;border:2px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text2);font-family:var(--font);font-size:12px;cursor:pointer">発送通知を解析</button>'
    + '</div>'

    // 貼り付けモード
    + '<div id="gmail-paste-mode">'
    + '<div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:8px;line-height:1.6">Gmailの本文をコピーして貼り付けると、Claudeが自動で仕訳を作成します。領収書メール・支払確認メールに対応しています。</div>'
    + '<textarea id="gmail-body" placeholder="Gmailの本文をここに貼り付けてください&#10;&#10;例：&#10;ご請求金額: 15,400円（税込）&#10;お支払い方法: クレジットカード&#10;ご利用日: 2025年4月15日" style="width:100%;min-height:160px;padding:10px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:12px;background:var(--bg2);resize:vertical;outline:none" class="form-inp"></textarea>'
    + '<button id="gmail-analyze-btn" style="width:100%;padding:12px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;margin-top:8px">AIで仕訳を作成する</button>'
    + '</div>'

    // 発送通知モード
    + '<div id="gmail-delivery-mode" style="display:none">'
    + '<div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:10px;line-height:1.6">Amazonや楽天などの発送通知メールを貼り付けると、到着予定日と購入品を自動登録します。</div>'
    + '<textarea id="gmail-delivery-body" placeholder="発送通知メールの本文を貼り付けてください&#10;&#10;例：&#10;ご注文の商品を発送しました&#10;商品名: ○○○○&#10;お届け予定日: 4月17日（木）" style="width:100%;min-height:160px;padding:10px;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:12px;background:var(--bg2);resize:vertical;outline:none" class="form-inp"></textarea>'
    + '<button id="gmail-delivery-btn" style="width:100%;padding:12px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;margin-top:8px">到着予定・購入品を登録する</button>'
    + '</div>'
    + '</div>';

  // 取込結果プレビュー
  html += '<div id="gmail-result" style="display:none" class="card" style="margin-bottom:12px"></div>';

  // 取込履歴
  if (gmailLogs.length) {
    html += '<div class="card"><div class="card-title">取込履歴</div>';
    gmailLogs.slice(0, 10).forEach(function(log) {
      html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">'
        + '<div style="flex:1"><div style="font-size:12px;font-weight:600">' + (log.desc||'') + '</div>'
        + '<div style="font-family:var(--sans);font-size:9px;color:var(--text3)">' + (log.date||'') + ' · ' + (log.type==='journal' ? '仕訳作成' : '購入品登録') + '</div></div>'
        + '<div style="font-family:var(--sans);font-size:12px;font-weight:700">' + (log.amount ? log.amount.toLocaleString() + '円' : '') + '</div>'
        + '</div>';
    });
    html += '</div>';
  }

  el.innerHTML = html;

  // タブ切替
  const pasteTab = document.getElementById('gmail-paste-tab');
  const deliveryTab = document.getElementById('gmail-delivery-tab');
  const pasteMode = document.getElementById('gmail-paste-mode');
  const deliveryMode = document.getElementById('gmail-delivery-mode');

  pasteTab.onclick = function() {
    pasteTab.style.background = 'var(--text)'; pasteTab.style.color = '#fff'; pasteTab.style.borderColor = 'var(--text)';
    deliveryTab.style.background = 'var(--bg)'; deliveryTab.style.color = 'var(--text2)'; deliveryTab.style.borderColor = 'var(--border)';
    pasteMode.style.display = 'block'; deliveryMode.style.display = 'none';
  };
  deliveryTab.onclick = function() {
    deliveryTab.style.background = 'var(--text)'; deliveryTab.style.color = '#fff'; deliveryTab.style.borderColor = 'var(--text)';
    pasteTab.style.background = 'var(--bg)'; pasteTab.style.color = 'var(--text2)'; pasteTab.style.borderColor = 'var(--border)';
    deliveryMode.style.display = 'block'; pasteMode.style.display = 'none';
  };

  // 仕訳作成
  const analyzeBtn = document.getElementById('gmail-analyze-btn');
  if (analyzeBtn) analyzeBtn.onclick = async function() {
    const body = document.getElementById('gmail-body').value.trim();
    if (!body) { showToast('メール本文を入力してください'); return; }
    showLoading('AIが解析中...');
    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: "このメール本文から経費・売上の仕訳を作成してください。JSON形式で返してください。\n\n" + body,


          type: 'gmail_journal'
        })
      });
      const data = await response.json();
      if (data && data.journal) {
        const j = data.journal;
        const resultEl = document.getElementById('gmail-result');
        resultEl.style.display = 'block';
        resultEl.innerHTML = '<div class="card-title">解析結果</div>'
          + '<div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:10px">以下の仕訳を作成します</div>'
          + '<div style="font-size:13px;font-weight:700">' + (j.description||'') + '</div>'
          + '<div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:12px">' + (j.date||'') + ' · ' + (j.category||'') + ' · ' + (j.amount||0).toLocaleString() + '円</div>'
          + '<button id="gmail-confirm-btn" style="width:100%;padding:10px;background:var(--green);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer">仕訳を登録する</button>';

        document.getElementById('gmail-confirm-btn').onclick = function() {
          if (!a.journals) a.journals = [];
          j.id = Date.now();
          j.status = 'unconfirmed';
          j.source = 'gmail';
          a.journals.push(j);
          if (!a.gmail_logs) a.gmail_logs = [];
          a.gmail_logs.unshift({ desc: j.description, date: j.date, amount: j.amount, type: 'journal' });
          save(currentAcct);
          showToast('仕訳を登録しました');
          renderGmail();
        };
      }
    } catch(e) {
      showToast('解析に失敗しました: ' + e.message);
    } finally {
      hideLoading();
    }
  };

  // 発送通知解析
  const deliveryBtn = document.getElementById('gmail-delivery-btn');
  if (deliveryBtn) deliveryBtn.onclick = async function() {
    const body = document.getElementById('gmail-delivery-body').value.trim();
    if (!body) { showToast('メール本文を入力してください'); return; }
    showLoading('発送通知を解析中...');
    try {
      // シンプルな正規表現で到着予定日・商品名を抽出
      const dateMatch = body.match(/(\d{1,2})月(\d{1,2})日/);
      const itemMatch = body.match(/商品(?:名)?[：:]\s*(.+)/);
      const priceMatch = body.match(/(?:金額|価格|合計)[：:￥¥\s]*([0-9,，]+)/);

      const arrivalDate = dateMatch
        ? new Date().getFullYear() + '-' + String(dateMatch[1]).padStart(2,'0') + '-' + String(dateMatch[2]).padStart(2,'0')
        : null;
      const itemName = itemMatch ? itemMatch[1].trim().slice(0,40) : '購入品';
      const price = priceMatch ? parseInt(priceMatch[1].replace(/[,，]/g,'')) : 0;

      addPurchaseItem({
        name: itemName,
        category: 'その他',
        amount: price,
        date: new Date().toISOString().slice(0,10),
        arrival_expected: arrivalDate,
        status: 'unused',
        memo: 'Gmailから自動登録',
      });

      if (!a.gmail_logs) a.gmail_logs = [];
      a.gmail_logs.unshift({ desc: itemName + (arrivalDate ? ' · 到着予定:' + arrivalDate : ''), date: new Date().toISOString().slice(0,10), type: 'item' });
      save(currentAcct);
      showToast('購入品を登録しました' + (arrivalDate ? '（到着予定: ' + arrivalDate + '）' : ''));
      renderGmail();
    } catch(e) {
      showToast('解析に失敗しました');
    } finally {
      hideLoading();
    }
  };
}

function loadGmailDemo(){
  document.getElementById('gmail-from').value='yamada@design.jp';
  document.getElementById('gmail-subject').value='【請求書】4月分 外注デザイン費';
  document.getElementById('gmail-body').value=`田中太郎 様\n4月分の外注デザイン費をご請求いたします。\n金額：110,000円（税込・10%）\n支払期日：2026年5月31日\n適格請求書発行事業者 T1234567890123\n源泉徴収対象です。\n山田デザインスタジオ`;
}
async function analyzeGmail(){
  const body=document.getElementById('gmail-body').value;if(!body){alert('本文を貼り付けてください');return;}
  document.getElementById('gmail-loading').style.display='block';
  const today=new Date().toISOString().slice(0,10);
  try{
    const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,max_tokens:600,messages:[{role:"user",content:`差出人:${document.getElementById('gmail-from').value}\n件名:${document.getElementById('gmail-subject').value}\n本文:\n${body}\nJSONのみ: {"type":"invoice/receipt","vendor":"取引先","amount":数値,"tax_rate":10または8,"date":"YYYY-MM-DD","due_date":"YYYY-MM-DDまたはnull","is_qualified":true/false,"withholding":true/false,"category":"外注費/業務委託費/消耗品費/旅費交通費/通信費/雑費","description":"摘要","confidence":"high/medium/low","alert_reason":"不明点があれば"}`}]})});
    const d=await res.json();const p=JSON.parse(d.content[0].text.replace(/```json|```/g,'').trim());
    const wh=p.withholding?Math.floor(p.amount*0.1021):0;p._wh=wh;p._net=p.amount-wh;
    p._from=document.getElementById('gmail-from').value;p._subject=document.getElementById('gmail-subject').value;
    document.getElementById('gmail-result')._data=p;
    document.getElementById('gmail-result-data').innerHTML=`
      <div style="display:grid;grid-template-columns:80px 1fr;gap:5px;font-size:12px;margin-bottom:8px">
        <span style="color:var(--text3)">種別</span><span class="badge ${p.type==='invoice'?'b-yellow':'b-blue'}">${p.type==='invoice'?'請求書':'領収書'}</span>
        <span style="color:var(--text3)">取引先</span><span style="font-weight:700">${p.vendor}</span>
        <span style="color:var(--text3)">金額</span><span style="font-family:var(--mono);font-weight:700">${p.amount.toLocaleString()}円</span>
        <span style="color:var(--text3)">支払期日</span><span style="font-family:var(--mono)">${p.due_date||'不明'}</span>
        <span style="color:var(--text3)">適格</span><span class="badge ${p.is_qualified?'b-green':'b-yellow'}">${p.is_qualified?'対応':'非対応'}</span>
        ${wh>0?`<span style="color:var(--text3)">源泉税</span><span style="color:var(--yellow);font-family:var(--mono)">${wh.toLocaleString()}円（差引${p._net.toLocaleString()}円）</span>`:''}
      </div>
      ${p.alert_reason?`<div class="alert a-yellow">! ${p.alert_reason}</div>`:''}`;
    document.getElementById('gmail-result').style.display='block';
  }catch(err){alert('解析失敗');}
  document.getElementById('gmail-loading').style.display='none';
}
function saveGmailResult(){
  const p=document.getElementById('gmail-result')._data;if(!p)return;
  const a=accounts[currentAcct];const today=new Date().toISOString().slice(0,10);
  if(!a.gmail_items)a.gmail_items=[];
  a.gmail_items.push({id:Date.now(),from:p._from,subject:p._subject,date:today,type:p.type,amount:p.amount,vendor:p.vendor,status:'processed'});
  if(p.type==='invoice'){
    if(!a.invoices)a.invoices=[];
    a.invoices.push({id:Date.now(),date:today,vendor:p.vendor,amount:p.amount,withholding:p._wh,net:p._net,category:p.category,status:'unpaid',due_date:p.due_date||'要確認',is_qualified:p.is_qualified});
    if(!a.journals)a.journals=[];
    const j={id:Date.now()+1,date:today,type:'expense',category:p.category,description:`${p.vendor}（請求書）`,amount:p.amount,tax_type:'課税',status:'confirmed',phase:'phase2'};
    a.journals.push(j);pushStreamRow(j,true);
  }
  save(currentAcct);updateBadges();renderSidebar();updateKPIAnimated();
  document.getElementById('gmail-result').style.display='none';renderGmail();
}

// ── 請求書タブ ──
// ── インボイス登録番号バリデーション ──
function validateInvoiceNumber(num) {
  if (!num) return { valid: false, msg: '未入力' };
  const clean = num.replace(/[-\s]/g, '');
  if (!/^T\d{13}$/.test(clean)) return { valid: false, msg: 'T+13桁の数字が必要です' };
  return { valid: true, msg: '有効', formatted: clean };
}

// ── 自社インボイス番号を設定 ──
function showMyInvoiceNumberSetting() {
  const a = accounts[currentAcct];
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal">
    <div class="modal-title"> 自社インボイス登録番号を設定</div>
    <div class="alert a-blue" style="font-size:11px;margin-bottom:12px">
      インボイス制度（適格請求書等保存方式）に登録した場合、番号を設定してください。<br>
      請求書に自動印字されます。未登録の場合は空欄のままでOKです。
    </div>
    <div class="form-row">
      <span class="form-label">登録番号</span>
      <input type="text" id="my-invoice-num" placeholder="T1234567890123"
        value="${a.my_invoice_number||''}"
        oninput="previewInvoiceValidation(this.value,'my-inv-preview')"
        style="font-family:var(--mono)">
    </div>
    <div id="my-inv-preview" style="font-size:11px;margin-top:4px;color:var(--text3)"></div>
    <div class="form-row">
      <span class="form-label">課税事業者区分</span>
      <select id="my-tax-type">
        <option value="免税" ${(a.my_tax_type||'免税')==='免税'?'selected':''}>免税事業者（売上1,000万円以下）</option>
        <option value="課税" ${a.my_tax_type==='課税'?'selected':''}>課税事業者（登録済み）</option>
        <option value="簡易" ${a.my_tax_type==='簡易'?'selected':''}>課税事業者（簡易課税）</option>
      </select>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-primary btn-sm" onclick="saveMyInvoiceNumber(this)">保存</button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">キャンセル</button>
    </div>
  </div>`;
  document.getElementById('app').appendChild(bg);
  previewInvoiceValidation(a.my_invoice_number||'', 'my-inv-preview');
}

function previewInvoiceValidation(val, previewId) {
  const el = document.getElementById(previewId); if (!el) return;
  if (!val) { el.innerHTML = ''; return; }
  const r = validateInvoiceNumber(val);
  el.innerHTML = r.valid
    ? `<span style="color:var(--green)"> 有効なインボイス登録番号です（${r.formatted}）</span>`
    : `<span style="color:var(--red)"> ${r.msg}（例: T1234567890123）</span>`;
}

function saveMyInvoiceNumber(btn) {
  const a = accounts[currentAcct];
  const num = document.getElementById('my-invoice-num').value.trim();
  if (num) {
    const r = validateInvoiceNumber(num);
    if (!r.valid) { alert('番号が正しくありません: ' + r.msg); return; }
    a.my_invoice_number = r.formatted;
  } else {
    a.my_invoice_number = '';
  }
  a.my_tax_type = document.getElementById('my-tax-type').value;
  save(currentAcct); btn.closest('.modal-bg').remove();
  renderInvoices();
}

// ── 取引先のインボイス番号を登録 ──
function showPartnerInvoiceNumber(partnerName) {
  const a = accounts[currentAcct];
  const p = (a.partners_custom||[]).find(p=>p.name===partnerName) || { name: partnerName };
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal">
    <div class="modal-title"> ${partnerName} — インボイス番号</div>
    <div class="alert a-blue" style="font-size:11px;margin-bottom:12px">
      取引先の適格請求書発行事業者登録番号を記録します。<br>
      仕入税額控除を受けるためには、適格事業者からの請求書が必要です。
    </div>
    <div class="form-row">
      <span class="form-label">登録番号</span>
      <input type="text" id="partner-inv-num" placeholder="T1234567890123"
        value="${p.invoice_number||''}"
        oninput="previewInvoiceValidation(this.value,'partner-inv-preview')"
        style="font-family:var(--mono)">
    </div>
    <div id="partner-inv-preview" style="font-size:11px;margin-top:4px"></div>
    <div class="alert a-yellow" style="margin-top:10px;font-size:11px">
       国税庁の適格請求書発行事業者公表サイトで番号を確認できます。<br>
      <a href="https://www.invoice-kohyo.nta.go.jp/" target="_blank" style="color:var(--accent)">invoice-kohyo.nta.go.jp</a>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-primary btn-sm" onclick="savePartnerInvoiceNumber('${partnerName}',this)">保存</button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">キャンセル</button>
    </div>
  </div>`;
  document.getElementById('app').appendChild(bg);
  previewInvoiceValidation(p.invoice_number||'', 'partner-inv-preview');
}

function savePartnerInvoiceNumber(partnerName, btn) {
  const a = accounts[currentAcct];
  if (!a.partners_custom) a.partners_custom = [];
  const num = document.getElementById('partner-inv-num').value.trim();
  let p = a.partners_custom.find(p=>p.name===partnerName);
  if (!p) { p = { id: Date.now(), name: partnerName }; a.partners_custom.push(p); }
  if (num) {
    const r = validateInvoiceNumber(num);
    if (!r.valid) { alert('番号が正しくありません: ' + r.msg); return; }
    p.invoice_number = r.formatted;
    p.is_qualified = true;
  } else {
    p.invoice_number = '';
    p.is_qualified = false;
  }
  save(currentAcct); btn.closest('.modal-bg').remove();
  renderInvoices();
}

// ── インボイス番号照会（国税庁API）──
async function lookupInvoiceNumber(num) {
  const r = validateInvoiceNumber(num);
  if (!r.valid) { alert('番号の形式が正しくありません'); return; }
  window.open(`https://www.invoice-kohyo.nta.go.jp/regno-search/detail?selRegNo=${r.formatted.replace('T','')}`, '_blank');
}

function renderInvoices(){
  const a = accounts[currentAcct];
  const invoices = a.invoices||[];
  const unpaid = invoices.filter(i=>i.status==='unpaid');
  const qualified = invoices.filter(i=>i.is_qualified);
  const unqualified = invoices.filter(i=>!i.is_qualified && i.status==='paid');
  const totalWithholding = invoices.reduce((s,i)=>s+(i.withholding||0),0);

  // 80%・50%控除期間の判定（2023年10月〜2029年9月）
  const now = new Date();
  const isTransitionPeriod = now >= new Date('2023-10-01') && now < new Date('2029-10-01');
  const deductionRate = now < new Date('2026-10-01') ? 80 : 50;

  document.getElementById('main-content').innerHTML = `
    <!-- KPI -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi"><div class="kpi-label">未払い合計</div>
        <div class="kpi-value" style="color:var(--yellow);font-size:18px">${unpaid.reduce((s,i)=>s+i.amount,0).toLocaleString()}円</div></div>
      <div class="kpi"><div class="kpi-label">適格請求書</div>
        <div class="kpi-value" style="color:var(--green)">${qualified.length}件</div>
        <div class="kpi-sub">仕入税額控除可</div></div>
      <div class="kpi"><div class="kpi-label">非適格請求書</div>
        <div class="kpi-value" style="color:${unqualified.length>0?'var(--red)':'var(--text3)'}">${unqualified.length}件</div>
        <div class="kpi-sub">${isTransitionPeriod?deductionRate+'%控除':'控除不可'}</div></div>
      <div class="kpi"><div class="kpi-label">源泉徴収合計</div>
        <div class="kpi-value" style="color:var(--yellow)">${totalWithholding.toLocaleString()}円</div>
        <div class="kpi-sub">確定申告で控除</div></div>
    </div>

    <!-- 自社インボイス番号 -->
    <div class="card" style="border-color:${a.my_invoice_number?'rgba(46,204,140,0.3)':'var(--border)'}">
      <div class="card-title">
         自社インボイス登録番号
        <button class="btn btn-sm btn-ghost" onclick="showMyInvoiceNumberSetting()">設定・変更</button>
      </div>
      ${a.my_invoice_number
        ? `<div style="display:flex;align-items:center;gap:10px">
            <span style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--green)">${a.my_invoice_number}</span>
            <span class="badge b-green">適格請求書発行事業者</span>
            <button class="btn btn-ghost btn-sm" onclick="lookupInvoiceNumber('${a.my_invoice_number}')">国税庁で確認</button>
           </div>
           <div style="font-size:11px;color:var(--text3);margin-top:4px">課税区分: ${a.my_tax_type||'未設定'}</div>`
        : `<div style="font-size:13px;color:var(--text3)">未設定（免税事業者の場合は空欄でOK）</div>
           <div class="alert a-yellow" style="margin-top:8px;font-size:11px">
             ! インボイス登録事業者の場合は番号を設定してください。請求書に自動印字されます。
           </div>`}
    </div>

    <!-- 経過措置アラート -->
    ${isTransitionPeriod ? `<div class="alert a-yellow">
       <strong>インボイス経過措置期間中</strong>（〜2029年9月）：非適格事業者からの仕入れでも<strong>${deductionRate}%の仕入税額控除</strong>が可能です。
      ${now >= new Date('2026-10-01') ? '2026年10月以降は50%に縮小されました。' : '2026年9月まで80%、10月以降50%に縮小されます。'}
    </div>` : ''}

    <!-- ボタン行 -->
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="showAddInvoice()">＋ 請求書を追加</button>
      <button class="btn btn-sm" onclick="exportWithholdingCSV()"> 支払調書CSV</button>
      <button class="btn btn-sm" onclick="exportInvoiceCSV()"> 請求書一覧CSV</button>
    </div>

    <!-- 請求書一覧 -->
    <div class="card">
      <div class="card-title"> 請求書・支払明細一覧（${invoices.length}件）</div>
      ${invoices.length ? `
        <div style="overflow-x:auto">
        <table><thead><tr>
          <th>日付</th><th>支払先</th><th>請求額</th><th>源泉税</th><th>差引支払</th>
          <th>登録番号</th><th>適格</th><th>状態</th>
        </tr></thead>
        <tbody>${invoices.map(inv=>{
          const partner = (a.partners_custom||[]).find(p=>p.name===inv.vendor);
          const invNum = partner?.invoice_number || inv.invoice_number || '';
          return `<tr>
            <td style="font-family:var(--mono);font-size:10px">${inv.date}</td>
            <td style="font-weight:700;font-size:12px">${inv.vendor}</td>
            <td style="font-family:var(--mono)">${inv.amount.toLocaleString()}円</td>
            <td style="font-family:var(--mono);color:var(--yellow)">${(inv.withholding||0)>0?'' +inv.withholding.toLocaleString():'—'}</td>
            <td style="font-family:var(--mono)">${(inv.net||inv.amount-(inv.withholding||0)).toLocaleString()}円</td>
            <td>
              ${invNum
                ? `<span style="font-family:var(--mono);font-size:10px;color:var(--green)">${invNum}</span>
                   <button class="btn btn-ghost btn-sm" style="font-size:9px;padding:1px 4px" onclick="lookupInvoiceNumber('${invNum}')">照会</button>`
                : `<button class="btn btn-ghost btn-sm" style="font-size:9px" onclick="showPartnerInvoiceNumber('${inv.vendor}')">番号を登録</button>`}
            </td>
            <td>
              <span class="badge ${inv.is_qualified?'b-green':'b-yellow'}" style="font-size:9px">
                ${inv.is_qualified?' 適格':'非適格'}
              </span>
              ${!inv.is_qualified && isTransitionPeriod
                ? `<div style="font-size:9px;color:var(--yellow)">${deductionRate}%控除可</div>` : ''}
            </td>
            <td>
              <select onchange="updateInvStatus(${inv.id},this.value)" style="font-size:10px;padding:2px 6px;background:var(--bg3);border-color:var(--border)">
                <option${inv.status==='unpaid'?' selected':''} value="unpaid">未払い</option>
                <option${inv.status==='paid'?' selected':''} value="paid">支払済</option>
              </select>
            </td>
          </tr>`;
        }).join('')}</tbody></table>
        </div>
      ` : '<div class="empty">請求書がありません<br><button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="showAddInvoice()">最初の請求書を追加</button></div>'}
    </div>
  `;
}

function updateInvStatus(id,status){
  const a=accounts[currentAcct];
  const inv=(a.invoices||[]).find(i=>i.id==id);
  if(inv){ inv.status=status; save(currentAcct); }
}

// ── 請求書追加モーダル ──
function showAddInvoice() {
  const bg = document.createElement('div'); bg.className='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:480px">
    <div class="modal-title">＋ 請求書・支払明細を追加</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">日付</div>
        <input type="date" id="inv-date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">支払先</div>
        <input type="text" id="inv-vendor" placeholder="山田 太郎"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">請求額（円）</div>
        <input type="number" id="inv-amount" placeholder="100000" oninput="calcWithholding()"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">源泉徴収</div>
        <input type="number" id="inv-withholding" placeholder="10210" style="font-family:var(--mono)"></div>
    </div>
    <div id="withholding-calc" style="font-size:11px;color:var(--text3);margin-bottom:8px"></div>
    <div class="form-row"><span class="form-label">登録番号（支払先）</span>
      <input type="text" id="inv-invnum" placeholder="T1234567890123" style="font-family:var(--mono)"
        oninput="previewInvoiceValidation(this.value,'inv-num-preview')"></div>
    <div id="inv-num-preview" style="font-size:11px;margin-bottom:8px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">勘定科目</div>
        <select id="inv-cat">
          <option>外注費</option><option>業務委託費</option><option>支払報酬料</option>
          <option>広告宣伝費</option><option>支払手数料</option><option>雑費</option>
        </select></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">支払期日</div>
        <input type="date" id="inv-due"></div>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:12px;font-size:13px;align-items:center">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="inv-qualified">
        <span>適格請求書（インボイス）</span>
      </label>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-primary btn-sm" onclick="addInvoice(this)">追加</button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">キャンセル</button>
    </div>
  </div>`;
  document.getElementById('app').appendChild(bg);
}

function calcWithholding() {
  const amount = parseInt(document.getElementById('inv-amount')?.value)||0;
  const el = document.getElementById('withholding-calc');
  if (!el || !amount) return;
  // 100万円以下: 10.21%、100万円超: 20.42%
  const rate = amount <= 1000000 ? 0.1021 : 0.2042;
  const wh = Math.floor(amount * rate);
  const net = amount - wh;
  el.innerHTML = ` 源泉徴収の目安: ${wh.toLocaleString()}円（${(rate*100).toFixed(2)}%）→ 差引支払 ${net.toLocaleString()}円`;
  const whInput = document.getElementById('inv-withholding');
  if (whInput && !whInput.value) whInput.value = wh;
}

function addInvoice(btn) {
  const a = accounts[currentAcct];
  if (!a.invoices) a.invoices=[];
  const num = document.getElementById('inv-invnum').value.trim();
  const isQualified = document.getElementById('inv-qualified').checked || (num && validateInvoiceNumber(num).valid);
  const amount = parseInt(document.getElementById('inv-amount').value)||0;
  const withholding = parseInt(document.getElementById('inv-withholding').value)||0;
  const inv = {
    id: Date.now(),
    date: document.getElementById('inv-date').value,
    vendor: document.getElementById('inv-vendor').value,
    amount, withholding,
    net: amount - withholding,
    invoice_number: num ? (validateInvoiceNumber(num).formatted || num) : '',
    category: document.getElementById('inv-cat').value,
    due_date: document.getElementById('inv-due').value,
    is_qualified: isQualified,
    status: 'unpaid',
  };
  // 取引先マスタにも登録
  if (!a.partners_custom) a.partners_custom=[];
  const existing = a.partners_custom.find(p=>p.name===inv.vendor);
  if (!existing && inv.vendor) {
    a.partners_custom.push({
      id: Date.now()+1, name: inv.vendor,
      invoice_number: inv.invoice_number,
      is_qualified: isQualified,
      category: inv.category,
    });
  } else if (existing && inv.invoice_number) {
    existing.invoice_number = inv.invoice_number;
    existing.is_qualified = isQualified;
  }
  a.invoices.push(inv);
  save(currentAcct); updateKPI();
  btn.closest('.modal-bg').remove();
  renderInvoices();
}

// ── 請求書一覧CSV ──
function exportInvoiceCSV() {
  const a = accounts[currentAcct];
  const rows = [['日付','支払先','請求額','源泉徴収','差引支払','登録番号','適格','状態','支払期日']];
  (a.invoices||[]).forEach(inv=>{
    const p = (a.partners_custom||[]).find(p=>p.name===inv.vendor);
    rows.push([inv.date, inv.vendor, inv.amount, inv.withholding||0,
      inv.amount-(inv.withholding||0),
      p?.invoice_number||inv.invoice_number||'',
      inv.is_qualified?'適格':'非適格', inv.status==='paid'?'支払済':'未払い', inv.due_date||'']);
  });
  const csv = rows.map(r=>r.map(v=>'"'+v+'"').join(',')).join('\n');
  const blob = new Blob(['﻿'+csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href=url;
  link.download=`請求書一覧_${a.year}.csv`; link.click();
  URL.revokeObjectURL(url);
}

// ── 仕訳帳タブ ──
function renderJournal(filterCat='', filterWord='', filterType=''){
  const a=accounts[currentAcct];
  const cats=['売上高','仕入高','接待交際費','会議費','消耗品費','旅費交通費','通信費','広告宣伝費','地代家賃','水道光熱費','支払手数料','外注費','租税公課','損害保険料','修繕費','減価償却費','給与賃金','福利厚生費','賃借料','新聞図書費','研究開発費','荷造運賃','車両費','利子割引料','雑費'];
  // フィルタリング
  const journalsAll = (a.journals||[]).slice().reverse();
  const journalsFiltered = journalsAll.filter(j => {
    if (filterType && j.type !== filterType) return false;
    if (filterCat  && j.category !== filterCat) return false;
    if (filterWord) {
      const w = filterWord.toLowerCase();
      if (!j.description.toLowerCase().includes(w) &&
          !String(j.amount).includes(w) &&
          !j.category.toLowerCase().includes(w)) return false;
    }
    return true;
  });
  document.getElementById('main-content').innerHTML=`
    <div class="card"><div class="card-title">仕訳を手動追加</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px">
        <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">日付</div><input type="date" id="j-date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">区分</div><select id="j-type"><option value="expense">支出</option><option value="income">収入</option></select></div>
        <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">勘定科目</div><select id="j-cat">${cats.map(c=>`<option>${c}</option>`).join('')}</select></div>
        <div><div style="font-size:11px;color:var(--text3);margin-bottom:4px">金額（円）</div><input type="number" id="j-amt" placeholder="0"></div>
      </div>
      <div style="margin-bottom:8px"><input type="text" id="j-desc" placeholder="摘要を入力"></div>
      <button class="btn btn-primary btn-sm" onclick="addJournal()">仕訳を追加 → 損益に即時反映</button>
    </div>
    <div class="card"><div class="card-title">
         仕訳帳（全${(a.journals||[]).length}件）
        <button class="btn btn-sm" onclick="exportJournalCSV()"> CSV</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
        <input type="text" id="j-filter-word" placeholder=" 摘要・金額で検索" oninput="applyJournalFilter()" value="${filterWord}" style="font-size:12px">
        <select id="j-filter-cat" onchange="applyJournalFilter()" style="font-size:12px">
          <option value="">すべての科目</option>
          ${[...new Set((a.journals||[]).map(j=>j.category))].sort().map(c=>`<option value="${c}"${c===filterCat?' selected':''}>${c}</option>`).join('')}
        </select>
        <select id="j-filter-type" onchange="applyJournalFilter()" style="font-size:12px">
          <option value="">収支すべて</option>
          <option value="income"${filterType==='income'?' selected':''}>収入のみ</option>
          <option value="expense"${filterType==='expense'?' selected':''}>支出のみ</option>
        </select>
      </div>
      ${(filterCat||filterWord||filterType)?`<div style="font-size:11px;color:var(--text3);margin-bottom:4px">${journalsFiltered.length}件 / 合計${journalsFiltered.reduce((s,j)=>s+(j.type==='income'?j.amount:-j.amount),0).toLocaleString()}円</div>`:''}
      <div style="max-height:480px;overflow-y:auto">
      <table><thead><tr><th>日付</th><th>摘要</th><th>科目</th><th>税区分</th><th>金額</th><th>判定</th><th></th></tr></thead>
      <tbody>${journalsFiltered.map(j=>`<tr>
        <td style="font-family:var(--mono);font-size:10px">${j.date}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.description}</td>
        <td><span class="badge b-gray" style="font-size:9px">${j.category}</span></td>
        <td>${j.tax_type?`<span class="${j.tax_rate===8?'tax8':j.tax_type==='不課税'||j.tax_type==='非課税'?'taxfree':'tax10'}" style="font-size:9px">${j.tax_type}</span>`:'-'}</td>
        <td style="font-family:var(--mono);color:${j.type==='income'?'var(--green)':'var(--red)'};font-weight:700;font-size:11px">${j.type==='income'?'+':'-'}${j.amount.toLocaleString()}円</td>
        <td><span class="${j.phase==='phase1'?'phase1':'phase2'}" style="font-size:9px">${j.phase==='phase1'?'P1':'P2'}</span></td>
        <td><button class="btn btn-ghost btn-sm" style="font-size:9px;padding:1px 5px" onclick="showCorrectJournal(\`${j.id}\`)">修正</button></td>
      </tr>`).join('')}</tbody></table>
    </div>`;
}
function addJournal(){
  const a=accounts[currentAcct];if(!a.journals)a.journals=[];
  const j={id:Date.now(),date:document.getElementById('j-date').value,type:document.getElementById('j-type').value,category:document.getElementById('j-cat').value,description:document.getElementById('j-desc').value||'手動仕訳',amount:parseInt(document.getElementById('j-amt').value)||0,tax_type:'課税',status:'confirmed',phase:'manual'};
  a.journals.push(j);pushStreamRow(j,true);
  save(currentAcct);renderSidebar();updateKPIAnimated();renderJournal();
}

// ── ルール集タブ ──
function renderRules() {
  const el = document.getElementById('main-content');
  if (!el) return;

  const lrData = calcLearningScore();
  const rank = getLearningRank(lrData.score);
  const rules = getLearningRules();

  // KPIカード
  let html = '<div class="kpi-grid" style="margin-bottom:12px">'
    + '<div class="kpi"><div class="kpi-label">学習ランク</div><div class="kpi-value" style="color:' + rank.color + ';font-size:20px">' + rank.label + '</div></div>'
    + '<div class="kpi"><div class="kpi-label">学習評点</div><div class="kpi-value">' + lrData.score + '</div></div>'
    + '<div class="kpi"><div class="kpi-label">登録ルール数</div><div class="kpi-value">' + lrData.totalRules + '</div></div>'
    + '<div class="kpi"><div class="kpi-label">適用回数</div><div class="kpi-value">' + lrData.totalApplied + '</div></div>'
    + '</div>';

  // 判定フロー説明
  html += '<div class="card" style="margin-bottom:12px">'
    + '<div class="card-title">AI判定フロー</div>'
    + '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-family:var(--sans);font-size:11px">'
    + '<div style="padding:6px 12px;background:var(--green-bg);border:1px solid rgba(26,92,53,0.2);border-radius:99px;font-weight:700;color:var(--green)">学習データ</div>'
    + '<div style="color:var(--text3)">→</div>'
    + '<div style="padding:6px 12px;background:var(--blue-bg);border:1px solid rgba(26,61,110,0.2);border-radius:99px;font-weight:700;color:var(--blue)">Phase1 辞書</div>'
    + '<div style="color:var(--text3)">→</div>'
    + '<div style="padding:6px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:99px;font-weight:700">ルール判定</div>'
    + '<div style="color:var(--text3)">→</div>'
    + '<div style="padding:6px 12px;background:var(--yellow-bg);border:1px solid rgba(170,119,0,0.2);border-radius:99px;font-weight:700;color:var(--yellow,#8b6914)">Phase2 Claude AI</div>'
    + '</div>'
    + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-top:8px;line-height:1.6">学習データが最優先で適用されます。蓄積するほど自動分類の精度が上がります。</div>'
    + '</div>';

  // 学習ルール一覧
  html += '<div class="card" style="margin-bottom:12px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
    + '<div class="card-title" style="margin:0">学習ルール一覧</div>'
    + '<button id="add-rule-btn" style="padding:5px 12px;background:var(--text);color:#fff;border:none;border-radius:6px;font-family:var(--sans);font-size:11px;cursor:pointer">＋ 追加</button>'
    + '</div>';

  if (!rules.length) {
    html += '<div style="font-family:var(--sans);font-size:12px;color:var(--text3);padding:16px 0;text-align:center">学習ルールがまだありません。<br>レシートを修正すると自動で学習します。</div>';
  } else {
    // ソース別に分類
    const userRules = rules.filter(function(r){ return r.source === 'user_correction'; });
    const manualRules = rules.filter(function(r){ return r.source === 'manual'; });
    const otherRules = rules.filter(function(r){ return r.source !== 'user_correction' && r.source !== 'manual'; });

    const renderRuleGroup = function(title, groupRules, color) {
      if (!groupRules.length) return '';
      let g = '<div style="font-family:var(--sans);font-size:9px;font-weight:700;letter-spacing:1px;color:' + color + ';margin:10px 0 6px">' + title + ' (' + groupRules.length + '件)</div>';
      groupRules.forEach(function(r) {
        g += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">'
          + '<div style="flex:1"><div style="font-size:12px;font-weight:600">' + r.pattern + '</div>'
          + '<div style="font-family:var(--sans);font-size:9px;color:var(--text3)">適用 ' + (r.applied||0) + '回 · ' + (r.created_at||'').slice(0,10) + '</div></div>'
          + '<div style="font-family:var(--sans);font-size:11px;color:var(--blue);font-weight:700;min-width:80px;text-align:right">' + r.category + '</div>'
          + '<button data-rid="' + r.id + '" class="rule-del-btn" style="padding:3px 8px;background:var(--red-bg);color:var(--red);border:none;border-radius:4px;font-size:9px;cursor:pointer;font-family:var(--sans)">削除</button>'
          + '</div>';
      });
      return g;
    };

    html += renderRuleGroup('ユーザー補正（自動学習）', userRules, 'var(--green)');
    html += renderRuleGroup('手動登録', manualRules, 'var(--blue)');
    html += renderRuleGroup('その他', otherRules, 'var(--text3)');
  }
  html += '</div>';

  // Phase1辞書サンプル
  html += '<div class="card">'
    + '<div class="card-title">Phase1 キーワード辞書（主要パターン）</div>'
    + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-bottom:10px">以下のキーワードを含む場合は辞書で即時分類されます</div>';

  const sampleKW = [
    ['タクシー・電車・交通', '旅費交通費'],
    ['スターバックス・カフェ', '会議費'],
    ['東京電力・電気代', '水道光熱費'],
    ['ソフトバンク・通信費', '通信費'],
    ['家賃・賃料', '地代家賃'],
    ['アマゾン・楽天', '消耗品費'],
    ['接待・会食', '接待交際費'],
    ['給与・賃金', '給与賃金'],
  ];

  sampleKW.forEach(function(kw) {
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-family:var(--sans);font-size:11px">'
      + '<span style="color:var(--text2)">' + kw[0] + '</span>'
      + '<span style="color:var(--blue);font-weight:700">' + kw[1] + '</span>'
      + '</div>';
  });
  html += '</div>';

  el.innerHTML = html;

  // イベント設定
  const addBtn = document.getElementById('add-rule-btn');
  if (addBtn) addBtn.onclick = showLearningRulesModal;

  el.querySelectorAll('.rule-del-btn').forEach(function(btn) {
    btn.onclick = function() {
      deleteLearningRule(parseInt(btn.dataset.rid));
      renderRules();
    };
  });
}

function showAddAccount(){
  const bg=document.createElement('div');bg.className='modal-bg';
  bg.innerHTML=`<div class="modal"><div class="modal-title">事業者を追加</div>
    <div class="form-row"><span class="form-label">氏名</span><input type="text" id="new-name" placeholder="山田 太郎"></div>
    <div class="form-row"><span class="form-label">メール</span><input type="email" id="new-email" placeholder="yamada@example.com"></div>
    <div class="form-row"><span class="form-label">業種</span><input type="text" id="new-biz" placeholder="フリーランス / カフェ"></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-primary btn-sm" onclick="createAccount(this)">作成</button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">キャンセル</button>
    </div>
  </div>`;
  document.getElementById('app').appendChild(bg);
}
function createAccount(btn){
  const email=document.getElementById('new-email').value;
  if(!email||accounts[email]){alert('有効なメールアドレスを入力してください');return;}
  accounts[email]={name:document.getElementById('new-name').value,email,business:document.getElementById('new-biz').value,year:2026,journals:[],receipts:[],invoices:[],pending:[],gmail_items:[],auto_queue:[],depreciation:[]};
  save(email);btn.closest('.modal-bg').remove();renderSidebar();selectAccount(email);
}
function toBase64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(file)});}


// ═══════════════════════════════════════════════════════
// freee API 連携モジュール
// OAuth2.0 認証 + 仕訳送信 + 勘定科目マッピング
// ═══════════════════════════════════════════════════════

// 忍者帳場勘定科目 → freee account_item_id マッピング
// freee側のIDは事業所ごとに異なるため、接続時に取得して上書きする
const FREEE_CAT_MAP = {
  '売上高':         { default_name:'売上高',      category:'income' },
  '仕入高':         { default_name:'仕入高',      category:'expense' },
  '旅費交通費':     { default_name:'旅費交通費',  category:'expense' },
  '通信費':         { default_name:'通信費',      category:'expense' },
  '消耗品費':       { default_name:'消耗品費',    category:'expense' },
  '会議費':         { default_name:'会議費',      category:'expense' },
  '接待交際費':     { default_name:'交際費',      category:'expense' },
  '外注費':         { default_name:'外注費',      category:'expense' },
  '支払報酬料':     { default_name:'支払報酬料',  category:'expense' },
  '地代家賃':       { default_name:'地代家賃',    category:'expense' },
  '水道光熱費':     { default_name:'水道光熱費',  category:'expense' },
  '広告宣伝費':     { default_name:'広告宣伝費',  category:'expense' },
  '損害保険料':     { default_name:'損害保険料',  category:'expense' },
  '修繕費':         { default_name:'修繕費',      category:'expense' },
  '減価償却費':     { default_name:'減価償却費',  category:'expense' },
  '給与賃金':       { default_name:'給料賃金',    category:'expense' },
  '福利厚生費':     { default_name:'福利厚生費',  category:'expense' },
  '賃借料':         { default_name:'賃借料',      category:'expense' },
  '新聞図書費':     { default_name:'新聞図書費',  category:'expense' },
  '研究開発費':     { default_name:'研修費',      category:'expense' },
  '荷造運賃':       { default_name:'荷造運賃',    category:'expense' },
  '車両費':         { default_name:'車両費',      category:'expense' },
  '支払手数料':     { default_name:'支払手数料',  category:'expense' },
  '租税公課':       { default_name:'租税公課',    category:'expense' },
  '利子割引料':     { default_name:'支払利息',    category:'expense' },
  '雑費':           { default_name:'雑費',        category:'expense' },
};

// 消費税区分コード（freee形式）
const FREEE_TAX_CODE = {
  '課税':        3,   // 課税売上/仕入 10%
  '課税（軽減）': 6,   // 軽減税率 8%
  '不課税':      0,   // 不課税
  '非課税':      1,   // 非課税
};

// ── freee OAuth2.0 認証フロー ──
function startFreeeOAuth() {
  const a = accounts[currentAcct];
  const cfg = a.freee_config || {};
  if (!cfg.client_id) {
    alert('Client IDを入力してください');
    document.getElementById('freee-client-id').focus();
    return;
  }
  // PKCE不要のImplicit Flow（デモ用）
  // 本番はAuthorization Code + PKCEを使う
  const params = new URLSearchParams({
    response_type: 'token',
    client_id: cfg.client_id,
    redirect_uri: window.location.href.split('?')[0],
    scope: 'accounting write',
    state: currentAcct
  });
  const authUrl = 'https://accounts.secure.freee.co.jp/public_api/authorize?' + params;
  // 新しいウィンドウで開く
  const popup = window.open(authUrl, 'freee_auth', 'width=600,height=700');
  if (!popup) {
    alert('ポップアップがブロックされました。ブラウザの設定を確認してください。');
    return;
  }
  // トークンをURLハッシュから取得
  const timer = setInterval(() => {
    try {
      const hash = popup.location.hash;
      if (hash && hash.includes('access_token')) {
        clearInterval(timer);
        popup.close();
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        if (token) {
          cfg.access_token = token;
          cfg.connected = true;
          save(currentAcct);
          fetchFreeeCompany();
        }
      }
    } catch(e) { /* cross-origin, まだ認証中 */ }
  }, 500);
}

// トークンを手動設定（開発者・上級者向け）
function setManualToken() {
  const a = accounts[currentAcct];
  if (!a.freee_config) a.freee_config = {};
  const token = document.getElementById('freee-manual-token').value.trim();
  const companyId = document.getElementById('freee-company-id').value.trim();
  if (!token) { alert('アクセストークンを入力してください'); return; }
  a.freee_config.access_token = token;
  a.freee_config.company_id = companyId;
  a.freee_config.connected = !!token;
  save(currentAcct);
  addSyncLog('トークンを手動設定しました', 'info');
  if (token && companyId) fetchFreeeCompany();
  else renderFreee();
}

// freee事業所情報を取得してcompany_idを確認
async function fetchFreeeCompany() {
  const a = accounts[currentAcct];
  const cfg = a.freee_config || {};
  if (!cfg.access_token) return;
  try {
    const res = await fetch('https://api.freee.co.jp/api/1/users/me', {
      headers: { 'Authorization': 'Bearer ' + cfg.access_token, 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    const companies = d.user?.companies || [];
    if (companies.length > 0 && !cfg.company_id) {
      cfg.company_id = String(companies[0].id);
    }
    cfg.connected = true;
    save(currentAcct);
    addSyncLog('freee接続成功: ' + (d.user?.display_name || ''), 'success');
    // 勘定科目マスタを取得してマッピングを確定
    await fetchFreeeAccountItems();
    renderFreee();
  } catch(e) {
    addSyncLog('freee接続エラー: ' + e.message, 'error');
    renderFreee();
  }
}

// freeeの勘定科目マスタを取得してIDをマッピング
async function fetchFreeeAccountItems() {
  const a = accounts[currentAcct];
  const cfg = a.freee_config || {};
  if (!cfg.access_token || !cfg.company_id) return;
  try {
    const res = await fetch(
      `https://api.freee.co.jp/api/1/account_items?company_id=${cfg.company_id}`,
      { headers: { 'Authorization': 'Bearer ' + cfg.access_token } }
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    const items = d.account_items || [];
    // 忍者帳場の科目名 → freee account_item_id に紐付け
    if (!cfg.account_item_map) cfg.account_item_map = {};
    for (const [ninjaName, info] of Object.entries(FREEE_CAT_MAP)) {
      const found = items.find(i =>
        i.name === info.default_name ||
        i.name === ninjaName ||
        i.shortcut1 === ninjaName
      );
      if (found) cfg.account_item_map[ninjaName] = found.id;
    }
    save(currentAcct);
    addSyncLog(`勘定科目マスタ取得完了: ${items.length}件`, 'success');
  } catch(e) {
    addSyncLog('勘定科目取得エラー: ' + e.message, 'error');
  }
}

// ── 仕訳をfreeeに送信（メイン機能）──
async function syncToFreee(mode = 'all') {
  const a = accounts[currentAcct];
  const cfg = a.freee_config || {};
  if (!cfg.access_token || !cfg.company_id) {
    alert('先にfreeeと接続してください');
    return;
  }
  const journals = (a.journals || []).filter(j => j.status === 'confirmed');
  // 送信対象を絞る
  const targets = mode === 'unsent'
    ? journals.filter(j => !j.freee_deal_id)  // 未送信のみ
    : journals;                                 // 全件

  if (!targets.length) {
    addSyncLog('送信対象の仕訳がありません', 'info');
    renderFreee();
    return;
  }

  let successCount = 0, errorCount = 0, skipCount = 0;
  addSyncLog(`freee送信開始: ${targets.length}件`, 'info');

  for (const j of targets) {
    if (j.freee_deal_id) { skipCount++; continue; } // 送信済みはスキップ

    try {
      const dealId = await postJournalToFreee(j, cfg);
      j.freee_deal_id = dealId;
      successCount++;
      // 少し間隔を空けてAPI制限に配慮
      await new Promise(r => setTimeout(r, 300));
    } catch(e) {
      errorCount++;
      addSyncLog(`送信失敗: ${j.description} — ${e.message}`, 'error');
    }
  }

  save(currentAcct);
  addSyncLog(
    `送信完了: 成功${successCount}件 / エラー${errorCount}件 / スキップ${skipCount}件`,
    errorCount > 0 ? 'warning' : 'success'
  );
  renderFreee();
}

// 1件の仕訳をfreee Deals APIに送信
async function postJournalToFreee(j, cfg) {
  const map = cfg.account_item_map || {};

  // freeeの勘定科目IDを解決
  const acctId = map[j.category];
  if (!acctId) {
    throw new Error(`勘定科目「${j.category}」のfreee IDが未設定`);
  }

  // 収入/支出の口座（未分類口座 = freeeのデフォルト未決済口座を使う）
  // 本番ではユーザーが指定した口座IDを使う
  const taxCode = FREEE_TAX_CODE[j.tax_type] ?? 3;

  // freee Deals API のリクエストボディ
  // 支出: debit=勘定科目, credit=未払金/現金
  // 収入: debit=売掛金/現金, credit=勘定科目
  const isIncome = j.type === 'income';
  const body = {
    company_id: parseInt(cfg.company_id),
    issue_date: j.date,
    type: isIncome ? 'income' : 'expense',
    due_date: j.date,
    description: j.description,
    details: [
      {
        tax_code: taxCode,
        account_item_id: acctId,
        amount: j.amount,
        description: j.description,
        // 収入なら credit 側、支出なら debit 側に科目を配置
        ...(isIncome
          ? { entry_side: 'credit' }
          : { entry_side: 'debit' }
        )
      }
    ]
  };

  const res = await fetch('https://api.freee.co.jp/api/1/deals', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + cfg.access_token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'HTTP ' + res.status);
  }

  const d = await res.json();
  return d.deal?.id;
}

// 接続解除
function disconnectFreee() {
  if (!confirm('freeeとの接続を解除しますか？')) return;
  const a = accounts[currentAcct];
  a.freee_config = { client_id:'', client_secret:'', access_token:'', company_id:'', connected:false };
  save(currentAcct);
  addSyncLog('freeeとの接続を解除しました', 'info');
  renderFreee();
}

// 同期ログに追記
function addSyncLog(message, type='info') {
  const a = accounts[currentAcct];
  if (!a.freee_sync_log) a.freee_sync_log = [];
  a.freee_sync_log.unshift({
    time: new Date().toLocaleTimeString('ja-JP'),
    date: new Date().toLocaleDateString('ja-JP'),
    message,
    type
  });
  if (a.freee_sync_log.length > 50) a.freee_sync_log.pop();
  save(currentAcct);
}

// ── freee連携タブUI ──
function renderFreee() {
  const a = accounts[currentAcct];
  const cfg = a.freee_config || {};
  const journals = (a.journals || []).filter(function(j){ return j.status === 'confirmed'; });
  const sbStatus = SB.client ? ' Supabase接続済み — データはクラウドに保存されます' : '! Supabase未設定 — データはこのブラウザにのみ保存されます';
  const sbColor = SB.client ? 'var(--green)' : 'var(--yellow)';
  const sentCount = journals.filter(j => j.freee_deal_id).length;
  const unsentCount = journals.filter(j => !j.freee_deal_id).length;
  const pl = calcPL(a);

  document.getElementById('main-content').innerHTML = `
    <!-- Supabase状態 -->
    <div class="card" style="border-left:3px solid ${SB.client ? 'var(--green)' : 'var(--yellow)'};margin-bottom:10px;padding:12px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:12px;font-weight:700;color:${SB.client ? 'var(--green)' : 'var(--yellow)'};margin-bottom:2px">
            ${SB.client ? ' データ保存：Supabaseクラウド' : '! データ保存：このブラウザのみ（Supabase未設定）'}
          </div>
          <div style="font-size:11px;color:var(--text3)">Supabaseを設定するとデータがクラウドに保存され、どのデバイスからでもアクセスできます</div>
        </div>
        <button class="btn btn-sm" onclick="testSupabaseConnection()" style="flex-shrink:0;margin-left:8px">接続テスト</button>
      </div>
      <div id="supabase-test-result" style="display:none;font-size:11px;margin-top:6px"></div>
    </div>
    <div id="freee-mismatch-warning"></div>
    <!-- 接続状態バナー -->
    <div class="alert ${cfg.connected ? 'a-green' : 'a-yellow'}" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span>${cfg.connected
        ? ` freeeと接続済み${cfg.company_id ? '（事業所ID: ' + cfg.company_id + '）' : ''}`
        : '! freeeと未接続 — 下の設定から接続してください'}</span>
      ${cfg.connected ? `<button class="btn btn-sm btn-danger" onclick="disconnectFreee()">接続解除</button>` : ''}
    </div>

    <!-- KPI -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi"><div class="kpi-label">送信済み</div><div class="kpi-value" style="color:var(--green)">${sentCount}件</div></div>
      <div class="kpi"><div class="kpi-label">未送信</div><div class="kpi-value" style="color:${unsentCount>0?'var(--yellow)':'var(--text)'}">${unsentCount}件</div></div>
      <div class="kpi"><div class="kpi-label">確定仕訳合計</div><div class="kpi-value" style="font-size:15px">${journals.length}件</div></div>
      <div class="kpi"><div class="kpi-label">営業利益</div><div class="kpi-value" style="font-size:15px;color:${pl.opProfit>=0?'var(--green)':'var(--red)'}">${fmtM(pl.opProfit)}</div></div>
    </div>

    <!-- 送信操作 -->
    <div class="card">
      <div class="card-title"> freeeに仕訳を送信</div>
      ${!cfg.connected ? `<div class="alert a-yellow">接続後に送信できます</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button class="btn btn-primary" onclick="syncToFreee('unsent')" ${!cfg.connected?'disabled':''}>
          ⬆ 未送信のみ送信（${unsentCount}件）
        </button>
        <button class="btn btn-sm" onclick="syncToFreee('all')" ${!cfg.connected?'disabled':''}>
           全件再送信（${journals.length}件）
        </button>
        <button class="btn btn-sm" onclick="fetchFreeeAccountItems()" ${!cfg.connected?'disabled':''}>
           勘定科目マスタ再取得
        </button>
      </div>

      <!-- 送信仕訳プレビュー -->
      <div style="font-size:11px;font-weight:700;margin-bottom:6px;color:var(--text2)">送信対象プレビュー（未送信 ${unsentCount}件）</div>
      ${unsentCount > 0 ? `
        <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm)">
          <table><thead><tr><th>日付</th><th>摘要</th><th>科目</th><th>税区分</th><th>金額</th><th>freee ID</th></tr></thead>
          <tbody>${journals.filter(j=>!j.freee_deal_id).slice(0,20).map(j=>`<tr>
            <td style="font-family:var(--mono);font-size:10px">${j.date}</td>
            <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.description}</td>
            <td><span class="badge b-gray" style="font-size:9px">${j.category}</span></td>
            <td><span class="${j.tax_rate===8?'tax8':j.tax_type==='不課税'||j.tax_type==='非課税'?'taxfree':'tax10'}" style="font-size:9px">${j.tax_type||'課税'}</span></td>
            <td style="font-family:var(--mono);color:${j.type==='income'?'var(--green)':'var(--red)'};font-size:11px">${j.type==='income'?'+':'-'}${j.amount.toLocaleString()}円</td>
            <td style="color:var(--text3);font-size:10px">未送信</td>
          </tr>`).join('')}</tbody></table>
        </div>` : `<div class="empty" style="padding:12px">未送信の仕訳はありません </div>`}

      ${sentCount > 0 ? `
        <div style="margin-top:12px;font-size:11px;font-weight:700;margin-bottom:6px;color:var(--green)">送信済み（${sentCount}件）</div>
        <div style="max-height:150px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm)">
          <table><thead><tr><th>日付</th><th>摘要</th><th>金額</th><th>freee Deal ID</th></tr></thead>
          <tbody>${journals.filter(j=>j.freee_deal_id).slice(0,10).map(j=>`<tr>
            <td style="font-family:var(--mono);font-size:10px">${j.date}</td>
            <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${j.description}</td>
            <td style="font-family:var(--mono);color:${j.type==='income'?'var(--green)':'var(--red)'}">
              ${j.type==='income'?'+':'-'}${j.amount.toLocaleString()}円</td>
            <td><span class="badge b-green" style="font-size:9px"> #${j.freee_deal_id}</span></td>
          </tr>`).join('')}</tbody></table>
        </div>` : ''}
    </div>

    <!-- OAuth設定 -->
    <div class="card">
      <div class="card-title"> freee API 接続設定</div>
      <div class="alert a-blue" style="font-size:11px">
        <strong>接続手順:</strong>
        ① <a href="https://developer.freee.co.jp/" target="_blank" style="color:var(--accent)">freee Developers</a> でアプリを作成
        → ② Client ID をコピー
        → ③ 「freee で認証」ボタンをクリック
        → ④ freeeのログイン画面で許可
      </div>
      <!-- コールバックURL表示 -->
      <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:10px;font-size:11px">
        <div style="color:var(--text3);margin-bottom:4px"> freee Developer Console に設定するコールバックURL</div>
        <div style="font-family:var(--mono);color:var(--green);font-size:12px;font-weight:700" id="freee-callback-url">${window.location.origin}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:4px" onclick="copyFreeeCallbackUrl()"> コピー</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Client ID</div>
          <input type="text" id="freee-client-id" placeholder="freee Developer ConsoleのClient ID"
            value="${cfg.client_id||''}"
            onchange="(() => { const a=accounts[currentAcct]; if(!a.freee_config)a.freee_config={}; a.freee_config.client_id=this.value; save(currentAcct); })()">
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">事業所ID（company_id）</div>
          <input type="text" id="freee-company-id" placeholder="freeeの事業所ID（数字）"
            value="${cfg.company_id||''}">
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="startFreeeOAuth()">
           freee で認証（OAuth）
        </button>
        <button class="btn btn-sm" onclick="document.getElementById('manual-token-section').style.display='block'">
           手動でトークン設定
        </button>
        ${cfg.connected ? `<button class="btn btn-success btn-sm" onclick="fetchFreeeCompany()"> 接続テスト</button>` : ''}
      </div>

      <!-- 手動トークン設定（開発者向け） -->
      <div id="manual-token-section" style="display:none;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-top:8px">
        <div style="font-size:11px;font-weight:700;margin-bottom:8px;color:var(--yellow)">! 手動設定（開発・テスト用）</div>
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">アクセストークン</div>
          <input type="password" id="freee-manual-token" placeholder="Bearer トークン（freee開発者ページで取得）" value="${cfg.access_token||''}">
        </div>
        <div style="margin-bottom:8px">
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px">事業所ID</div>
          <input type="text" id="freee-company-id-manual" placeholder="例: 3798257" value="${cfg.company_id||''}"
            oninput="document.getElementById('freee-company-id').value=this.value">
        </div>
        <button class="btn btn-sm btn-primary" onclick="(() => { document.getElementById('freee-company-id').value=document.getElementById('freee-company-id-manual').value; setManualToken(); })()">設定を保存して接続テスト</button>
      </div>
    </div>

    <!-- 勘定科目マッピング -->
    <div class="card">
      <div class="card-title"> 勘定科目マッピング
        <span style="font-size:10px;color:var(--text3)">忍者帳場 → freee</span>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px">
        freee接続後に「勘定科目マスタ再取得」をクリックすると自動でIDが紐付けられます。
      </div>
      <div style="max-height:280px;overflow-y:auto">
        <table><thead><tr><th>忍者帳場科目</th><th>freee科目名（デフォルト）</th><th>freee ID</th><th>消費税コード</th></tr></thead>
        <tbody>${Object.entries(FREEE_CAT_MAP).map(([ninja, info]) => {
          const map = cfg.account_item_map || {};
          const id = map[ninja];
          return `<tr>
            <td><span class="badge b-gray" style="font-size:9px">${ninja}</span></td>
            <td style="font-size:11px;color:var(--text2)">${info.default_name}</td>
            <td><span class="badge ${id?'b-green':'b-red'}" style="font-size:9px">${id||'未取得'}</span></td>
            <td style="font-family:var(--mono);font-size:10px;color:var(--text3)">${
              ninja==='仕入高'||ninja==='売上高の軽減'?'6（軽減8%）':
              ninja==='租税公課'||ninja==='利子割引料'||ninja==='損害保険料'?'0/1（不/非課税）':
              '3（標準10%）'
            }</td>
          </tr>`;
        }).join('')}</tbody></table>
      </div>
    </div>

    <!-- 同期ログ -->
    <div class="card">
      <div class="card-title"> 同期ログ
        <button class="btn btn-ghost btn-sm" onclick="const a=accounts[currentAcct];a.freee_sync_log=[];save(currentAcct);renderFreee()">クリア</button>
      </div>
      ${(a.freee_sync_log||[]).length ? `
        <div style="max-height:200px;overflow-y:auto;font-size:11px">
          ${(a.freee_sync_log||[]).map(l=>`
            <div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);align-items:flex-start">
              <span style="font-family:var(--mono);color:var(--text3);flex-shrink:0;font-size:10px">${l.date} ${l.time}</span>
              <span class="badge ${l.type==='success'?'b-green':l.type==='error'?'b-red':l.type==='warning'?'b-yellow':'b-blue'}" style="flex-shrink:0;font-size:9px">${l.type}</span>
              <span style="color:var(--text2)">${l.message}</span>
            </div>`).join('')}
        </div>` : '<div class="empty" style="padding:12px">ログなし</div>'}
    </div>

    <!-- 使い方ガイド -->
    <div class="card">
      <div class="card-title"> freee連携ガイド</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:11px">
        <div>
          <div style="font-weight:700;color:var(--text);margin-bottom:6px">日常の使い方</div>
          ${['レシート撮影 → 自動仕訳（忍者帳場）',
             '銀行明細 → 多層判定 → 確定仕訳',
             '「freeeに送信」で仕訳をfreeeへ転送',
             'freee上で確定申告書を作成・送信'
          ].map((s,i)=>`<div style="display:flex;gap:6px;margin-bottom:4px;color:var(--text2)">
            <span style="color:var(--accent);font-weight:700;flex-shrink:0">${i+1}.</span>${s}
          </div>`).join('')}
        </div>
        <div>
          <div style="font-weight:700;color:var(--text);margin-bottom:6px">freee側でやること</div>
          ${['銀行口座・クレカとの連携（freee側）',
             '送られた仕訳の確認（ほぼ不要）',
             '年1回の確定申告書作成',
             'e-Taxで電子申告'
          ].map((s,i)=>`<div style="display:flex;gap:6px;margin-bottom:4px;color:var(--text2)">
            <span style="color:var(--green);font-weight:700;flex-shrink:0">${i+1}.</span>${s}
          </div>`).join('')}
        </div>
      </div>
      <div class="alert a-purple" style="margin-top:10px;font-size:11px">
         <strong>役割分担:</strong> 日常の経理精度・工数削減 → 忍者帳場 / 確定申告書作成・e-Tax送信 → freeeスタンダード（月1,980円）
      </div>
    </div>
  `;
}


// ══════════════════════════════════════════════════════════════
// A. 確定申告チェックリスト（AI自動生成）
// ══════════════════════════════════════════════════════════════
async function renderChecklist() {
  const a = accounts[currentAcct];
  const pl = calcPL(a);
  const J = a.journals || [];
  const pend = getPendingCount(a);
  const year = a.year || 2026;

  // ローカルチェック（即時）
  const checks = [
    {
      id:'c1', label:'全仕訳が確定済み',
      ok: pend === 0,
      detail: pend > 0 ? `${pend}件が判断待ちです。要確認タブで処理してください。` : '全仕訳が確定済みです。',
      action: pend > 0 ? `<button class="btn btn-sm btn-danger" onclick="switchTab('review')">今すぐ確認</button>` : ''
    },
    {
      id:'c2', label:'売上の仕訳がある',
      ok: J.filter(j=>j.type==='income').length > 0,
      detail: J.filter(j=>j.type==='income').length > 0
        ? `${J.filter(j=>j.type==='income').length}件の収入仕訳があります。`
        : '売上の仕訳がありません。売上を入力してください。',
      action: ''
    },
    {
      id:'c3', label:'減価償却の処理',
      ok: (a.depreciation||[]).length > 0 || true,
      detail: (a.depreciation||[]).length > 0
        ? `${(a.depreciation||[]).length}件の減価償却資産が登録済みです。`
        : '10万円以上の資産がある場合は減価償却の登録が必要です。',
      action: ''
    },
    {
      id:'c4', label:'源泉徴収の確認',
      ok: true,
      detail: (a.invoices||[]).filter(i=>i.withholding>0).length > 0
        ? `源泉徴収${(a.invoices||[]).filter(i=>i.withholding>0).reduce((s,i)=>s+(i.withholding||0),0).toLocaleString()}円が控除対象です。確定申告書に記載してください。`
        : '源泉徴収の請求書はありません。',
      action: ''
    },
    {
      id:'c5', label:'軽減税率取引の区分',
      ok: J.filter(j=>j.tax_rate===8).length >= 0,
      detail: J.filter(j=>j.tax_rate===8).length > 0
        ? `軽減税率8%の取引が${J.filter(j=>j.tax_rate===8).length}件あります。消費税申告（課税事業者の場合）に反映してください。`
        : '軽減税率の取引はありません。',
      action: ''
    },
    {
      id:'c6', label:'不課税・非課税取引の確認',
      ok: true,
      detail: J.filter(j=>j.tax_type==='不課税'||j.tax_type==='非課税').length > 0
        ? `不課税・非課税取引が${J.filter(j=>j.tax_type==='不課税'||j.tax_type==='非課税').length}件（宿泊税・保険料等）。仕入税額控除の対象外です。`
        : '不課税・非課税取引はありません。',
      action: ''
    },
    {
      id:'c7', label:'青色申告特別控除（65万円）の要件',
      ok: true,
      detail: 'e-Taxで電子申告すれば65万円控除が適用されます。freeeスタンダードで確定申告書を作成→e-Tax送信で完了です。',
      action: ''
    },
    {
      id:'c8', label:'事業所得の計算',
      ok: pl.opProfit !== 0 || pl.income > 0,
      detail: `事業所得の概算: 売上${pl.income.toLocaleString()}円 − 経費${(pl.expense+pl.cogs).toLocaleString()}円 − 減価償却${pl.dep.toLocaleString()}円 = ${pl.opProfit.toLocaleString()}円`,
      action: ''
    }
  ];

  const okCount = checks.filter(c=>c.ok).length;
  const ngCount = checks.filter(c=>!c.ok).length;

  document.getElementById('main-content').innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi"><div class="kpi-label">チェック済み</div><div class="kpi-value" style="color:var(--green)">${okCount}/${checks.length}</div></div>
      <div class="kpi"><div class="kpi-label">要対応</div><div class="kpi-value" style="color:${ngCount>0?'var(--red)':'var(--green)'}">${ngCount}件</div></div>
      <div class="kpi"><div class="kpi-label">事業所得（概算）</div><div class="kpi-value" style="font-size:15px;color:${pl.opProfit>=0?'var(--green)':'var(--red)'}">${fmtM(pl.opProfit)}</div></div>
    </div>

    <div class="card">
      <div class="card-title"> ${year}年分 確定申告チェックリスト
        <button class="btn btn-primary btn-sm" onclick="runAIChecklist()">AIで詳細診断</button>
      </div>
      <div id="checklist-items">
        ${checks.map(c=>`
          <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="width:22px;height:22px;border-radius:50%;background:${c.ok?'var(--green-bg)':'var(--red-bg)'};border:1px solid ${c.ok?'var(--green)':'var(--red)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px">${c.ok?'':'!'}</div>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:600;color:${c.ok?'var(--text)':'var(--red)'};margin-bottom:3px">${c.label}</div>
              <div style="font-size:11px;color:var(--text2)">${c.detail}</div>
            </div>
            ${c.action}
          </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title"> 確定申告フロー（freee連携版）</div>
      ${[
        ['1','忍者帳場で年間仕訳を完成させる','今ここ','var(--accent)'],
        ['2','freee連携タブで仕訳を一括送信','次のステップ','var(--yellow)'],
        ['3','freeeスタンダードで青色申告決算書を確認','freee側','var(--text3)'],
        ['4','freeeからe-Taxで電子申告（65万円控除）','freee側','var(--text3)'],
      ].map(([n,label,status,color])=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="width:24px;height:24px;border-radius:50%;background:rgba(124,111,255,0.15);color:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">${n}</div>
          <div style="flex:1;font-size:12px">${label}</div>
          <span style="font-size:10px;color:${color}">${status}</span>
        </div>`).join('')}
    </div>

    <div id="ai-checklist-result" style="display:none" class="card">
      <div class="card-title">AI詳細診断結果</div>
      <div id="ai-checklist-content" class="ai-box"></div>
    </div>`;
}

async function runAIChecklist() {
  const a = accounts[currentAcct];
  const pl = calcPL(a);
  const box = document.getElementById('ai-checklist-result');
  const content = document.getElementById('ai-checklist-content');
  box.style.display = 'block';
  content.innerHTML = '確定申告を診断中<span class="dot-anim"></span>';

  const summary = {
    year: a.year, business: a.business,
    income: pl.income, cogs: pl.cogs, expense: pl.expense,
    dep: pl.dep, profit: pl.opProfit,
    tax8: pl.tax8, taxfree: pl.taxfree,
    journalCount: (a.journals||[]).length,
    pendingCount: getPendingCount(a),
    withholding: (a.invoices||[]).reduce((s,i)=>s+(i.withholding||0),0),
    bycat: pl.bycat
  };

  try {
    const res = await fetch("/api/claude", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model: MODEL, max_tokens: 800,
        messages:[{role:"user", content:`個人事業主の${a.year}年分確定申告の診断をしてください。
データ: ${JSON.stringify(summary)}
以下の観点で診断してください（各項目2〜3行で）:
1. 節税ポイント（見落としやすい控除）
2. 注意すべき税務リスク
3. 来年に向けた改善点
4. 今すぐやるべきアクション
情報提供として。税務判断は税理士に確認を。`}]})
    });
    const d = await res.json();
    content.innerHTML = d.content[0].text.replace(/\n/g,'<br>');
  } catch(e) {
    content.innerHTML = '診断できませんでした。';
  }
  appendFreeeHistory();
  renderFreeeMismatchWarning();
}

// ══════════════════════════════════════════════════════════════
// C. 取引先マスタ＋支払い管理＋支払調書CSV出力
// ══════════════════════════════════════════════════════════════
function renderPartners() {
  const a = accounts[currentAcct];
  const J = a.journals || [];

  // 仕訳から取引先を自動集計
  const partnerMap = {};
  J.filter(j=>j.type==='expense'&&j.status==='confirmed').forEach(j=>{
    // 摘要から取引先名を抽出（シンプルに説明文をキーにする）
    const name = j.description.replace(/（.*?）/g,'').trim();
    if (!partnerMap[name]) partnerMap[name] = { name, category:j.category, total:0, withholding:0, count:0, dates:[] };
    partnerMap[name].total += j.amount;
    partnerMap[name].count++;
    partnerMap[name].dates.push(j.date);
  });

  // 請求書の源泉徴収を取引先に紐付け
  (a.invoices||[]).forEach(inv=>{
    const k = inv.vendor;
    if (!partnerMap[k]) partnerMap[k] = { name:k, category:inv.category, total:0, withholding:0, count:0, dates:[] };
    partnerMap[k].total += inv.amount;
    partnerMap[k].withholding += inv.withholding||0;
    partnerMap[k].count++;
  });

  // カスタム取引先（手動追加）をマージ
  (a.partners_custom||[]).forEach(p=>{
    if (!partnerMap[p.name]) partnerMap[p.name] = {...p, total:0, withholding:0, count:0, dates:[]};
    partnerMap[p.name] = {...partnerMap[p.name], ...p, total:partnerMap[p.name].total, withholding:partnerMap[p.name].withholding};
  });

  const partners = Object.values(partnerMap).sort((a,b)=>b.total-a.total);
  const totalWithholding = partners.reduce((s,p)=>s+p.withholding,0);
  const withPartners = partners.filter(p=>p.withholding>0);

  document.getElementById('main-content').innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi"><div class="kpi-label">取引先数</div><div class="kpi-value">${partners.length}社</div></div>
      <div class="kpi"><div class="kpi-label">源泉徴収合計</div><div class="kpi-value" style="color:var(--yellow)">${totalWithholding.toLocaleString()}円</div><div class="kpi-sub">確定申告で控除</div></div>
      <div class="kpi"><div class="kpi-label">支払調書対象</div><div class="kpi-value" style="color:var(--accent)">${withPartners.length}社</div></div>
    </div>

    ${totalWithholding>0?`<div class="alert a-yellow"> 源泉徴収${totalWithholding.toLocaleString()}円は確定申告で全額控除できます。freeeの確定申告書に必ず記載してください。</div>`:''}

    <div class="card">
      <div class="card-title"> 取引先一覧
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" onclick="exportWithholdingCSV()"> 支払調書CSV出力</button>
          <button class="btn btn-primary btn-sm" onclick="showAddPartner()">＋ 取引先追加</button>
        </div>
      </div>
      ${partners.length ? `
        <table><thead><tr><th>取引先名</th><th>科目</th><th>年間支払額</th><th>源泉徴収額</th><th>差引支払</th><th>取引件数</th></tr></thead>
        <tbody>${partners.map(p=>`<tr>
          <td style="font-weight:600">${p.name}</td>
          <td><span class="badge b-gray" style="font-size:9px">${p.category||'—'}</span></td>
          <td style="font-family:var(--mono)">${p.total.toLocaleString()}円</td>
          <td style="font-family:var(--mono);color:${p.withholding>0?'var(--yellow)':'var(--text3)'}">
            ${p.withholding>0?'' +p.withholding.toLocaleString():'—'}</td>
          <td style="font-family:var(--mono)">${(p.total-p.withholding).toLocaleString()}円</td>
          <td style="color:var(--text3)">${p.count}件</td>
        </tr>`).join('')}</tbody></table>
      ` : '<div class="empty">仕訳データから取引先を自動集計します</div>'}
    </div>

    ${withPartners.length>0?`
    <div class="card">
      <div class="card-title"> 支払調書プレビュー（源泉徴収対象）</div>
      <div class="alert a-blue" style="font-size:11px">年間支払額が5万円超の外注先・士業への支払いは支払調書の提出が必要です。</div>
      <table><thead><tr><th>支払先</th><th>支払金額</th><th>源泉徴収税額</th><th>差引支払額</th></tr></thead>
      <tbody>${withPartners.map(p=>`<tr>
        <td style="font-weight:600">${p.name}</td>
        <td style="font-family:var(--mono)">${p.total.toLocaleString()}円</td>
        <td style="font-family:var(--mono);color:var(--yellow)">${p.withholding.toLocaleString()}円</td>
        <td style="font-family:var(--mono)">${(p.total-p.withholding).toLocaleString()}円</td>
      </tr>`).join('')}</tbody></table>
      <button class="btn btn-sm" style="margin-top:10px" onclick="exportWithholdingCSV()"> CSVダウンロード</button>
    </div>`:''}`;
}

function exportWithholdingCSV() {
  const a = accounts[currentAcct];
  const J = a.journals || [];
  const partnerMap = {};
  J.filter(j=>j.type==='expense').forEach(j=>{
    const name = j.description.replace(/（.*?）/g,'').trim();
    if (!partnerMap[name]) partnerMap[name]={name,category:j.category,total:0,withholding:0};
    partnerMap[name].total+=j.amount;
  });
  (a.invoices||[]).forEach(inv=>{
    if (!partnerMap[inv.vendor]) partnerMap[inv.vendor]={name:inv.vendor,category:inv.category,total:0,withholding:0};
    partnerMap[inv.vendor].total+=inv.amount;
    partnerMap[inv.vendor].withholding+=inv.withholding||0;
  });
  const rows = [['支払先','勘定科目','支払金額','源泉徴収税額','差引支払額']];
  Object.values(partnerMap).sort((a,b)=>b.total-a.total).forEach(p=>{
    rows.push([p.name, p.category||'', p.total, p.withholding, p.total-p.withholding]);
  });
  const csv = rows.map(r=>r.map(v=>'"'+v+'"').join(',')).join('\n');
  const blob = new Blob(['﻿'+csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a2 = document.createElement('a');
  a2.href=url; a2.download=`支払調書_${accounts[currentAcct].year}.csv`;
  a2.click(); URL.revokeObjectURL(url);
}

function showAddPartner() {
  const bg = document.createElement('div'); bg.className='modal-bg';
  bg.innerHTML=`<div class="modal"><div class="modal-title">取引先を追加</div>
    <div class="form-row"><span class="form-label">取引先名</span><input type="text" id="p-name" placeholder="山田デザイン事務所"></div>
    <div class="form-row"><span class="form-label">科目</span>
      <select id="p-cat">${['外注費','支払報酬料','地代家賃','その他'].map(c=>`<option>${c}</option>`).join('')}</select></div>
    <div class="form-row"><span class="form-label">メモ</span><input type="text" id="p-note" placeholder="フリーランスデザイナー・源泉対象"></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-primary btn-sm" onclick="addPartner(this)">追加</button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">キャンセル</button>
    </div>
  </div>`;
  document.getElementById('app').appendChild(bg);
}

function addPartner(btn) {
  const a = accounts[currentAcct];
  if (!a.partners_custom) a.partners_custom=[];
  a.partners_custom.push({
    name: document.getElementById('p-name').value,
    category: document.getElementById('p-cat').value,
    note: document.getElementById('p-note').value
  });
  save(currentAcct); btn.closest('.modal-bg').remove(); renderPartners();
}

// ══════════════════════════════════════════════════════════════
// D. 経費予算アラート
// ══════════════════════════════════════════════════════════════
function renderBudget() {
  const a = accounts[currentAcct];
  const J = a.journals || [];
  const budgets = a.budgets || {};
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  // 今月の科目別実績
  const thisMonthActual = J.filter(j=>j.type==='expense'&&j.date.startsWith(thisMonth))
    .reduce((acc,j)=>{acc[j.category]=(acc[j.category]||0)+j.amount;return acc},{});

  // 年間科目別実績
  const yearActual = J.filter(j=>j.type==='expense'&&j.status==='confirmed')
    .reduce((acc,j)=>{acc[j.category]=(acc[j.category]||0)+j.amount;return acc},{});

  const cats = [...new Set([...Object.keys(budgets), ...Object.keys(yearActual)])].filter(c=>c!=='売上高');
  const alerts = cats.filter(c=>{
    const b = budgets[c]||0; const act = thisMonthActual[c]||0;
    return b>0 && act >= b*0.8;
  });

  document.getElementById('main-content').innerHTML = `
    ${alerts.length>0?`<div class="alert a-red">! 予算80%超え: ${alerts.map(c=>`<strong>${c}</strong>`).join('、')} — 今月の支出を確認してください</div>`:'<div class="alert a-green"> 全科目が予算範囲内です</div>'}

    <div class="card">
      <div class="card-title"> 月次予算 vs 実績
        <span style="font-size:10px;color:var(--text3)">${now.getMonth()+1}月</span>
      </div>
      <div style="margin-bottom:12px">
        ${cats.map(cat=>{
          const budget = budgets[cat]||0;
          const actual = thisMonthActual[cat]||0;
          const pct = budget>0?Math.min(100,Math.round(actual/budget*100)):0;
          const over = budget>0&&actual>budget;
          const warn = budget>0&&actual>=budget*0.8&&!over;
          const barColor = over?'var(--red)':warn?'var(--yellow)':'var(--green)';
          return`<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
              <span style="color:var(--text2)">${cat}</span>
              <span style="font-family:var(--mono)">
                <span style="color:${over?'var(--red)':warn?'var(--yellow)':'var(--text)'};font-weight:${over||warn?700:400}">
                  ${actual.toLocaleString()}円</span>
                ${budget>0?`<span style="color:var(--text3)"> / ${budget.toLocaleString()}円</span>`:'<span style="color:var(--text3)"> 予算未設定</span>'}
                ${over?'<span class="badge b-red" style="margin-left:4px;font-size:9px">超過</span>':warn?'<span class="badge b-yellow" style="margin-left:4px;font-size:9px">注意</span>':''}
              </span>
            </div>
            <div style="background:var(--bg4);border-radius:99px;height:6px;overflow:hidden">
              <div style="height:100%;border-radius:99px;background:${barColor};width:${budget>0?pct:0}%;transition:width 0.8s ease"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title"> 月次予算を設定</div>
      <div class="alert a-blue" style="font-size:11px">0円の科目は予算未設定（アラートなし）として扱います</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        ${['旅費交通費','通信費','消耗品費','会議費','接待交際費','広告宣伝費','研究開発費','水道光熱費','外注費','地代家賃'].map(cat=>`
          <div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:3px">${cat}</div>
            <input type="number" id="budget-${cat}" value="${budgets[cat]||0}" placeholder="0"
              style="font-family:var(--mono)"
              onchange="saveBudget('${cat}',this.value)">
          </div>`).join('')}
      </div>
      <button class="btn btn-primary btn-sm" onclick="saveAllBudgets()"> 予算を保存</button>
    </div>

    <div class="card">
      <div class="card-title"> 年間実績（科目別）</div>
      <table><thead><tr><th>科目</th><th>年間実績</th><th>月平均</th><th>推奨月次予算</th></tr></thead>
      <tbody>${Object.entries(yearActual).sort(([,a],[,b])=>b-a).map(([cat,total])=>`<tr>
        <td><span class="badge b-gray" style="font-size:9px">${cat}</span></td>
        <td style="font-family:var(--mono)">${total.toLocaleString()}円</td>
        <td style="font-family:var(--mono);color:var(--text3)">${Math.round(total/12).toLocaleString()}円</td>
        <td><button class="btn btn-ghost btn-sm" onclick="setRecommendedBudget('${cat}',${Math.round(total/12*1.1)})">
          ${Math.round(total/12*1.1).toLocaleString()}円に設定</button></td>
      </tr>`).join('')}</tbody></table>
    </div>`;
}

function saveBudget(cat, val) {
  const a = accounts[currentAcct];
  if (!a.budgets) a.budgets = {};
  a.budgets[cat] = parseInt(val)||0;
  save(currentAcct);
}

function saveAllBudgets() {
  const a = accounts[currentAcct];
  if (!a.budgets) a.budgets = {};
  ['旅費交通費','通信費','消耗品費','会議費','接待交際費','広告宣伝費','研究開発費','水道光熱費','外注費','地代家賃'].forEach(cat=>{
    const el = document.getElementById('budget-'+cat);
    if (el) a.budgets[cat] = parseInt(el.value)||0;
  });
  save(currentAcct);
  renderBudget();
}

function setRecommendedBudget(cat, val) {
  const a = accounts[currentAcct];
  if (!a.budgets) a.budgets = {};
  a.budgets[cat] = val;
  save(currentAcct);
  renderBudget();
}

// ダッシュボードに予算アラートを表示するヘルパー
function getBudgetAlerts(a) {
  const J = a.journals || [];
  const budgets = a.budgets || {};
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const actual = J.filter(j=>j.type==='expense'&&j.date.startsWith(thisMonth))
    .reduce((acc,j)=>{acc[j.category]=(acc[j.category]||0)+j.amount;return acc},{});
  return Object.entries(budgets)
    .filter(([cat,b])=>b>0&&(actual[cat]||0)>=b*0.8)
    .map(([cat,b])=>({cat, actual:actual[cat]||0, budget:b, over:(actual[cat]||0)>b}));
}

// ══════════════════════════════════════════════════════════════
// B. LINE通知設定＋月次レポート送信
// ══════════════════════════════════════════════════════════════
function renderNotify() {
  const a = accounts[currentAcct];
  const el = document.getElementById('main-content');
  if (!el) return;

  const settings = (a && a.notify_settings) || {
    line_token: '',
    email: '',
    push_enabled: false,
    alerts: {
      needs_review: true,
      duplicate: true,
      cashflow_danger: true,
      monthly_summary: true,
      tax_deadline: true,
    },
    thresholds: {
      cashflow_min: 500000,
      review_max: 10,
    }
  };

  let html = '';

  // プッシュ通知（PWA）
  html += '<div class="card" style="margin-bottom:12px">'
    + '<div class="card-title">プッシュ通知（このデバイス）</div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0">'
    + '<div><div style="font-size:13px;font-weight:600">ブラウザ通知</div>'
    + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">アプリを閉じていても通知を受け取る</div></div>'
    + '<button id="push-toggle-btn" style="padding:6px 16px;background:' + (settings.push_enabled ? 'var(--green)' : 'var(--bg3)') + ';color:' + (settings.push_enabled ? '#fff' : 'var(--text2)') + ';border:1px solid var(--border);border-radius:99px;font-family:var(--sans);font-size:11px;cursor:pointer">'
    + (settings.push_enabled ? 'ON' : 'OFF') + '</button>'
    + '</div></div>';

  // LINE通知
  html += '<div class="card" style="margin-bottom:12px">'
    + '<div class="card-title">LINE通知</div>'
    + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-bottom:10px;line-height:1.6">'
    + 'LINE Notifyのトークンを設定すると、アラートをLINEで受け取れます。<br>'
    + '<a href="https://notify-bot.line.me/my/" target="_blank" style="color:var(--blue)">トークンを取得する →</a>'
    + '</div>'
    + '<div class="form-row"><label class="form-label">LINE Notifyトークン</label>'
    + '<input id="line-token-input" class="form-inp" type="password" placeholder="トークンを入力" value="' + (settings.line_token||'') + '"></div>'
    + '<button id="line-save-btn" style="width:100%;padding:10px;background:' + (settings.line_token ? 'var(--green)' : 'var(--text)') + ';color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer">'
    + (settings.line_token ? 'LINE通知 設定済み · 更新する' : 'LINE通知を設定する') + '</button>'
    + (settings.line_token ? '<button id="line-test-btn" style="width:100%;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:11px;cursor:pointer;margin-top:6px">テスト送信</button>' : '')
    + '</div>';

  // メール通知
  html += '<div class="card" style="margin-bottom:12px">'
    + '<div class="card-title">メール通知</div>'
    + '<div class="form-row"><label class="form-label">送信先メールアドレス</label>'
    + '<input id="email-input" class="form-inp" type="email" placeholder="example@gmail.com" value="' + (settings.email||'') + '"></div>'
    + '<button id="email-save-btn" style="width:100%;padding:10px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer">メール通知を設定する</button>'
    + '</div>';

  // アラート設定
  const alertItems = [
    { key: 'needs_review', label: '要確認仕訳あり', desc: '未確認の仕訳が溜まった時' },
    { key: 'duplicate', label: '重複レシート検出', desc: '同一の仕訳が重複した時' },
    { key: 'cashflow_danger', label: '資金繰り危険アラート', desc: '残高が設定額を下回る予測時' },
    { key: 'monthly_summary', label: '月次サマリー', desc: '毎月1日に先月の収支を通知' },
    { key: 'tax_deadline', label: '税務期限アラート', desc: '消費税・確定申告の期限前' },
  ];

  html += '<div class="card" style="margin-bottom:12px">'
    + '<div class="card-title">アラート設定</div>';

  alertItems.forEach(function(item) {
    const isOn = settings.alerts[item.key] !== false;
    html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">'
      + '<div style="flex:1"><div style="font-size:12px;font-weight:600">' + item.label + '</div>'
      + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">' + item.desc + '</div></div>'
      + '<button data-key="' + item.key + '" class="alert-toggle-btn" style="padding:5px 14px;background:' + (isOn ? 'var(--green)' : 'var(--bg3)') + ';color:' + (isOn ? '#fff' : 'var(--text3)') + ';border:1px solid var(--border);border-radius:99px;font-family:var(--sans);font-size:10px;cursor:pointer;min-width:44px">'
      + (isOn ? 'ON' : 'OFF') + '</button>'
      + '</div>';
  });
  html += '</div>';

  // 閾値設定
  html += '<div class="card">'
    + '<div class="card-title">閾値設定</div>'
    + '<div class="form-row"><label class="form-label">資金繰り警告残高（円以下で通知）</label>'
    + '<input id="cashflow-threshold" class="form-inp" type="number" value="' + (settings.thresholds.cashflow_min||500000) + '" style="text-align:right"></div>'
    + '<div class="form-row"><label class="form-label">要確認件数（件以上で通知）</label>'
    + '<input id="review-threshold" class="form-inp" type="number" value="' + (settings.thresholds.review_max||10) + '" style="text-align:right"></div>'
    + '<button id="threshold-save-btn" style="width:100%;padding:10px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer">閾値を保存</button>'
    + '</div>';

  el.innerHTML = html;

  // イベント設定
  function saveNotifySettings() {
    if (!a.notify_settings) a.notify_settings = {};
    Object.assign(a.notify_settings, settings);
    save(currentAcct);
  }

  // プッシュ通知トグル
  const pushBtn = document.getElementById('push-toggle-btn');
  if (pushBtn) pushBtn.onclick = function() {
    if (!settings.push_enabled) {
      if ('Notification' in window) {
        Notification.requestPermission().then(function(perm) {
          if (perm === 'granted') {
            settings.push_enabled = true;
            saveNotifySettings();
            renderNotify();
            showToast('プッシュ通知を有効にしました');
          } else {
            showToast('通知の許可が必要です。ブラウザの設定を確認してください');
          }
        });
      } else {
        showToast('このブラウザはプッシュ通知に対応していません');
      }
    } else {
      settings.push_enabled = false;
      saveNotifySettings();
      renderNotify();
      showToast('プッシュ通知を無効にしました');
    }
  };

  // LINE保存
  const lineSaveBtn = document.getElementById('line-save-btn');
  if (lineSaveBtn) lineSaveBtn.onclick = function() {
    settings.line_token = document.getElementById('line-token-input').value.trim();
    saveNotifySettings();
    renderNotify();
    showToast(settings.line_token ? 'LINE通知を設定しました' : 'LINE通知を解除しました');
  };

  // LINEテスト送信
  const lineTestBtn = document.getElementById('line-test-btn');
  if (lineTestBtn) lineTestBtn.onclick = function() {
    sendLineNotification('忍者帳場 テスト通知です。正常に受信できています。');
  };

  // メール保存
  const emailSaveBtn = document.getElementById('email-save-btn');
  if (emailSaveBtn) emailSaveBtn.onclick = function() {
    settings.email = document.getElementById('email-input').value.trim();
    saveNotifySettings();
    showToast(settings.email ? settings.email + ' に通知します' : 'メール通知を解除しました');
  };

  // アラートトグル
  el.querySelectorAll('.alert-toggle-btn').forEach(function(btn) {
    btn.onclick = function() {
      const key = btn.dataset.key;
      settings.alerts[key] = !settings.alerts[key];
      saveNotifySettings();
      renderNotify();
    };
  });

  // 閾値保存
  const thresholdBtn = document.getElementById('threshold-save-btn');
  if (thresholdBtn) thresholdBtn.onclick = function() {
    settings.thresholds.cashflow_min = parseInt(document.getElementById('cashflow-threshold').value) || 500000;
    settings.thresholds.review_max = parseInt(document.getElementById('review-threshold').value) || 10;
    saveNotifySettings();
    showToast('閾値を保存しました');
  };
}

// LINE通知送信
async function sendLineNotification(message) {
  const a = accounts[currentAcct];
  const token = a && a.notify_settings && a.notify_settings.line_token;
  if (!token) { showToast('LINE通知が設定されていません'); return; }
  try {
    showLoading('LINE通知を送信中...');
    const resp = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'message=' + encodeURIComponent(message),
    });
    if (resp.ok) showToast('LINE通知を送信しました');
    else showToast('送信失敗: トークンを確認してください');
  } catch(e) {
    showToast('送信エラー: ' + e.message);
  } finally {
    hideLoading();
  }
}

// プッシュ通知送信
function sendPushNotification(title, body) {
  const a = accounts[currentAcct];
  if (!a || !a.notify_settings || !a.notify_settings.push_enabled) return;
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: body, icon: '/logo.png' });
  }
}

function buildMonthlyReportText(a, pl) {
  const now = new Date();
  const month = now.getMonth()+1;
  const pend = getPendingCount(a);
  const unpaid = (a.invoices||[]).filter(i=>i.status==='unpaid');
  const budgetAlerts = getBudgetAlerts(a);
  return `忍者帳場 月次レポート
━━━━━━━━━━━━━━━━
${a.name}（${a.business}）
${now.getFullYear()}年${month}月 集計

 売上高:    ${pl.income.toLocaleString()}円
 売上原価:  ${pl.cogs.toLocaleString()}円
 粗利益:    ${pl.grossProfit.toLocaleString()}円（${pl.grossMargin}%）
 営業利益:  ${pl.opProfit.toLocaleString()}円（${pl.opMargin}%）

${unpaid.length>0?`! 未払請求書: ${unpaid.length}件（${unpaid.reduce((s,i)=>s+i.amount,0).toLocaleString()}円）`:' 未払請求書: なし'}
${pend>0?`! 判断待ち仕訳: ${pend}件`:' 判断待ち: なし'}
${budgetAlerts.length>0?`! 予算超過: ${budgetAlerts.map(al=>al.cat).join('・')}`:' 予算: 全科目OK'}
━━━━━━━━━━━━━━━━`;
}

function saveLINEToken(token) {
  const a = accounts[currentAcct];
  a.line_token = token;
  save(currentAcct);
}

async function testLINENotify() {
  const a = accounts[currentAcct];
  const token = document.getElementById('line-token').value || a.line_token;
  if (!token) { alert('LINEトークンを入力してください'); return; }
  a.line_token = token; save(currentAcct);
  const result = document.getElementById('line-result');
  result.innerHTML = '<div class="loading-inline">送信中<span class="dot-anim"></span></div>';
  try {
    // LINE Notify APIはCORSを許可していないため、実際の送信はVercel Edge Function経由が必要
    // ここではデモ表示のみ
    await new Promise(r=>setTimeout(r,1000));
    result.innerHTML = `<div class="alert a-green">
       テスト送信の準備ができました。<br>
      <span style="font-size:11px">本番ではVercel Edge Function経由でLINEに送信します。<br>
      「Vercel Edge FunctionでLINE Notify送信APIを実装して」とチャットに指示してください。</span>
    </div>`;
  } catch(e) {
    result.innerHTML = `<div class="alert a-red">送信失敗: ${e.message}</div>`;
  }
}

async function sendMonthlyReport() {
  const a = accounts[currentAcct];
  const pl = calcPL(a);
  const text = buildMonthlyReportText(a, pl);
  const result = document.getElementById('line-result');
  result.innerHTML = `<div class="alert a-blue">
     送信予定のメッセージ:<br>
    <pre style="font-size:10px;margin-top:6px;white-space:pre-wrap;color:var(--text2)">${text}</pre>
    <span style="font-size:11px">Vercel Edge Functionを実装するとLINEに自動送信されます。</span>
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// E. レシートショートカット（PWA専用カメラ起動画面）
// ══════════════════════════════════════════════════════════════
// URLパラメータ ?tab=receipt でレシートタブに直接遷移
// manifest.jsonのshortcutsと連動
function checkPWAShortcut() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab && currentAcct) {
    switchTab(tab);
  }
}

// ダッシュボードの予算アラートをインライン表示するパッチ

// ══════════════════════════════════════════════════════════════
//  不動産所得モジュール
// 物件マスタ / 入居者管理 / 家賃自動仕訳 / 不動産専用科目
// ══════════════════════════════════════════════════════════════

// 建物構造ラベル
const STRUCTURE_LABEL = {rc:'RC（鉄筋コンクリート）',src:'SRC（鉄骨鉄筋）',steel:'鉄骨',light_steel:'軽量鉄骨',wood:'木造'};
const STRUCTURE_LIFE  = {rc:47,src:65,steel:34,light_steel:19,wood:22};
const PROPERTY_TYPE_LABEL = {apartment:'アパート',mansion:'マンション',house:'戸建て',parking:'駐車場',office:'事務所・店舗',land:'土地'};

// 不動産専用勘定科目（[不]プレフィックス = 不動産専用）
const RE_INCOME_CATS  = ['[不]賃料収入','[不]共益費収入','[不]礼金収入','[不]更新料収入','[不]駐車場収入','[不]その他収入'];
const RE_EXPENSE_CATS = ['[不]管理委託費','[不]修繕費','[不]租税公課','[不]損害保険料','[不]借入金利息','[不]減価償却費','[不]広告費（入居募集）','[不]通信費','[不]旅費交通費','[不]雑費'];

// ── 減価償却計算（定額法）──
function calcDepreciation(prop) {
  if (!prop.building_cost || !prop.acquisition_date || !prop.structure) return 0;
  const life = STRUCTURE_LIFE[prop.structure] || 22;
  const builtYear = prop.built ? parseInt(prop.built.slice(0,4)) : null;
  const acqYear   = parseInt(prop.acquisition_date.slice(0,4));
  let usefulLife = life;
  if (builtYear) {
    const age = acqYear - builtYear;
    // 中古耐用年数 = (法定耐用年数 - 経過年数) + 経過年数×20%
    usefulLife = age >= life
      ? Math.max(2, Math.floor(life * 0.2))
      : Math.floor((life - age) + age * 0.2);
  }
  const rate = 1 / usefulLife;
  return Math.floor(prop.building_cost * rate);
}

// ── 月次家賃収入の自動仕訳生成 ──
function autoGenerateRentJournals(a) {
  const tenants = (a.tenants||[]).filter(t=>t.status==='active');
  if (!tenants.length) return [];
  const today = new Date();
  const ym = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const newJournals = [];
  tenants.forEach(t => {
    // 同じ月の賃料が既に登録済みならスキップ
    const alreadyExists = (a.journals||[]).some(j =>
      j.income_type==='realestate' && j.date.startsWith(ym) &&
      j.description.includes(t.room) && j.category==='[不]賃料収入'
    );
    if (alreadyExists) return;
    const prop = (a.properties||[]).find(p=>p.id===t.property_id);
    const propName = prop?.name || '物件';
    // 賃料
    if (t.rent > 0) {
      newJournals.push({
        id: Date.now()+Math.random(), date: ym+'-25',
        description: `[不]賃料収入 ${propName} ${t.room}号室 ${t.name}`,
        amount: t.rent, type:'income', category:'[不]賃料収入',
        tax_type:'非課税', status:'confirmed', income_type:'realestate', tenant_id:t.id
      });
    }
    // 共益費
    if (t.common_fee > 0) {
      newJournals.push({
        id: Date.now()+Math.random(), date: ym+'-25',
        description: `[不]共益費収入 ${propName} ${t.room}号室 ${t.name}`,
        amount: t.common_fee, type:'income', category:'[不]共益費収入',
        tax_type:'非課税', status:'confirmed', income_type:'realestate', tenant_id:t.id
      });
    }
    // 駐車場
    if (t.parking > 0) {
      newJournals.push({
        id: Date.now()+Math.random(), date: ym+'-25',
        description: `[不]駐車場収入 ${propName} ${t.room}号室 ${t.name}`,
        amount: t.parking, type:'income', category:'[不]駐車場収入',
        tax_type:'非課税', status:'confirmed', income_type:'realestate', tenant_id:t.id
      });
    }
  });
  return newJournals;
}

// ── 不動産収支サマリー ──
function calcRE(a) {
  const J = (a.journals||[]).filter(j=>j.income_type==='realestate');
  const income  = J.filter(j=>j.type==='income').reduce((s,j)=>s+j.amount,0);
  const expense = J.filter(j=>j.type==='expense').reduce((s,j)=>s+j.amount,0);
  const bycat   = J.reduce((acc,j)=>{ acc[j.category]=(acc[j.category]||0)+(j.type==='income'?j.amount:-j.amount); return acc; },{});
  const tenants = (a.tenants||[]);
  const active  = tenants.filter(t=>t.status==='active').length;
  const total   = tenants.length;
  const monthlyRent = tenants.filter(t=>t.status==='active').reduce((s,t)=>s+t.rent+t.common_fee+t.parking,0);
  return {income, expense, profit:income-expense, bycat, occupancyRate:total?Math.round(active/total*100):0, monthlyRent, active, total};
}

// ══════ メインタブ ══════
function renderRealEstate() {
  const a = accounts[currentAcct];
  const re = calcRE(a);
  const properties = a.properties || [];
  const tenants = a.tenants || [];

  document.getElementById('main-content').innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi"><div class="kpi-label">不動産収入（累計）</div><div class="kpi-value" style="color:var(--green)">${fmtM(re.income)}</div><div class="kpi-sub">今年度</div></div>
      <div class="kpi"><div class="kpi-label">不動産経費（累計）</div><div class="kpi-value" style="color:var(--red)">${fmtM(re.expense)}</div></div>
      <div class="kpi"><div class="kpi-label">不動産所得</div><div class="kpi-value" style="color:${re.profit>=0?'var(--green)':'var(--red)'}">${fmtM(re.profit)}</div></div>
      <div class="kpi"><div class="kpi-label">入居率</div><div class="kpi-value" style="color:${re.occupancyRate>=80?'var(--green)':re.occupancyRate>=60?'var(--yellow)':'var(--red)'}">${re.occupancyRate}%</div><div class="kpi-sub">${re.active}/${re.total}室 入居中</div></div>
    </div>

    ${re.monthlyRent>0?`<div class="alert a-blue"> 今月の家賃収入予定: <strong>${re.monthlyRent.toLocaleString()}円</strong>（入居中${re.active}室合計）
      <button class="btn btn-sm btn-primary" style="margin-left:10px" onclick="runAutoRentJournal()">⚡ 今月分を自動仕訳</button>
    </div>`:''}

    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn btn-primary btn-sm" onclick="showAddProperty()">＋ 物件を追加</button>
      <button class="btn btn-sm" onclick="showREJournalForm()"> 経費を手入力</button>
      <button class="btn btn-sm" onclick="renderRETenants()"> 入居者一覧</button>
      <button class="btn btn-sm" onclick="renderREReport()"> 収支レポート</button>
      <button class="btn btn-sm" onclick="showMgmtReportUpload()"> 管理会社レポート読込</button>
      <button class="btn btn-sm" onclick="renderRELoan()"> ローン管理</button>
      <button class="btn btn-sm" onclick="renderREPropertyPL()"> 物件別損益</button>
    </div>

    <!-- 物件一覧 -->
    ${properties.length ? properties.map(prop => renderPropertyCard(prop, a)).join('') :
      `<div class="card"><div class="empty">物件がありません<br><button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="showAddProperty()">最初の物件を追加する</button></div></div>`}

    <!-- 最近の不動産仕訳 -->
    <div class="card">
      <div class="card-title"> 不動産仕訳（直近10件）
        <button class="btn btn-ghost btn-sm" onclick="renderRETenants()">全件表示</button>
      </div>
      ${(a.journals||[]).filter(j=>j.income_type==='realestate').slice(-10).reverse().length ?
        `<table><thead><tr><th>日付</th><th>摘要</th><th>科目</th><th>税区分</th><th>金額</th></tr></thead>
        <tbody>${(a.journals||[]).filter(j=>j.income_type==='realestate').slice(-10).reverse().map(j=>`<tr>
          <td style="font-family:var(--mono);font-size:10px">${j.date}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px">${j.description}</td>
          <td><span class="badge b-gray" style="font-size:9px">${j.category}</span></td>
          <td><span class="${j.tax_type==='非課税'||j.tax_type==='不課税'?'taxfree':'tax10'}" style="font-size:9px">${j.tax_type}</span></td>
          <td style="font-family:var(--mono);color:${j.type==='income'?'var(--green)':'var(--red)'};font-weight:700">
            ${j.type==='income'?'+':'-'}${j.amount.toLocaleString()}円</td>
        </tr>`).join('')}</tbody></table>` :
        '<div class="empty" style="padding:12px">不動産仕訳なし — 「今月分を自動仕訳」から開始</div>'}
    </div>
  `;
}

function renderPropertyCard(prop, a) {
  const tenants = (a.tenants||[]).filter(t=>t.property_id===prop.id);
  const active  = tenants.filter(t=>t.status==='active');
  const vacant  = tenants.filter(t=>t.status==='vacant');
  const occ     = tenants.length ? Math.round(active.length/tenants.length*100) : 0;
  const monthlyRent = active.reduce((s,t)=>s+t.rent+t.common_fee+t.parking,0);
  const dep     = calcDepreciation(prop);

  return `<div class="card" style="border-color:${occ>=80?'var(--border)':occ>=60?'rgba(255,204,68,0.3)':'rgba(255,95,126,0.3)'}">
    <div class="card-title">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:16px"></span>
        <div>
          <div style="font-size:14px;font-weight:900">${prop.name}</div>
          <div style="font-size:10px;color:var(--text3)">${PROPERTY_TYPE_LABEL[prop.type]||prop.type} / ${prop.address}</div>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-ghost" onclick="showEditProperty('${prop.id}')">編集</button>
        <button class="btn btn-sm" onclick="showPropertyTenants('${prop.id}')">部屋管理</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">
      <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--text3)">入居率</div>
        <div style="font-size:18px;font-weight:700;color:${occ>=80?'var(--green)':occ>=60?'var(--yellow)':'var(--red)'}">${occ}%</div>
        <div style="font-size:10px;color:var(--text3)">${active.length}/${tenants.length}室</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--text3)">月次家賃収入</div>
        <div style="font-size:14px;font-weight:700;color:var(--green)">${fmtK(monthlyRent)}</div>
        <div style="font-size:10px;color:var(--text3)">共益費・駐車場込</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--text3)">年間減価償却（予定）</div>
        <div style="font-size:14px;font-weight:700;color:var(--text2)">${fmtK(dep)}</div>
        <div style="font-size:10px;color:var(--text3)">${STRUCTURE_LABEL[prop.structure]?.slice(0,4)||''}・定額法</div>
      </div>
      <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:8px;text-align:center">
        <div style="font-size:10px;color:var(--text3)">ローン残高</div>
        <div style="font-size:14px;font-weight:700;color:var(--yellow)">${fmtM(prop.loan_balance||0)}</div>
        <div style="font-size:10px;color:var(--text3)">金利${prop.loan_rate||0}%</div>
      </div>
    </div>

    <!-- 部屋状況 -->
    <div style="display:flex;flex-wrap:wrap;gap:4px">
      ${tenants.map(t=>`
        <div style="padding:4px 8px;border-radius:var(--radius-sm);background:${t.status==='active'?'var(--green-bg)':'var(--red-bg)'};border:1px solid ${t.status==='active'?'rgba(46,204,140,0.3)':'rgba(255,95,126,0.3)'};font-size:10px;cursor:pointer" onclick="showTenantDetail('${t.id}')">
          <span style="font-weight:700">${t.room}</span>
          <span style="color:${t.status==='active'?'var(--green)':'var(--red)'}"> ${t.status==='active'?t.name||'（氏名未入力）':'空室'}</span>
          ${t.status==='active'?`<span style="color:var(--text3)"> ${(t.rent+t.common_fee+t.parking).toLocaleString()}円</span>`:''}
        </div>`).join('')}
      <button class="btn btn-ghost btn-sm" style="font-size:10px" onclick="showAddTenant('${prop.id}')">＋ 部屋追加</button>
    </div>

    ${vacant.length>0?`<div class="alert a-red" style="margin-top:8px;font-size:11px">! 空室が${vacant.length}室あります（${vacant.map(t=>t.room+'号室').join('・')}）</div>`:''}
  </div>`;
}

// ── 自動家賃仕訳 ──
function runAutoRentJournal() {
  const a = accounts[currentAcct];
  const newJ = autoGenerateRentJournals(a);
  if (!newJ.length) { alert('今月分の家賃仕訳は既に登録済みです。'); return; }
  if (!a.journals) a.journals = [];
  a.journals.push(...newJ);
  save(currentAcct); updateKPI(); renderSidebar();
  const inc = newJ.filter(j=>j.type==='income').reduce((s,j)=>s+j.amount,0);
  alert(` ${newJ.length}件の家賃仕訳を自動登録しました（合計 ${inc.toLocaleString()}円）`);
  renderRealEstate();
}

// ── 入居者一覧 ──
function renderRETenants() {
  const a = accounts[currentAcct];
  const tenants = a.tenants || [];
  const properties = a.properties || [];
  document.getElementById('main-content').innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn btn-ghost btn-sm" onclick="renderRealEstate()">← 戻る</button>
      <button class="btn btn-primary btn-sm" onclick="showAddTenant()">＋ 入居者追加</button>
    </div>
    <div class="card">
      <div class="card-title"> 入居者一覧（${tenants.length}室）</div>
      <table><thead><tr><th>物件</th><th>部屋</th><th>入居者</th><th>賃料＋共益費</th><th>駐車場</th><th>契約期間</th><th>状態</th><th></th></tr></thead>
      <tbody>${tenants.map(t=>{
        const prop = properties.find(p=>p.id===t.property_id);
        return`<tr>
          <td style="font-size:11px">${prop?.name||'—'}</td>
          <td style="font-weight:700">${t.room}</td>
          <td>${t.name||'<span style="color:var(--text3)">（空室）</span>'}</td>
          <td style="font-family:var(--mono)">${(t.rent+t.common_fee).toLocaleString()}円</td>
          <td style="font-family:var(--mono);color:var(--text3)">${t.parking>0?'' +t.parking.toLocaleString():'—'}</td>
          <td style="font-size:10px;color:var(--text3)">${t.contract_start||'—'} 〜 ${t.contract_end||'—'}</td>
          <td><span class="badge ${t.status==='active'?'b-green':'b-red'}">${t.status==='active'?'入居中':'空室'}</span></td>
          <td><button class="btn btn-sm btn-ghost" onclick="showTenantDetail('${t.id}')">詳細</button></td>
        </tr>`;
      }).join('')}</tbody></table>
    </div>`;
}

// ── 収支レポート ──
function renderREReport() {
  const a = accounts[currentAcct];
  const re = calcRE(a);
  const properties = a.properties || [];
  document.getElementById('main-content').innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn btn-ghost btn-sm" onclick="renderRealEstate()">← 戻る</button>
    </div>
    <div class="card">
      <div class="card-title"> 不動産所得 収支内訳（${a.year}年）</div>
      <div style="max-width:480px">
        <div class="pl-line bold"><span style="color:var(--green)">収入合計</span><span style="font-family:var(--mono);color:var(--green)">${re.income.toLocaleString()}円</span></div>
        ${Object.entries(re.bycat).filter(([k,v])=>v>0).map(([k,v])=>`
          <div class="pl-line"><span style="color:var(--text2);padding-left:12px">${k}</span><span style="font-family:var(--mono);color:var(--green)">${v.toLocaleString()}円</span></div>`).join('')}
        <div class="pl-line bold"><span style="color:var(--red)">経費合計</span><span style="font-family:var(--mono);color:var(--red)">${re.expense.toLocaleString()}円</span></div>
        ${Object.entries(re.bycat).filter(([k,v])=>v<0).map(([k,v])=>`
          <div class="pl-line"><span style="color:var(--text2);padding-left:12px">${k}</span><span style="font-family:var(--mono);color:var(--red)">${Math.abs(v).toLocaleString()}円</span></div>`).join('')}
        <div class="pl-line bold sep" style="margin-top:8px">
          <span>不動産所得</span>
          <span style="font-family:var(--mono);color:${re.profit>=0?'var(--green)':'var(--red)'}">${re.profit.toLocaleString()}円</span>
        </div>
      </div>
      ${properties.map(prop=>{
        const dep = calcDepreciation(prop);
        return`<div class="alert a-blue" style="margin-top:8px;font-size:11px">
           ${prop.name} — 年間減価償却費（予定）: ${dep.toLocaleString()}円
          （${STRUCTURE_LABEL[prop.structure]||prop.structure}・建物取得価額${prop.building_cost?.toLocaleString()}円）
          <button class="btn btn-sm btn-primary" style="margin-left:8px" onclick="addDepreciationJournal('${prop.id}')">仕訳に追加</button>
        </div>`;
      }).join('')}
      <div class="alert a-yellow" style="font-size:11px;margin-top:8px">
        ! 家賃収入は消費税が<strong>非課税</strong>です。事業所得と合算して確定申告書の「不動産所得」欄に記載してください。
        損益通算（不動産所得が赤字の場合に事業所得等と相殺）も可能です。
      </div>
    </div>
    <div class="card">
      <div class="card-title"> CSV出力</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" onclick="exportREJournalCSV()"> 不動産仕訳CSV</button>
        <button class="btn btn-sm" onclick="exportRentRollCSV()"> 賃料台帳CSV</button>
      </div>
    </div>`;
}

// ── 物件追加モーダル ──
function showAddProperty() {
  const bg = document.createElement('div'); bg.className='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:540px">
    <div class="modal-title"> 物件を追加</div>

    <!-- 書類読み取りセクション -->
    <div style="background:linear-gradient(135deg,rgba(124,111,255,0.08),rgba(90,79,255,0.04));border:1px solid rgba(124,111,255,0.25);border-radius:var(--radius);padding:14px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:4px"> 書類から自動入力（推奨）</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:10px">登記簿謄本・売買契約書・重要事項説明書を読み取ると物件情報を自動入力します</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--accent2),#3d2fff);color:#fff;font-size:12px;font-weight:700;box-shadow:0 2px 10px rgba(90,79,255,0.35)">
           カメラで撮影
          <input type="file" accept="image/*" capture="environment" style="display:none" onchange="scanPropertyDoc(event,'camera')">
        </label>
        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--radius-sm);background:var(--bg4);border:1px solid var(--border2);color:var(--text2);font-size:12px;font-weight:500">
           画像を選択
          <input type="file" accept="image/*" style="display:none" onchange="scanPropertyDoc(event,'image')">
        </label>
        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:var(--radius-sm);background:var(--bg4);border:1px solid var(--border2);color:var(--text2);font-size:12px;font-weight:500">
           PDFを選択
          <input type="file" accept="application/pdf" style="display:none" onchange="scanPropertyDoc(event,'pdf')">
        </label>
      </div>
      <div id="doc-scan-status" style="display:none;margin-top:10px"></div>
    </div>
    <div style="font-size:11px;color:var(--text3);text-align:center;margin-bottom:10px">— または手動で入力 —</div>
    <!-- 書類撮影セクション -->
    <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius);padding:12px;margin-bottom:14px">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px;color:var(--accent)"> 書類から自動入力（推奨）</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px">登記簿謄本・売買契約書・重要事項説明書をカメラで撮影するか、PDFをアップロードすると物件情報を自動入力します。</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <label style="cursor:pointer;padding:7px 14px;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--accent2),#3d2fff);color:#fff;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px">
           カメラで撮影
          <input type="file" id="doc-camera" accept="image/*" capture="environment" style="display:none" onchange="scanPropertyDoc(this)">
        </label>
        <label style="cursor:pointer;padding:7px 14px;border-radius:var(--radius-sm);background:var(--bg4);border:1px solid var(--border2);color:var(--text2);font-size:12px;font-weight:500;display:inline-flex;align-items:center;gap:6px">
           ファイル選択（PDF・画像）
          <input type="file" id="doc-file" accept="image/*,.pdf" style="display:none" onchange="scanPropertyDoc(this)">
        </label>
      </div>
      <div id="doc-scan-status" style="display:none;margin-top:8px"></div>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:8px;text-align:center">— または手動で入力 —</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">物件名</div>
        <input type="text" id="p-name" placeholder="グリーンハイツ渋谷"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">種別</div>
        <select id="p-type">${Object.entries(PROPERTY_TYPE_LABEL).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
    </div>
    <div class="form-row"><span class="form-label">住所</span><input type="text" id="p-addr" placeholder="東京都渋谷区〇〇1-1-1"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">建物構造</div>
        <select id="p-struct">${Object.entries(STRUCTURE_LABEL).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">築年月</div>
        <input type="month" id="p-built"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">取得年月</div>
        <input type="month" id="p-acq"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">土地取得価額（円）</div>
        <input type="number" id="p-land" placeholder="20000000"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">建物取得価額（円）</div>
        <input type="number" id="p-bldg" placeholder="25000000"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">ローン残高（円）</div>
        <input type="number" id="p-loan" placeholder="0"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">金利（%）</div>
        <input type="number" id="p-rate" step="0.1" placeholder="1.5"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">月返済額（円）</div>
        <input type="number" id="p-repay" placeholder="0"></div>
    </div>
    <div class="form-row"><span class="form-label">管理会社</span><input type="text" id="p-mgmt" placeholder="〇〇不動産管理"></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-primary btn-sm" onclick="addProperty(this)">物件を登録</button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">キャンセル</button>
    </div>
  </div>`;
  document.getElementById('app').appendChild(bg);
}

function addProperty(btn) {
  const a = accounts[currentAcct];
  if (!a.properties) a.properties = [];
  const acqDate = document.getElementById('p-acq').value;
  const land = parseInt(document.getElementById('p-land').value)||0;
  const bldg = parseInt(document.getElementById('p-bldg').value)||0;
  a.properties.push({
    id: 'p'+Date.now(), name: document.getElementById('p-name').value,
    type: document.getElementById('p-type').value,
    address: document.getElementById('p-addr').value,
    structure: document.getElementById('p-struct').value,
    built: document.getElementById('p-built').value+'-01',
    acquisition_date: acqDate+'-01', acquisition_cost: land+bldg,
    land_cost: land, building_cost: bldg,
    loan_balance: parseInt(document.getElementById('p-loan').value)||0,
    loan_rate: parseFloat(document.getElementById('p-rate').value)||0,
    loan_monthly: parseInt(document.getElementById('p-repay').value)||0,
    management_company: document.getElementById('p-mgmt').value,
    total_units: 0, floors: 0, notes:''
  });
  save(currentAcct); btn.closest('.modal-bg').remove(); renderRealEstate();
}

// ── 入居者追加モーダル ──
function showAddTenant(propertyId) {
  const a = accounts[currentAcct];
  const props = a.properties || [];
  const bg = document.createElement('div'); bg.className='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:520px">
    <div class="modal-title"> 入居者・部屋を追加</div>

    <!-- 契約書スキャン -->
    <div style="background:linear-gradient(135deg,rgba(124,111,255,0.08),rgba(90,79,255,0.04));border:1px solid rgba(124,111,255,0.25);border-radius:var(--radius);padding:12px;margin-bottom:14px">
      <div style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:4px"> 契約書から自動入力（推奨）</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px">賃貸借契約書・入居申込書を撮影すると自動入力します</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--accent2),#3d2fff);color:#fff;font-size:11px;font-weight:700">
           カメラで撮影
          <input type="file" accept="image/*" capture="environment" style="display:none" onchange="scanTenantDocInline(this)">
        </label>
        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:var(--radius-sm);background:var(--bg4);border:1px solid var(--border2);color:var(--text2);font-size:11px">
           ファイル選択（PDF・画像）
          <input type="file" accept="image/*,.pdf" style="display:none" onchange="scanTenantDocInline(this)">
        </label>
      </div>
      <div id="tenant-scan-status" style="display:none;margin-top:8px"></div>
    </div>
    <div style="font-size:11px;color:var(--text3);text-align:center;margin-bottom:10px">— または手動で入力 —</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">物件</div>
        <select id="t-prop">${props.map(p=>`<option value="${p.id}"${p.id===propertyId?' selected':''}>${p.name}</option>`).join('')}</select></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">部屋番号</div>
        <input type="text" id="t-room" placeholder="101"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">入居者名</div>
        <input type="text" id="t-name" placeholder="（空室の場合は空欄）"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">状態</div>
        <select id="t-status"><option value="active">入居中</option><option value="vacant">空室</option></select></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">月額賃料（円）</div>
        <input type="number" id="t-rent" placeholder="80000"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">共益費（円）</div>
        <input type="number" id="t-common" placeholder="3000"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">駐車場（円）</div>
        <input type="number" id="t-park" placeholder="0"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">敷金（円）</div>
        <input type="number" id="t-dep" placeholder="160000"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">礼金（円）</div>
        <input type="number" id="t-key" placeholder="80000"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">契約開始</div>
        <input type="date" id="t-start"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">契約終了</div>
        <input type="date" id="t-end"></div>
    </div>
    <div class="form-row"><span class="form-label">メモ</span><input type="text" id="t-notes" placeholder="更新済み / 礼金なし 等"></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-primary btn-sm" onclick="addTenant(this)">登録</button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">キャンセル</button>
    </div>
  </div>`;
  document.getElementById('app').appendChild(bg);
}

function addTenant(btn) {
  const a = accounts[currentAcct];
  if (!a.tenants) a.tenants = [];
  const t = {
    id: 't'+Date.now(),
    property_id: document.getElementById('t-prop').value,
    room: document.getElementById('t-room').value,
    name: document.getElementById('t-name').value,
    status: document.getElementById('t-status').value,
    rent: parseInt(document.getElementById('t-rent').value)||0,
    common_fee: parseInt(document.getElementById('t-common').value)||0,
    parking: parseInt(document.getElementById('t-park').value)||0,
    deposit: parseInt(document.getElementById('t-dep').value)||0,
    key_money: parseInt(document.getElementById('t-key').value)||0,
    contract_start: document.getElementById('t-start').value,
    contract_end: document.getElementById('t-end').value,
    notes: document.getElementById('t-notes').value
  };
  // 礼金は収入計上（返還不要のため）
  if (t.key_money > 0 && t.status==='active') {
    if (!a.journals) a.journals = [];
    a.journals.push({
      id: Date.now()+Math.random(), date: t.contract_start||new Date().toISOString().slice(0,10),
      description: `[不]礼金収入 ${t.room}号室 ${t.name}`,
      amount: t.key_money, type:'income', category:'[不]礼金収入',
      tax_type:'非課税', status:'confirmed', income_type:'realestate', tenant_id:t.id
    });
  }
  // 敷金は預かり金なので収入計上しない（返還義務あり）
  a.tenants.push(t);
  save(currentAcct); btn.closest('.modal-bg').remove(); renderRealEstate();
}

// ── 入居者詳細モーダル ──
function showTenantDetail(tenantId) {
  const a = accounts[currentAcct];
  const t = (a.tenants||[]).find(t=>t.id===tenantId); if(!t) return;
  const prop = (a.properties||[]).find(p=>p.id===t.property_id);
  const bg = document.createElement('div'); bg.className='modal-bg';
  bg.innerHTML=`<div class="modal">
    <div class="modal-title">${prop?.name||''} ${t.room}号室
      <span class="badge ${t.status==='active'?'b-green':'b-red'}" style="margin-left:8px">${t.status==='active'?'入居中':'空室'}</span>
    </div>
    ${t.status==='active'?`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;font-size:12px">
        <div style="background:var(--bg3);padding:8px;border-radius:var(--radius-sm)"><div style="color:var(--text3);font-size:10px">入居者名</div><div style="font-weight:700">${t.name}</div></div>
        <div style="background:var(--bg3);padding:8px;border-radius:var(--radius-sm)"><div style="color:var(--text3);font-size:10px">月額合計</div><div style="font-weight:700;color:var(--green)">${(t.rent+t.common_fee+t.parking).toLocaleString()}円</div></div>
        <div style="background:var(--bg3);padding:8px;border-radius:var(--radius-sm)"><div style="color:var(--text3);font-size:10px">賃料</div><div>${t.rent.toLocaleString()}円</div></div>
        <div style="background:var(--bg3);padding:8px;border-radius:var(--radius-sm)"><div style="color:var(--text3);font-size:10px">共益費・駐車場</div><div>${(t.common_fee+t.parking).toLocaleString()}円</div></div>
        <div style="background:var(--bg3);padding:8px;border-radius:var(--radius-sm)"><div style="color:var(--text3);font-size:10px">契約期間</div><div style="font-size:11px">${t.contract_start} 〜 ${t.contract_end}</div></div>
        <div style="background:var(--bg3);padding:8px;border-radius:var(--radius-sm)"><div style="color:var(--text3);font-size:10px">敷金（預かり中）</div><div style="color:var(--yellow)">${t.deposit.toLocaleString()}円</div></div>
      </div>
      ${t.notes?`<div class="alert a-blue" style="font-size:11px"> ${t.notes}</div>`:''}
      <div class="alert a-yellow" style="font-size:11px"> 敷金${t.deposit.toLocaleString()}円は預かり金のため収入計上不要。返還しない場合のみ収入になります。</div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-danger btn-sm" onclick="setTenantVacant('${t.id}',this)">退去処理</button>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">閉じる</button>
      </div>
    `:`
      <div class="alert a-red" style="font-size:11px">この部屋は現在空室です。</div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" onclick="this.closest('.modal-bg').remove();showAddTenant('${t.property_id}')">入居者を登録</button>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">閉じる</button>
      </div>`}
  </div>`;
  document.getElementById('app').appendChild(bg);
}

function setTenantVacant(tenantId, btn) {
  if (!confirm('退去処理をしますか？')) return;
  const a = accounts[currentAcct];
  const t = (a.tenants||[]).find(t=>t.id===tenantId); if(!t) return;
  t.status='vacant'; t.name=''; t.contract_end=new Date().toISOString().slice(0,10);
  save(currentAcct); btn.closest('.modal-bg').remove(); renderRealEstate();
}

// ── 経費手入力フォーム ──
function showREJournalForm() {
  const bg = document.createElement('div'); bg.className='modal-bg';
  bg.innerHTML=`<div class="modal">
    <div class="modal-title"> 不動産経費を入力</div>
    <div class="alert a-yellow" style="font-size:11px"> ローン利息のみ経費可。元金返済は経費になりません。</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">日付</div>
        <input type="date" id="re-date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">勘定科目</div>
        <select id="re-cat">${RE_EXPENSE_CATS.map(c=>`<option>${c}</option>`).join('')}</select></div>
    </div>
    <div class="form-row"><span class="form-label">摘要</span><input type="text" id="re-desc" placeholder="修繕費 101号室エアコン交換"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">金額（円）</div>
        <input type="number" id="re-amount" placeholder="0"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">消費税区分</div>
        <select id="re-tax">
          <option value="10,課税">課税 10%</option>
          <option value="0,不課税">不課税（固定資産税・借入金利息等）</option>
          <option value="0,非課税">非課税（保険料等）</option>
        </select></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-primary btn-sm" onclick="addREJournal(this)">登録</button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">キャンセル</button>
    </div>
  </div>`;
  document.getElementById('app').appendChild(bg);
}

function addREJournal(btn) {
  const a = accounts[currentAcct];
  const taxVal = document.getElementById('re-tax').value.split(',');
  const j = {
    id: Date.now()+Math.random(),
    date: document.getElementById('re-date').value,
    description: document.getElementById('re-desc').value||'不動産経費',
    amount: parseInt(document.getElementById('re-amount').value)||0,
    type:'expense', category: document.getElementById('re-cat').value,
    tax_rate: parseInt(taxVal[0]), tax_type: taxVal[1],
    status:'confirmed', income_type:'realestate'
  };
  if (!a.journals) a.journals=[];
  a.journals.push(j);
  save(currentAcct); updateKPI(); renderSidebar();
  btn.closest('.modal-bg').remove(); renderRealEstate();
}

// ── 減価償却仕訳を追加 ──
function addDepreciationJournal(propertyId) {
  const a = accounts[currentAcct];
  const prop = (a.properties||[]).find(p=>p.id===propertyId); if(!prop) return;
  const dep = calcDepreciation(prop);
  if (!dep) { alert('減価償却費を計算できません。建物取得価額・構造・取得日を確認してください。'); return; }
  if (!a.journals) a.journals=[];
  const exists = a.journals.some(j=>j.category==='[不]減価償却費'&&j.description.includes(prop.name)&&j.date.startsWith(String(a.year)));
  if (exists && !confirm('同じ物件の減価償却費が既に登録されています。再度追加しますか？')) return;
  a.journals.push({
    id: Date.now()+Math.random(), date: `${a.year}-12-31`,
    description: `[不]減価償却費 ${prop.name}（${STRUCTURE_LABEL[prop.structure]||prop.structure}・定額法）`,
    amount: dep, type:'expense', category:'[不]減価償却費',
    tax_rate:0, tax_type:'不課税', status:'confirmed', income_type:'realestate'
  });
  save(currentAcct); updateKPI(); renderSidebar();
  alert(` 減価償却費 ${dep.toLocaleString()}円 を仕訳に追加しました`);
  renderREReport();
}

// ── CSV出力 ──
function exportREJournalCSV() {
  const a = accounts[currentAcct];
  const rows = [['日付','摘要','勘定科目','税区分','金額','収支']];
  (a.journals||[]).filter(j=>j.income_type==='realestate').forEach(j=>{
    rows.push([j.date, j.description, j.category, j.tax_type, j.amount, j.type==='income'?'収入':'支出']);
  });
  const csv = rows.map(r=>r.map(v=>'"'+v+'"').join(',')).join('\n');
  const blob = new Blob(['﻿'+csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href=url; link.download=`不動産仕訳_${a.year}.csv`; link.click();
  URL.revokeObjectURL(url);
}

function exportRentRollCSV() {
  const a = accounts[currentAcct];
  const rows = [['物件名','部屋','入居者','状態','賃料','共益費','駐車場','月額合計','契約開始','契約終了','敷金']];
  (a.tenants||[]).forEach(t=>{
    const prop = (a.properties||[]).find(p=>p.id===t.property_id);
    rows.push([prop?.name||'',t.room,t.name,t.status==='active'?'入居中':'空室',t.rent,t.common_fee,t.parking,t.rent+t.common_fee+t.parking,t.contract_start,t.contract_end,t.deposit]);
  });
  const csv = rows.map(r=>r.map(v=>'"'+v+'"').join(',')).join('\n');
  const blob = new Blob(['﻿'+csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href=url; link.download=`賃料台帳_${a.year}.csv`; link.click();
  URL.revokeObjectURL(url);
}

function showPropertyTenants(propertyId) {
  const a = accounts[currentAcct];
  a._selectedProperty = propertyId;
  renderRETenants();
}
function showEditProperty(propertyId) {
  const a = accounts[currentAcct];
  const prop = (a.properties||[]).find(p=>p.id===propertyId); if(!prop) return;
  const bg = document.createElement('div'); bg.className='modal-bg';
  bg.innerHTML=`<div class="modal" style="width:520px">
    <div class="modal-title"> ${prop.name} — 編集</div>
    <div class="form-row"><span class="form-label">物件名</span><input type="text" id="ep-name" value="${prop.name}"></div>
    <div class="form-row"><span class="form-label">住所</span><input type="text" id="ep-addr" value="${prop.address||''}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">ローン残高（円）</div>
        <input type="number" id="ep-loan" value="${prop.loan_balance||0}"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">月返済額（円）</div>
        <input type="number" id="ep-repay" value="${prop.loan_monthly||0}"></div>
    </div>
    <div class="form-row"><span class="form-label">管理会社</span><input type="text" id="ep-mgmt" value="${prop.management_company||''}"></div>
    <div class="form-row"><span class="form-label">メモ</span><input type="text" id="ep-notes" value="${prop.notes||''}"></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-primary btn-sm" onclick="saveEditProperty('${prop.id}',this)">保存</button>
      <button class="btn btn-danger btn-sm" onclick="deleteProperty('${prop.id}',this)">削除</button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">キャンセル</button>
    </div>
  </div>`;
  document.getElementById('app').appendChild(bg);
}

function saveEditProperty(id, btn) {
  const a = accounts[currentAcct];
  const prop = (a.properties||[]).find(p=>p.id===id); if(!prop) return;
  prop.name = document.getElementById('ep-name').value;
  prop.address = document.getElementById('ep-addr').value;
  prop.loan_balance = parseInt(document.getElementById('ep-loan').value)||0;
  prop.loan_monthly = parseInt(document.getElementById('ep-repay').value)||0;
  prop.management_company = document.getElementById('ep-mgmt').value;
  prop.notes = document.getElementById('ep-notes').value;
  save(currentAcct); btn.closest('.modal-bg').remove(); renderRealEstate();
}

function deleteProperty(id, btn) {
  if (!confirm('この物件を削除しますか？入居者データも削除されます。')) return;
  const a = accounts[currentAcct];
  a.properties = (a.properties||[]).filter(p=>p.id!==id);
  a.tenants = (a.tenants||[]).filter(t=>t.property_id!==id);
  save(currentAcct); btn.closest('.modal-bg').remove(); renderRealEstate();
}


// ══════════════════════════════════════════════════════════════
//  不動産モジュール 第2回
// A. ローン利息/元金 月次自動分離
// B. 物件別損益詳細レポート
// C. 空室アラート（ダッシュボード連携）
// ══════════════════════════════════════════════════════════════

// ── A. ローン利息計算（元利均等返済） ──
// 毎月の返済額のうち「利息部分」だけが経費。元金返済は経費不可。
function calcLoanInterest(prop, month) {
  // month: YYYY-MM形式
  if (!prop.loan_balance || !prop.loan_rate) return { interest:0, principal:0, balance:prop.loan_balance||0 };
  const monthlyRate = prop.loan_rate / 100 / 12;
  const balance = prop.loan_balance || 0;
  const monthly  = prop.loan_monthly || 0;
  const interest  = Math.round(balance * monthlyRate);
  const principal = Math.max(0, monthly - interest);
  return { interest, principal, balance, monthly };
}

// 残高推移を計算（最大60ヶ月）
function calcLoanSchedule(prop, months=24) {
  if (!prop.loan_balance || !prop.loan_rate || !prop.loan_monthly) return [];
  const rows = [];
  let balance = prop.loan_balance;
  const monthlyRate = prop.loan_rate / 100 / 12;
  const now = new Date();
  for (let i=0; i<months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth()+i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const interest  = Math.round(balance * monthlyRate);
    const monthly   = prop.loan_monthly;
    const principal = Math.max(0, monthly - interest);
    rows.push({ ym, balance, interest, principal, monthly });
    balance = Math.max(0, balance - principal);
    if (balance === 0) break;
  }
  return rows;
}

// ── ローン管理タブ ──
function renderRELoan() {
  const a = accounts[currentAcct];
  const props = (a.properties||[]).filter(p=>p.loan_balance>0);

  document.getElementById('main-content').innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn btn-ghost btn-sm" onclick="renderRealEstate()">← 戻る</button>
      <button class="btn btn-primary btn-sm" onclick="autoGenerateLoanJournals()">⚡ 今月の利息を自動仕訳</button>
    </div>

    ${!props.length ? '<div class="alert a-yellow">ローンが登録された物件がありません。物件編集からローン情報を入力してください。</div>' : ''}

    ${props.map(prop => {
      const schedule = calcLoanSchedule(prop, 12);
      const thisMonth = new Date().toISOString().slice(0,7);
      const thisRow = schedule[0] || {};
      const totalInterestYear = schedule.reduce((s,r)=>s+r.interest,0);
      const paid = (a.journals||[]).filter(j=>
        j.category==='[不]借入金利息' &&
        j.description.includes(prop.name) &&
        j.date.startsWith(thisMonth)
      ).length > 0;

      return `<div class="card">
        <div class="card-title">
          <span> ${prop.name} — ローン管理</span>
          ${paid?'<span class="badge b-green">今月分済</span>':'<span class="badge b-yellow">今月分未処理</span>'}
        </div>

        <!-- 今月サマリー -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">
          <div style="background:var(--bg3);padding:10px;border-radius:var(--radius-sm);text-align:center">
            <div style="font-size:10px;color:var(--text3)">ローン残高</div>
            <div style="font-weight:700;color:var(--yellow);font-family:var(--mono)">${fmtM(prop.loan_balance)}</div>
          </div>
          <div style="background:var(--bg3);padding:10px;border-radius:var(--radius-sm);text-align:center">
            <div style="font-size:10px;color:var(--text3)">今月返済額</div>
            <div style="font-weight:700;font-family:var(--mono)">${(thisRow.monthly||0).toLocaleString()}円</div>
          </div>
          <div style="background:var(--green-bg);border:1px solid rgba(46,204,140,0.3);padding:10px;border-radius:var(--radius-sm);text-align:center">
            <div style="font-size:10px;color:var(--green)">利息（経費）</div>
            <div style="font-weight:700;color:var(--green);font-family:var(--mono)">${(thisRow.interest||0).toLocaleString()}円</div>
          </div>
          <div style="background:var(--red-bg);border:1px solid rgba(255,95,126,0.3);padding:10px;border-radius:var(--radius-sm);text-align:center">
            <div style="font-size:10px;color:var(--red)">元金（経費不可）</div>
            <div style="font-weight:700;color:var(--red);font-family:var(--mono)">${(thisRow.principal||0).toLocaleString()}円</div>
          </div>
        </div>

        <div class="alert a-yellow" style="font-size:11px;margin-bottom:10px">
           毎月の返済${(thisRow.monthly||0).toLocaleString()}円のうち、<strong>利息${(thisRow.interest||0).toLocaleString()}円のみ経費</strong>です。
          元金${(thisRow.principal||0).toLocaleString()}円は経費になりません。年間利息合計: ${totalInterestYear.toLocaleString()}円
        </div>

        <!-- 返済スケジュール（12ヶ月） -->
        <div style="font-size:11px;font-weight:700;margin-bottom:6px">返済スケジュール（12ヶ月）</div>
        <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm)">
          <table><thead><tr>
            <th>月</th><th>返済額</th>
            <th style="color:var(--green)">利息（経費）</th>
            <th style="color:var(--red)">元金（経費不可）</th>
            <th>残高</th><th>仕訳</th>
          </tr></thead>
          <tbody>${schedule.map((r,i)=>{
            const isRegistered = (a.journals||[]).some(j=>
              j.category==='[不]借入金利息' &&
              j.description.includes(prop.name) &&
              j.date.startsWith(r.ym)
            );
            return`<tr style="${i===0?'background:rgba(124,111,255,0.06)':''}">
              <td style="font-family:var(--mono);font-weight:${i===0?700:400}">${r.ym}${i===0?' 今月':''}</td>
              <td style="font-family:var(--mono)">${r.monthly.toLocaleString()}円</td>
              <td style="font-family:var(--mono);color:var(--green);font-weight:700">${r.interest.toLocaleString()}円</td>
              <td style="font-family:var(--mono);color:var(--red)">${r.principal.toLocaleString()}円</td>
              <td style="font-family:var(--mono);color:var(--text3)">${r.balance.toLocaleString()}円</td>
              <td>${isRegistered
                ? '<span class="badge b-green" style="font-size:9px">登録済</span>'
                : `<button class="btn btn-sm btn-ghost" style="font-size:9px" onclick="addLoanInterestJournal('${prop.id}','${r.ym}',${r.interest})">仕訳追加</button>`
              }</td>
            </tr>`;
          }).join('')}</tbody></table>
        </div>
      </div>`;
    }).join('')}
  `;
}

// 今月の利息を全物件分自動仕訳
function autoGenerateLoanJournals() {
  const a = accounts[currentAcct];
  const props = (a.properties||[]).filter(p=>p.loan_balance>0&&p.loan_rate>0);
  const ym = new Date().toISOString().slice(0,7);
  let addCount = 0;
  props.forEach(prop => {
    const already = (a.journals||[]).some(j=>
      j.category==='[不]借入金利息' &&
      j.description.includes(prop.name) &&
      j.date.startsWith(ym)
    );
    if (already) return;
    const { interest } = calcLoanInterest(prop, ym);
    if (interest <= 0) return;
    if (!a.journals) a.journals=[];
    a.journals.push({
      id:Date.now()+Math.random(), date:ym+'-28',
      description:`[不]借入金利息 ${prop.name} ${ym}（元利均等 金利${prop.loan_rate}%）`,
      amount:interest, type:'expense', category:'[不]借入金利息',
      tax_rate:0, tax_type:'非課税', status:'confirmed', income_type:'realestate'
    });
    addCount++;
  });
  save(currentAcct); updateKPI(); renderSidebar();
  if (addCount===0) alert('今月分の利息仕訳は既に登録済みです。');
  else alert(` ${addCount}件の利息仕訳を追加しました`);
  renderRELoan();
}

// 個別月の利息を仕訳追加
function addLoanInterestJournal(propId, ym, interest) {
  const a = accounts[currentAcct];
  const prop = (a.properties||[]).find(p=>p.id===propId); if(!prop) return;
  if (!a.journals) a.journals=[];
  a.journals.push({
    id:Date.now()+Math.random(), date:ym+'-28',
    description:`[不]借入金利息 ${prop.name} ${ym}`,
    amount:interest, type:'expense', category:'[不]借入金利息',
    tax_rate:0, tax_type:'非課税', status:'confirmed', income_type:'realestate'
  });
  save(currentAcct); updateKPI();
  renderRELoan();
}

// ── B. 物件別損益詳細レポート ──
function renderREPropertyPL() {
  const a = accounts[currentAcct];
  const props = a.properties || [];
  const J = a.journals || [];
  const year = a.year || 2026;

  // 物件別に収支を集計
  const propPL = props.map(prop => {
    const tenants = (a.tenants||[]).filter(t=>t.property_id===prop.id);
    const active = tenants.filter(t=>t.status==='active');
    const occ = tenants.length ? Math.round(active.length/tenants.length*100) : 0;
    const monthlyRent = active.reduce((s,t)=>s+t.rent+t.common_fee+t.parking,0);

    // 仕訳から収支集計（物件名が摘要に含まれているもの）
    const propJ = J.filter(j=>j.income_type==='realestate'&&j.description.includes(prop.name));
    const income  = propJ.filter(j=>j.type==='income').reduce((s,j)=>s+j.amount,0);
    const expense = propJ.filter(j=>j.type==='expense').reduce((s,j)=>s+j.amount,0);

    // 減価償却
    const dep = calcDepreciation(prop);

    // NOI（純営業収益）= 収入 - 経費（減価償却・利息除く）
    const interestExp = propJ.filter(j=>j.category==='[不]借入金利息').reduce((s,j)=>s+j.amount,0);
    const depExp = propJ.filter(j=>j.category==='[不]減価償却費').reduce((s,j)=>s+j.amount,0);
    const noi = income - (expense - interestExp - depExp);

    // 表面利回り = 年間賃料収入 / 取得価額
    const grossYield = prop.acquisition_cost>0 ? (monthlyRent*12/prop.acquisition_cost*100).toFixed(2) : 0;

    // NOI利回り = NOI / 取得価額
    const noiYield = prop.acquisition_cost>0 ? (noi/prop.acquisition_cost*100).toFixed(2) : 0;

    // 経費内訳
    const bycat = propJ.filter(j=>j.type==='expense').reduce((acc,j)=>{
      acc[j.category]=(acc[j.category]||0)+j.amount; return acc;
    },{});

    return { prop, tenants, active, occ, monthlyRent, income, expense, dep, noi, grossYield, noiYield, bycat, interestExp, depExp, profit:income-expense };
  });

  const totalIncome  = propPL.reduce((s,p)=>s+p.income,0);
  const totalExpense = propPL.reduce((s,p)=>s+p.expense,0);
  const totalProfit  = totalIncome-totalExpense;

  document.getElementById('main-content').innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn btn-ghost btn-sm" onclick="renderRealEstate()">← 戻る</button>
      <button class="btn btn-sm" onclick="exportREPropertyPLCSV()"> 物件別損益CSV</button>
    </div>

    <!-- 全体サマリー -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi"><div class="kpi-label">不動産収入合計</div><div class="kpi-value" style="color:var(--green)">${fmtM(totalIncome)}</div></div>
      <div class="kpi"><div class="kpi-label">不動産経費合計</div><div class="kpi-value" style="color:var(--red)">${fmtM(totalExpense)}</div></div>
      <div class="kpi"><div class="kpi-label">不動産所得合計</div><div class="kpi-value" style="color:${totalProfit>=0?'var(--green)':'var(--red)'}">${fmtM(totalProfit)}</div></div>
      <div class="kpi"><div class="kpi-label">物件数</div><div class="kpi-value">${props.length}棟</div></div>
    </div>

    <!-- 物件別カード -->
    ${propPL.map(p => `
    <div class="card" style="border-color:${p.profit>=0?'var(--border)':'rgba(255,95,126,0.3)'}">
      <div class="card-title">
        <div>
          <div style="font-size:14px;font-weight:900">${p.prop.name}</div>
          <div style="font-size:10px;color:var(--text3)">${PROPERTY_TYPE_LABEL[p.prop.type]||''} / 入居率${p.occ}%（${p.active.length}/${p.tenants.length}室）</div>
        </div>
        <span class="badge ${p.profit>=0?'b-green':'b-red'}" style="font-size:11px">
          ${p.profit>=0?'+':''}${fmtM(p.profit)}
        </span>
      </div>

      <!-- 収支概要 -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
        <div style="background:var(--green-bg);border:1px solid rgba(46,204,140,0.2);padding:10px;border-radius:var(--radius-sm);text-align:center">
          <div style="font-size:10px;color:var(--green)">収入合計</div>
          <div style="font-weight:700;color:var(--green);font-family:var(--mono)">${p.income.toLocaleString()}円</div>
          <div style="font-size:10px;color:var(--text3)">月次予定 ${p.monthlyRent.toLocaleString()}円</div>
        </div>
        <div style="background:var(--red-bg);border:1px solid rgba(255,95,126,0.2);padding:10px;border-radius:var(--radius-sm);text-align:center">
          <div style="font-size:10px;color:var(--red)">経費合計</div>
          <div style="font-weight:700;color:var(--red);font-family:var(--mono)">${p.expense.toLocaleString()}円</div>
          <div style="font-size:10px;color:var(--text3)">減価償却 ${p.dep.toLocaleString()}円/年</div>
        </div>
        <div style="background:${p.profit>=0?'var(--blue-bg)':'var(--red-bg)'};border:1px solid ${p.profit>=0?'rgba(77,159,255,0.2)':'rgba(255,95,126,0.2)'};padding:10px;border-radius:var(--radius-sm);text-align:center">
          <div style="font-size:10px;color:${p.profit>=0?'var(--blue)':'var(--red)'}">不動産所得</div>
          <div style="font-weight:700;color:${p.profit>=0?'var(--blue)':'var(--red)'};font-family:var(--mono)">${p.profit>=0?'+':''}${p.profit.toLocaleString()}円</div>
          <div style="font-size:10px;color:var(--text3)">NOI利回 ${p.noiYield}%</div>
        </div>
      </div>

      <!-- 利回り指標 -->
      <div style="display:flex;gap:16px;margin-bottom:10px;padding:8px 10px;background:var(--bg3);border-radius:var(--radius-sm);flex-wrap:wrap">
        ${[
          ['表面利回り', p.grossYield+'%', '年間賃料÷取得価額'],
          ['NOI利回り',  p.noiYield+'%',   '純営業収益÷取得価額'],
          ['取得価額',   '' +fmtM(p.prop.acquisition_cost||0), '土地+建物'],
          ['ローン残高', '' +fmtM(p.prop.loan_balance||0),     '金利'+p.prop.loan_rate+'%'],
        ].map(([label,val,sub])=>`
          <div style="text-align:center;min-width:80px">
            <div style="font-size:10px;color:var(--text3)">${label}</div>
            <div style="font-size:13px;font-weight:700;color:var(--text)">${val}</div>
            <div style="font-size:9px;color:var(--text3)">${sub}</div>
          </div>`).join('')}
      </div>

      <!-- 経費内訳 -->
      <div style="font-size:11px;font-weight:700;margin-bottom:6px;color:var(--text2)">経費内訳</div>
      ${Object.entries(p.bycat).sort(([,a],[,b])=>b-a).map(([cat,val])=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:10px;color:var(--text3);min-width:130px">${cat}</span>
          <div style="flex:1;background:var(--bg4);border-radius:99px;height:5px;overflow:hidden">
            <div style="height:100%;border-radius:99px;background:var(--red);width:${p.expense>0?val/p.expense*100:0}%"></div>
          </div>
          <span style="font-family:var(--mono);font-size:10px;min-width:80px;text-align:right">${val.toLocaleString()}円</span>
        </div>`).join('')}

      ${p.profit<0?`<div class="alert a-yellow" style="margin-top:8px;font-size:11px">
        ! 不動産所得が赤字です。事業所得との<strong>損益通算</strong>により所得税を節税できる可能性があります。税理士に確認してください。
      </div>`:''}

      ${p.occ<80?`<div class="alert a-red" style="margin-top:8px;font-size:11px">
        ! 入居率${p.occ}%（${p.tenants.length-p.active.length}室空室）。空室が続くと年間${((p.tenants.length-p.active.length)*p.monthlyRent/p.active.length*12||0).toLocaleString()}円の機会損失になります。
      </div>`:''}
    </div>`).join('')}

    <!-- 確定申告サマリー -->
    <div class="card">
      <div class="card-title"> 確定申告用サマリー（不動産所得）</div>
      <div style="max-width:480px">
        <div class="pl-line bold"><span style="color:var(--green)">不動産収入合計</span><span style="font-family:var(--mono);color:var(--green)">${totalIncome.toLocaleString()}円</span></div>
        <div class="pl-line bold"><span style="color:var(--red)">必要経費合計</span><span style="font-family:var(--mono);color:var(--red)">${totalExpense.toLocaleString()}円</span></div>
        <div class="pl-line bold sep">
          <span style="font-size:13px">不動産所得</span>
          <span style="font-family:var(--mono);font-size:15px;color:${totalProfit>=0?'var(--green)':'var(--red)'}">${totalProfit.toLocaleString()}円</span>
        </div>
      </div>
      <div class="alert a-blue" style="margin-top:8px;font-size:11px">
        この金額をfreeeの確定申告書「不動産所得」欄に入力してください。freee連携タブから仕訳を送信すると自動で反映されます。
      </div>
    </div>
  `;
}

// 物件別損益CSVエクスポート
function exportREPropertyPLCSV() {
  const a = accounts[currentAcct];
  const props = a.properties || [];
  const J = a.journals || [];
  const rows = [['物件名','種別','入居率','収入','経費','不動産所得','表面利回り','取得価額','ローン残高']];
  props.forEach(prop => {
    const tenants = (a.tenants||[]).filter(t=>t.property_id===prop.id);
    const active  = tenants.filter(t=>t.status==='active');
    const occ     = tenants.length ? Math.round(active.length/tenants.length*100) : 0;
    const monthlyRent = active.reduce((s,t)=>s+t.rent+t.common_fee+t.parking,0);
    const propJ   = J.filter(j=>j.income_type==='realestate'&&j.description.includes(prop.name));
    const income  = propJ.filter(j=>j.type==='income').reduce((s,j)=>s+j.amount,0);
    const expense = propJ.filter(j=>j.type==='expense').reduce((s,j)=>s+j.amount,0);
    const grossYield = prop.acquisition_cost>0 ? (monthlyRent*12/prop.acquisition_cost*100).toFixed(2)+'%' : '—';
    rows.push([prop.name, PROPERTY_TYPE_LABEL[prop.type]||prop.type, occ+'%', income, expense, income-expense, grossYield, prop.acquisition_cost||0, prop.loan_balance||0]);
  });
  const csv = rows.map(r=>r.map(v=>'\"'+v+'\"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv'});
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href=url; link.download=`物件別損益_${a.year}.csv`; link.click();
  URL.revokeObjectURL(url);
}

// ── C. 空室アラート（ダッシュボード連携） ──
function getVacantAlerts(a) {
  const tenants = a.tenants || [];
  const vacant  = tenants.filter(t=>t.status==='vacant');
  const props   = a.properties || [];
  // 契約更新が近い入居者（90日以内）
  const today = new Date();
  const soonExpire = tenants.filter(t=>{
    if (!t.contract_end || t.status!=='active') return false;
    const end = new Date(t.contract_end);
    const days = Math.round((end-today)/(1000*60*60*24));
    return days >= 0 && days <= 90;
  });
  return { vacant, soonExpire };
}

// ダッシュボードパッチ：空室アラートを追加

// ══════════════════════════════════════════════
// モバイルナビゲーション
// ══════════════════════════════════════════════
function mobileTab(name) {
  if (!currentAcct) {
    // 事業者未選択 → 最初の事業者を自動選択
    const keys = Object.keys(accounts);
    if (keys.length) selectAccount(keys[0]);
    else { showAddAccount(); return; }
  }
  switchTab(name);
  updateMobileNav(name);
}

function updateMobileNav(name) {
  const mainTabs = ['dashboard','receipt','auto','realestate'];
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active'));
  const id = 'mnav-' + (mainTabs.includes(name) ? name : 'more');
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function hideMobileMenu() { closeSheet(); }

function updateMobileAcctBar() {
  const bar = document.getElementById('mobile-acct-bar');
  if (!bar) return;
  const keys = Object.keys(accounts || {});
  if (!keys.length) {
    bar.innerHTML = '<button onclick="showAddAccount()" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:99px;border:1px dashed var(--border2);background:transparent;color:var(--text3);font-size:11px;cursor:pointer">＋ 事業者を追加</button>';
    return;
  }
  bar.innerHTML = keys.map(email => {
    const a = accounts[email];
    const active = currentAcct === email;
    return '<button class="mobile-acct-chip' + (active?' active':'') + '" onclick="selectAccount(\'' + email + '\')">' + a.name + '</button>';
  }).join('') + '<button onclick="showAddAccount()" style="display:inline-flex;align-items:center;padding:6px 12px;border-radius:99px;border:1px dashed var(--border2);background:transparent;color:var(--text3);font-size:11px;cursor:pointer">＋</button>';
}


// ══════════════════════════════════════════════════════════════
// Supabase データ永続化レイヤー
// 無料プラン対応・電子帳簿保存法準拠（7年保存）
// ══════════════════════════════════════════════════════════════

const SB = {
  url: null,
  key: null,
  client: null,      // 公式Supabaseクライアント
  userId: null,
  accountMap: {},

  async init() {
    // 既にクライアントが作成済みなら再作成しない
    if (this.client) return true;
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const cfg = await res.json();
        this.url = cfg.supabase_url;
        this.key = cfg.supabase_key;
        // 公式ライブラリでクライアントを作成（1回のみ）
        if (this.url && this.key && typeof supabase !== 'undefined' && !this.client) {
          this.client = supabase.createClient(this.url, this.key, {
            auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ninja-choba-auth' }
          });
        }
      }
    } catch(e) {}
    return !!(this.url && this.key && this.client);
  },

  // Supabase REST APIを叩く
  async query(path, method='GET', body=null, opts={}) {
    if (!this.url) return null;
    try {
      const headers = {
        'Content-Type': 'application/json',
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
      };
      if (opts.prefer) headers['Prefer'] = opts.prefer;
      if (opts.select) path += `?select=${opts.select}`;

      const res = await fetch(`/api/supabase?path=${encodeURIComponent(path)}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) return null;
      const text = await res.text();
      return text ? JSON.parse(text) : true;
    } catch(e) {
      return null;
    }
  },

  // ── 仕訳を保存 ──
  async saveJournal(accountId, journal) {
    const sbAccountId = this.accountMap[accountId];
    if (!sbAccountId) return false;
    const data = {
      account_id: sbAccountId,
      date: journal.date,
      description: journal.description,
      amount: journal.amount,
      type: journal.type,
      category: journal.category,
      tax_rate: journal.tax_rate || 10,
      tax_type: journal.tax_type || '課税',
      status: journal.status || 'confirmed',
      phase: journal.phase || null,
      confidence: journal.confidence || null,
      law: journal.law || null,
      reason: journal.reason || null,
      income_type: journal.income_type || null,
      freee_deal_id: journal.freee_deal_id || null,
    };
    const result = await this.query('/rest/v1/journals', 'POST', data, { prefer: 'return=representation' });
    return result ? result[0]?.id : null;
  },

  // ── 仕訳を一括保存 ──
  async saveJournals(accountId, journals) {
    const sbAccountId = this.accountMap[accountId];
    if (!sbAccountId || !journals.length) return false;
    const data = journals.map(j => ({
      account_id: sbAccountId,
      date: j.date,
      description: j.description,
      amount: j.amount,
      type: j.type,
      category: j.category,
      tax_rate: j.tax_rate || 10,
      tax_type: j.tax_type || '課税',
      status: j.status || 'confirmed',
      income_type: j.income_type || null,
    }));
    return await this.query('/rest/v1/journals', 'POST', data, { prefer: 'return=minimal' });
  },

  // ── 仕訳を取得 ──
  async getJournals(accountId, year) {
    const sbAccountId = this.accountMap[accountId];
    if (!sbAccountId) return null;
    const from = `${year}-01-01`;
    const to   = `${year}-12-31`;
    const path = `/rest/v1/journals?account_id=eq.${sbAccountId}&date=gte.${from}&date=lte.${to}&is_deleted=eq.false&order=date.desc`;
    return await this.query(path);
  },

  // ── レシート画像を保存（Supabase Storage）──
  async saveReceiptImage(accountId, file) {
    if (!this.url) return null;
    const sbAccountId = this.accountMap[accountId];
    if (!sbAccountId) return null;
    try {
      const ext = file.name.split('.').pop();
      const path = `${sbAccountId}/${Date.now()}.${ext}`;
      const res = await fetch(`${this.url}/storage/v1/object/receipts/${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.key}`,
          'Content-Type': file.type,
        },
        body: file,
      });
      if (!res.ok) return null;
      // 7年間の公開URLを生成（署名付き）
      const signRes = await fetch(`${this.url}/storage/v1/object/sign/receipts/${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 365 * 8 }), // 8年
      });
      const sign = signRes.ok ? await signRes.json() : null;
      return {
        path,
        url: sign?.signedURL ? `${this.url}/storage/v1${sign.signedURL}` : null,
      };
    } catch(e) { return null; }
  },

  // ── アカウントを作成・取得 ──
  async ensureAccount(email, name, business) {
    if (this.accountMap[email]) return this.accountMap[email];
    // 既存を検索
    const existing = await this.query(`/rest/v1/accounts?email=eq.${encodeURIComponent(email)}`);
    if (existing && existing.length) {
      this.accountMap[email] = existing[0].id;
      return existing[0].id;
    }
    // 新規作成（認証なし・匿名モード）
    const result = await this.query('/rest/v1/accounts', 'POST', {
      name, business, email, year: new Date().getFullYear()
    }, { prefer: 'return=representation' });
    if (result && result[0]) {
      this.accountMap[email] = result[0].id;
      return result[0].id;
    }
    return null;
  },

  // ── 全データをSupabaseに同期 ──
  async syncAll(email) {
    const a = accounts[email];
    if (!a) return false;
    try {
      // アカウント確保
      await this.ensureAccount(email, a.name, a.business);
      // 仕訳を同期（未同期のもののみ）
      const unsaved = (a.journals||[]).filter(j => !j.sb_synced);
      if (unsaved.length > 0) {
        const ok = await this.saveJournals(email, unsaved);
        if (ok) {
          unsaved.forEach(j => j.sb_synced = true);
          // localStorageに反映
          try { localStorage.setItem('ninjaX:'+email, JSON.stringify(a)); } catch(e) {}
        }
      }
      return true;
    } catch(e) { return false; }
  },

  // ── 保存済みデータをSupabaseから復元 ──
  async restore(email) {
    const sbId = await this.ensureAccount(email,
      accounts[email]?.name || '', accounts[email]?.business || '');
    if (!sbId) return null;
    const journals = await this.getJournals(email, new Date().getFullYear());
    return journals;
  }
};

// ── save関数をオーバーライドしてSupabaseにも自動同期 ──
const _origSave = save;
save = async function(email) {
  // localStorageに保存（既存の動作）
  try { localStorage.setItem('ninjaX:'+email, JSON.stringify(accounts[email])); } catch(e) {}
  // Supabaseにバックグラウンド同期（失敗してもUIには影響しない）
  if (SB.url) {
    SB.syncAll(email).catch(()=>{});
  }
};

// ── アプリ起動時にSupabaseを初期化 ──
SB.init().then(connected => {
  if (connected) {
    console.log('[SB] Supabase connected');
  } else {
    console.log('[SB] Running in localStorage mode');
  }
});


// ══════════════════════════════════════════════════════
//  賃貸借契約書スキャン（入居者追加モーダル内インライン版）
// ══════════════════════════════════════════════════════
async function scanTenantDocInline(input) {
  const file = input.files[0]; if (!file) return;
  const statusEl = document.getElementById('tenant-scan-status');
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.innerHTML = `<div style="padding:8px;background:var(--blue-bg);border-radius:var(--radius-sm);font-size:11px;color:var(--blue)"> 契約書を解析中<span class="dot-anim"></span></div>`;
  }
  try {
    const b64 = await fileToBase64(file);
    const isPDF = file.type === 'application/pdf';
    const block = isPDF
      ? {type:'document', source:{type:'base64', media_type:'application/pdf', data:b64}}
      : {type:'image', source:{type:'base64', media_type:file.type, data:b64}};

    const res = await fetch('/api/claude', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model: MODEL, max_tokens: 1000,
        messages:[{role:'user', content:[block, {type:'text', text:`これは賃貸借契約書または入居申込書です。以下の情報を読み取りJSONのみ返答してください。不明な項目はnull。
{"room":"部屋番号(例:101)","tenant_name":"入居者氏名","rent":賃料数値,"common_fee":共益費数値,"parking":駐車場代数値,"deposit":敷金数値,"key_money":礼金数値,"contract_start":"YYYY-MM-DD","contract_end":"YYYY-MM-DD","status":"active","notes":"特約事項の要約","confidence":"high/medium/low"}`}]}]})
    });
    const d = await res.json();
    const raw = d.content[0].text.replace(/\`\`\`json|\`\`\`/g,'').trim();
    const p = JSON.parse(raw);

    // フォームに自動入力
    const setVal = (id, val) => { const el=document.getElementById(id); if(el&&val!=null) el.value=val; };
    setVal('t-room', p.room);
    setVal('t-name', p.tenant_name);
    if (p.status) { const sel=document.getElementById('t-status'); if(sel) sel.value=p.status; }
    setVal('t-rent', p.rent);
    setVal('t-common', p.common_fee);
    setVal('t-park', p.parking);
    setVal('t-dep', p.deposit);
    setVal('t-key', p.key_money);
    setVal('t-start', p.contract_start);
    setVal('t-end', p.contract_end);
    setVal('t-notes', p.notes);

    const confColor = {high:'var(--green)',medium:'var(--yellow)',low:'var(--red)'}[p.confidence]||'var(--text3)';
    const filled = Object.values(p).filter(v=>v!=null&&v!==''&&v!=='active').length;
    if (statusEl) {
      statusEl.innerHTML = `<div style="background:var(--green-bg);border:1px solid rgba(46,204,140,0.3);border-radius:var(--radius-sm);padding:10px;font-size:11px">
        <div style="font-weight:700;color:var(--green);margin-bottom:3px"> 契約書を読み取りました
          <span style="color:${confColor};font-weight:400;margin-left:6px">精度: ${p.confidence}</span>
        </div>
        <div style="color:var(--text2)">${filled}項目を自動入力しました。内容を確認してから「登録」してください。</div>
      </div>`;
    }
  } catch(e) {
    if (statusEl) {
      statusEl.innerHTML = `<div style="background:var(--red-bg);border-radius:var(--radius-sm);padding:8px;font-size:11px;color:var(--red)"> 読み取り失敗。手動で入力してください。</div>`;
    }
  }
}


function copyFreeeCallbackUrl() {
  const url = window.location.origin;
  navigator.clipboard.writeText(url).then(()=>{
    alert('コピーしました: ' + url);
  }).catch(()=>{
    prompt('このURLをコピーしてfreee Developer Consoleに設定してください:', url);
  });
}


// ══════════════════════════════════════════════════════════════
//  AI学習フィードバック機能
// ユーザーが修正した仕訳からパターンを学習し次回から自動適用
// ══════════════════════════════════════════════════════════════

// ── 学習ルールの保存キー ──


// ── キーワード抽出（摘要から学習キーワードを生成）──
function extractKeywords(description) {
  const d = description
    .replace(/[0-9０-９]+円?/g, '')   // 金額除去
    .replace(/[0-9０-９]+月/g, '')     // 月除去
    .replace(/\s+/g, ' ')
    .trim();
  // 3文字以上の意味のある部分を抽出
  const words = d.split(/[\s　・\/\-_,、。]/);
  return words.filter(w => w.length >= 2).slice(0, 3);
}

// ── 学習ルールに追加 ──


// ── 学習ルールで判定（phase1より前に適用）──
function applyLearningRules(description, email) {
  const rules = getLearningRules(email);
  if (!rules.length) return null;

  const d = description.toLowerCase();
  // 使用回数が多い順・新しい順でマッチング
  const sorted = [...rules].sort((a, b) =>
    (b.count || 1) - (a.count || 1) ||
    new Date(b.updated_at) - new Date(a.updated_at)
  );

  for (const rule of sorted) {
    const matched = rule.keywords.some(kw =>
      d.includes(kw.toLowerCase())
    );
    if (matched) {
      return {
        category: rule.category,
        tax: rule.tax_rate,
        type: rule.tax_type,
        note: `学習ルール: "${rule.keywords[0]}" → ${rule.category}（${rule.count}回学習済み）`,
        phase: 'learned',
        confidence: rule.count >= 3 ? 'high' : 'medium',
        rule_id: rule.id,
      };
    }
  }
  return null;
}

// ── 仕訳修正時に学習をトリガー ──
function correctJournal(journalId, newCategory, newTaxType, newTaxRate, newType) {
  const a = accounts[currentAcct];
  const j = (a.journals || []).find(j => j.id == journalId);
  if (!j) return;

  const original = { ...j };
  const corrected = {
    category: newCategory || j.category,
    tax_type: newTaxType || j.tax_type,
    tax_rate: newTaxRate !== undefined ? newTaxRate : j.tax_rate,
    type: newType || j.type,
  };

  // 変更があった場合のみ学習
  if (original.category !== corrected.category ||
      original.tax_type !== corrected.tax_type) {
    const learned = learnFromCorrection(original, corrected, currentAcct);
    if (learned) {
      // 学習フィードバックトースト表示
      showLearnToast(original.description, corrected.category);
    }
  }

  // 仕訳を更新
  j.category = corrected.category;
  j.tax_type = corrected.tax_type;
  j.tax_rate = corrected.tax_rate;
  j.type = corrected.type;
  j.status = 'confirmed';
  j.manually_corrected = true;

  save(currentAcct);
  updateKPI();
  renderSidebar();
  setTimeout(function(){ renderDashboardAlerts(accounts[currentAcct]);
    renderMemberStats();
    updateMemberDisplay();
    renderDuplicateWarning();
    renderLearningStatus();
    // 月別グラフ描画
    setTimeout(function() {
      const a = accounts[currentAcct];
      if (!a) return;
      const monthlyData = getMonthlyData(a, 6);
      drawMonthlyChart('monthly-chart-canvas', monthlyData);
    }, 150); }, 100);
}

// ── 学習トースト通知 ──
function showLearnToast(description, category) {
  showToast(' 次回から自動: 「' + description.slice(0,15) + '…」→ ' + category, 'success');
}

// ── 学習ルール管理画面 ──
function showLearningRules() {
  const rules = getLearningRules(currentAcct);
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" style="width:600px;max-height:85vh;overflow-y:auto">
    <div class="modal-title"> AI学習ルール管理
      <span style="font-size:11px;color:var(--text3);font-weight:400">${rules.length}件のルール</span>
    </div>

    ${rules.length === 0 ? `
      <div class="empty" style="padding:24px">
        まだ学習ルールがありません。<br>
        仕訳の勘定科目を修正すると自動で学習します。
      </div>
    ` : `
      <div class="alert a-blue" style="font-size:11px;margin-bottom:12px">
         以下のルールが次回の自動仕訳に適用されます。使用回数が多いほど優先度が高くなります。
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:var(--bg3)">
          <th style="padding:8px;text-align:left;color:var(--text3);font-size:10px;text-transform:uppercase">キーワード</th>
          <th style="padding:8px;text-align:left;color:var(--text3);font-size:10px;text-transform:uppercase">勘定科目</th>
          <th style="padding:8px;text-align:left;color:var(--text3);font-size:10px;text-transform:uppercase">税区分</th>
          <th style="padding:8px;text-align:center;color:var(--text3);font-size:10px;text-transform:uppercase">使用回数</th>
          <th style="padding:8px;text-align:left;color:var(--text3);font-size:10px;text-transform:uppercase">サンプル</th>
          <th style="padding:8px"></th>
        </tr></thead>
        <tbody>
          ${[...rules].sort((a,b)=>(b.count||1)-(a.count||1)).map(r => `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:8px">
                ${r.keywords.map(kw =>
                  `<span style="background:rgba(124,111,255,0.15);color:var(--accent);padding:1px 6px;border-radius:4px;font-size:11px;margin-right:3px">${kw}</span>`
                ).join('')}
              </td>
              <td style="padding:8px;font-weight:700">${r.category}</td>
              <td style="padding:8px">
                <span class="${r.tax_type==='非課税'||r.tax_type==='不課税'?'taxfree':r.tax_rate===8?'tax8':'tax10'}" style="font-size:10px">${r.tax_type}</span>
              </td>
              <td style="padding:8px;text-align:center">
                <span style="font-weight:700;color:${r.count>=5?'var(--green)':r.count>=3?'var(--yellow)':'var(--text3)'}">${r.count||1}回</span>
              </td>
              <td style="padding:8px;font-size:11px;color:var(--text3);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${r.description_sample||'—'}
              </td>
              <td style="padding:8px">
                <button class="btn btn-ghost btn-sm" style="font-size:10px;color:var(--red)"
                  onclick="deleteLearningRule(${r.id},this)">削除</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}

    <div style="display:flex;gap:8px;margin-top:14px">
      ${rules.length > 0 ? `<button class="btn btn-danger btn-sm" onclick="clearAllLearningRules(this)">全ルールをリセット</button>` : ''}
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">閉じる</button>
    </div>
  </div>`;
  document.getElementById('app').appendChild(bg);
}


function clearAllLearningRules(btn) {
  if (!confirm('全ての学習ルールを削除しますか？この操作は取り消せません。')) return;
  const a = accounts[currentAcct];
  a.learning_rules = [];
  save(currentAcct);
  btn.closest('.modal-bg').remove();
  showLearningRules();
}


// ── 仕訳修正モーダル（学習トリガー付き）──
function showCorrectJournal(journalId) {
  const a = accounts[currentAcct];
  const j = (a.journals||[]).find(j => String(j.id) === String(journalId));
  if (!j) return;
  const cats = ['売上高','仕入高','接待交際費','会議費','消耗品費','旅費交通費','通信費',
    '広告宣伝費','地代家賃','水道光熱費','支払手数料','外注費','租税公課','損害保険料',
    '修繕費','減価償却費','給与賃金','福利厚生費','賃借料','新聞図書費','雑費','支払報酬料',
    '[不]賃料収入','[不]管理委託費','[不]修繕費','[不]借入金利息','[不]減価償却費'];

  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal">
    <div class="modal-title"> 仕訳を修正
      <span style="font-size:11px;color:var(--text3);font-weight:400"> 修正内容を学習します</span>
    </div>
    <div class="alert a-blue" style="font-size:11px;margin-bottom:12px">
      修正すると次回から「${j.description.slice(0,20)}…」のような取引は自動で正しく判定されます。
    </div>
    <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:10px;margin-bottom:12px;font-size:12px">
      <div style="color:var(--text3);margin-bottom:4px">現在の判定</div>
      <div style="display:flex;gap:8px;align-items:center">
        <span style="font-weight:700">${j.description.slice(0,30)}</span>
        <span class="badge b-gray">${j.category}</span>
        <span class="${j.tax_type==='非課税'||j.tax_type==='不課税'?'taxfree':'tax10'}" style="font-size:10px">${j.tax_type}</span>
        <span style="font-family:var(--mono)">${j.amount.toLocaleString()}円</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:3px">勘定科目</div>
        <select id="cj-cat">
          ${cats.map(c => `<option${c===j.category?' selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:3px">消費税区分</div>
        <select id="cj-tax">
          <option value="10,課税"${j.tax_type==='課税'?' selected':''}>課税 10%</option>
          <option value="8,課税（軽減）"${j.tax_type==='課税（軽減）'?' selected':''}>軽減 8%</option>
          <option value="0,非課税"${j.tax_type==='非課税'?' selected':''}>非課税</option>
          <option value="0,不課税"${j.tax_type==='不課税'?' selected':''}>不課税</option>
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:3px">区分</div>
        <select id="cj-type">
          <option value="expense"${j.type==='expense'?' selected':''}>支出（経費）</option>
          <option value="income"${j.type==='income'?' selected':''}>収入</option>
        </select>
      </div>
      <div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:3px">状態</div>
        <select id="cj-status">
          <option value="confirmed"${j.status==='confirmed'?' selected':''}>確定</option>
          <option value="ambiguous"${j.status==='ambiguous'?' selected':''}>要確認</option>
          <option value="excluded"${j.status==='excluded'?' selected':''}>除外</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-primary btn-sm" onclick="applyJournalCorrection('${journalId}',this)">
         修正する（次回から自動適用）
      </button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">キャンセル</button>
    </div>
  </div>`;
  document.getElementById('app').appendChild(bg);
}

function applyJournalCorrection(journalId, btn) {
  const a = accounts[currentAcct];
  const j = (a.journals||[]).find(j => String(j.id) === String(journalId));
  if (!j) return;

  const taxVal = document.getElementById('cj-tax').value.split(',');
  const newCategory = document.getElementById('cj-cat').value;
  const newTaxRate  = parseInt(taxVal[0]);
  const newTaxType  = taxVal[1];
  const newType     = document.getElementById('cj-type').value;
  const newStatus   = document.getElementById('cj-status').value;

  // 学習トリガー
  const changed = j.category !== newCategory || j.tax_type !== newTaxType;
  if (changed) {
    learnFromCorrection(
      { description: j.description, category: j.category },
      { category: newCategory, tax_rate: newTaxRate, tax_type: newTaxType, type: newType }
    );
  }

  // 仕訳を更新
  j.category = newCategory;
  j.tax_rate  = newTaxRate;
  j.tax_type  = newTaxType;
  j.type      = newType;
  j.status    = newStatus;
  j.manually_corrected = true;

  save(currentAcct); updateKPI(); renderSidebar(); updateKPIAnimated();
  btn.closest('.modal-bg').remove();
  renderJournal();
  if (changed) showLearnToast(j.description, newCategory);
}

// ══════════════════════════════════════════════════════════════
// 確定申告完結パッケージ
// 1. 消費税集計表（tax）
// 2. 家事按分（kasan）
// 3. 固定資産・減価償却台帳（assets）
// 4. 貸借対照表（bs）
// ══════════════════════════════════════════════════════════════

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 消費税集計表
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function calcTaxSummary(a) {
  const J = (a.journals||[]).filter(j=>j.status==='confirmed'||j.status==='ambiguous');
  const year = a.year || new Date().getFullYear();

  // 課税売上（10%・8%）
  const taxableSales10  = J.filter(j=>j.type==='income'&&j.tax_type==='課税').reduce((s,j)=>s+j.amount,0);
  const taxableSales8   = J.filter(j=>j.type==='income'&&j.tax_type==='課税（軽減）').reduce((s,j)=>s+j.amount,0);
  const nonTaxableSales = J.filter(j=>j.type==='income'&&(j.tax_type==='非課税'||j.tax_type==='不課税')).reduce((s,j)=>s+j.amount,0);
  const totalSales      = taxableSales10 + taxableSales8 + nonTaxableSales;

  // 課税仕入（10%・8%）
  const taxablePurch10  = J.filter(j=>j.type==='expense'&&j.tax_type==='課税').reduce((s,j)=>s+j.amount,0);
  const taxablePurch8   = J.filter(j=>j.type==='expense'&&j.tax_type==='課税（軽減）').reduce((s,j)=>s+j.amount,0);
  const nonTaxablePurch = J.filter(j=>j.type==='expense'&&(j.tax_type==='非課税'||j.tax_type==='不課税')).reduce((s,j)=>s+j.amount,0);

  // 消費税計算（税込金額から逆算）
  const consumptionTaxSales10  = Math.floor(taxableSales10  * 10 / 110);
  const consumptionTaxSales8   = Math.floor(taxableSales8   *  8 / 108);
  const consumptionTaxPurch10  = Math.floor(taxablePurch10  * 10 / 110);
  const consumptionTaxPurch8   = Math.floor(taxablePurch8   *  8 / 108);

  const totalTaxSales  = consumptionTaxSales10 + consumptionTaxSales8;
  const totalTaxPurch  = consumptionTaxPurch10 + consumptionTaxPurch8;
  const netConsumptionTax = totalTaxSales - totalTaxPurch;

  // 課税売上割合
  const taxableRatio = totalSales > 0 ? Math.round((taxableSales10+taxableSales8)/totalSales*100) : 0;

  // 免税判定（基準期間の課税売上が1000万円以下）
  const isExempt = (a.prev_year_sales||0) <= 10000000;

  // 月別集計
  const months = Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'));
  const monthly = months.map(m => {
    const mj = J.filter(j=>j.date&&j.date.slice(5,7)===m);
    return {
      month: m,
      income:  mj.filter(j=>j.type==='income').reduce((s,j)=>s+j.amount,0),
      expense: mj.filter(j=>j.type==='expense').reduce((s,j)=>s+j.amount,0),
      tax10:   mj.filter(j=>j.tax_type==='課税').reduce((s,j)=>s+j.amount,0),
      tax8:    mj.filter(j=>j.tax_type==='課税（軽減）').reduce((s,j)=>s+j.amount,0),
      nontax:  mj.filter(j=>j.tax_type==='非課税'||j.tax_type==='不課税').reduce((s,j)=>s+j.amount,0),
    };
  });

  return {
    taxableSales10,taxableSales8,nonTaxableSales,totalSales,
    taxablePurch10,taxablePurch8,nonTaxablePurch,
    consumptionTaxSales10,consumptionTaxSales8,totalTaxSales,
    consumptionTaxPurch10,consumptionTaxPurch8,totalTaxPurch,
    netConsumptionTax,taxableRatio,isExempt,monthly,year
  };
}

function renderTax() {
  const a = accounts[currentAcct];
  const t = calcTaxSummary(a);

  document.getElementById('main-content').innerHTML = `
    <!-- ヘッダー -->
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi"><div class="kpi-label">課税売上合計</div>
        <div class="kpi-value" style="color:var(--green);font-size:18px">${fmtM(t.taxableSales10+t.taxableSales8)}</div>
        <div class="kpi-sub">課税売上割合 ${t.taxableRatio}%</div></div>
      <div class="kpi"><div class="kpi-label">課税仕入合計</div>
        <div class="kpi-value" style="color:var(--red);font-size:18px">${fmtM(t.taxablePurch10+t.taxablePurch8)}</div></div>
      <div class="kpi"><div class="kpi-label">預かり消費税</div>
        <div class="kpi-value" style="color:var(--yellow);font-size:18px">${fmtM(t.totalTaxSales)}</div></div>
      <div class="kpi"><div class="kpi-label">納付消費税（概算）</div>
        <div class="kpi-value" style="color:${t.netConsumptionTax>0?'var(--red)':'var(--green)'};font-size:18px">
          ${fmtM(Math.abs(t.netConsumptionTax))}</div>
        <div class="kpi-sub">${t.netConsumptionTax>0?'納付':'還付'}</div></div>
    </div>

    ${t.isExempt ? `<div class="alert a-green"> <strong>免税事業者</strong>（前年課税売上${fmtM(a.prev_year_sales||0)}≦1,000万円）。消費税の納付義務はありません。ただしインボイス登録している場合は課税事業者になります。</div>` :
      `<div class="alert a-yellow">! <strong>課税事業者</strong>。消費税の申告・納付が必要です。freeeの確定申告書で消費税申告書を作成してください。</div>`}

    <!-- 売上の内訳 -->
    <div class="card">
      <div class="card-title"> 売上の消費税区分内訳（${t.year}年）</div>
      <table><thead><tr><th>区分</th><th>税込金額</th><th>消費税額（逆算）</th><th>税抜金額</th><th>割合</th></tr></thead>
      <tbody>
        <tr><td><span class="tax10">課税 10%</span></td>
          <td class="mono">${t.taxableSales10.toLocaleString()}円</td>
          <td class="mono" style="color:var(--yellow)">${t.consumptionTaxSales10.toLocaleString()}円</td>
          <td class="mono">${(t.taxableSales10-t.consumptionTaxSales10).toLocaleString()}円</td>
          <td>${t.totalSales>0?Math.round(t.taxableSales10/t.totalSales*100):0}%</td></tr>
        <tr><td><span class="tax8">軽減 8%</span></td>
          <td class="mono">${t.taxableSales8.toLocaleString()}円</td>
          <td class="mono" style="color:var(--yellow)">${t.consumptionTaxSales8.toLocaleString()}円</td>
          <td class="mono">${(t.taxableSales8-t.consumptionTaxSales8).toLocaleString()}円</td>
          <td>${t.totalSales>0?Math.round(t.taxableSales8/t.totalSales*100):0}%</td></tr>
        <tr><td><span class="taxfree">非課税・不課税</span></td>
          <td class="mono">${t.nonTaxableSales.toLocaleString()}円</td>
          <td class="mono" style="color:var(--text3)">—</td>
          <td class="mono">${t.nonTaxableSales.toLocaleString()}円</td>
          <td>${t.totalSales>0?Math.round(t.nonTaxableSales/t.totalSales*100):0}%</td></tr>
        <tr style="font-weight:700;border-top:2px solid var(--border)">
          <td>合計</td>
          <td class="mono">${t.totalSales.toLocaleString()}円</td>
          <td class="mono" style="color:var(--yellow)">${t.totalTaxSales.toLocaleString()}円</td>
          <td class="mono">${(t.totalSales-t.totalTaxSales).toLocaleString()}円</td>
          <td>100%</td></tr>
      </tbody></table>
    </div>

    <!-- 仕入の内訳 -->
    <div class="card">
      <div class="card-title"> 仕入・経費の消費税区分内訳</div>
      <table><thead><tr><th>区分</th><th>税込金額</th><th>消費税額（仕入税額控除）</th><th>税抜金額</th></tr></thead>
      <tbody>
        <tr><td><span class="tax10">課税 10%</span></td>
          <td class="mono">${t.taxablePurch10.toLocaleString()}円</td>
          <td class="mono" style="color:var(--green)">▲${t.consumptionTaxPurch10.toLocaleString()}円</td>
          <td class="mono">${(t.taxablePurch10-t.consumptionTaxPurch10).toLocaleString()}円</td></tr>
        <tr><td><span class="tax8">軽減 8%</span></td>
          <td class="mono">${t.taxablePurch8.toLocaleString()}円</td>
          <td class="mono" style="color:var(--green)">▲${t.consumptionTaxPurch8.toLocaleString()}円</td>
          <td class="mono">${(t.taxablePurch8-t.consumptionTaxPurch8).toLocaleString()}円</td></tr>
        <tr><td><span class="taxfree">非課税・不課税</span></td>
          <td class="mono">${t.nonTaxablePurch.toLocaleString()}円</td>
          <td class="mono" style="color:var(--text3)">—</td>
          <td class="mono">${t.nonTaxablePurch.toLocaleString()}円</td></tr>
        <tr style="font-weight:700;border-top:2px solid var(--border)">
          <td>合計控除税額</td>
          <td class="mono">—</td>
          <td class="mono" style="color:var(--green)">▲${t.totalTaxPurch.toLocaleString()}円</td>
          <td class="mono">—</td></tr>
      </tbody></table>
    </div>

    <!-- 納付税額 -->
    <div class="card" style="border-color:${t.netConsumptionTax>0?'rgba(255,95,126,0.3)':'rgba(46,204,140,0.3)'}">
      <div class="card-title"> 消費税納付額（概算）</div>
      <div class="pl-line"><span>預かり消費税（売上分）</span><span class="mono" style="color:var(--yellow)">${t.totalTaxSales.toLocaleString()}円</span></div>
      <div class="pl-line"><span>仕入税額控除</span><span class="mono" style="color:var(--green)">▲${t.totalTaxPurch.toLocaleString()}円</span></div>
      <div class="pl-line bold sep"><span style="font-size:14px">${t.netConsumptionTax>0?'納付消費税':'還付消費税'}</span>
        <span class="mono" style="font-size:18px;color:${t.netConsumptionTax>0?'var(--red)':'var(--green)'}">${Math.abs(t.netConsumptionTax).toLocaleString()}円</span></div>
      <div class="alert a-yellow" style="margin-top:8px;font-size:11px">
        ! この金額は概算です（税込金額からの逆算）。正確な消費税額はfreeeの消費税申告書で計算してください。
        インボイス制度の経過措置（非適格仕入の${new Date()<new Date('2026-10-01')?'80%':'50%'}控除）は反映されていません。
      </div>
    </div>

    <!-- 前年課税売上設定 -->
    <div class="card">
      <div class="card-title"> 免税判定設定</div>
      <div style="display:flex;align-items:center;gap:10px;font-size:13px">
        <span style="color:var(--text2)">前年の課税売上高:</span>
        <input type="number" id="prev-sales-input" value="${a.prev_year_sales||0}"
          style="width:140px;font-family:var(--mono)" placeholder="0">
        <span style="color:var(--text3)">円</span>
        <button class="btn btn-sm btn-primary" onclick="savePrevSales()">保存</button>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:6px">1,000万円以下 = 免税事業者（消費税申告不要）</div>
    </div>

    <div class="card">
      <div class="card-title"> CSV出力</div>
      <button class="btn btn-sm" onclick="exportTaxCSV()"> 消費税集計表CSV</button>
    </div>
  `;
}

function savePrevSales() {
  const a = accounts[currentAcct];
  a.prev_year_sales = parseInt(document.getElementById('prev-sales-input').value)||0;
  save(currentAcct); renderTax();
}

function exportTaxCSV() {
  const a = accounts[currentAcct];
  const t = calcTaxSummary(a);
  const rows = [
    ['区分','税込金額','消費税額','税抜金額'],
    ['課税売上10%', t.taxableSales10, t.consumptionTaxSales10, t.taxableSales10-t.consumptionTaxSales10],
    ['課税売上8%',  t.taxableSales8,  t.consumptionTaxSales8,  t.taxableSales8-t.consumptionTaxSales8],
    ['非課税売上',  t.nonTaxableSales, 0, t.nonTaxableSales],
    ['課税仕入10%', t.taxablePurch10, t.consumptionTaxPurch10, t.taxablePurch10-t.consumptionTaxPurch10],
    ['課税仕入8%',  t.taxablePurch8,  t.consumptionTaxPurch8,  t.taxablePurch8-t.consumptionTaxPurch8],
    ['納付消費税',  '', t.netConsumptionTax, ''],
  ];
  const csv = rows.map(r=>r.map(v=>'\"'+v+'\"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a2 = document.createElement('a'); a2.href=url; a2.download=`消費税集計_${a.year}.csv`; a2.click();
  URL.revokeObjectURL(url);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 家事按分
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderKasan() {
  const a = accounts[currentAcct];
  const ks = a.kasan_settings || {};
  const J = a.journals||[];

  // 按分対象科目の集計
  const kasanCats = ['地代家賃','水道光熱費','通信費','車両費','新聞図書費'];
  const kasanData = kasanCats.map(cat => {
    const total = J.filter(j=>j.category===cat&&j.type==='expense'&&j.status==='confirmed').reduce((s,j)=>s+j.amount,0);
    const ratio = ks[cat]||0;
    const deductible = Math.floor(total * ratio / 100);
    return { cat, total, ratio, deductible };
  });
  const totalDeductible = kasanData.reduce((s,d)=>s+d.deductible,0);

  document.getElementById('main-content').innerHTML = `
    <div class="alert a-blue" style="margin-bottom:12px;font-size:12px">
       <strong>家事按分</strong>とは：自宅兼事務所の家賃・光熱費など、事業とプライベートで共用する費用を事業割合に応じて経費にする制度です。
      <strong>按分割合は合理的な基準（床面積・使用時間等）で決め、確定申告書に記載が必要です。</strong>
    </div>

    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi"><div class="kpi-label">按分後の経費合計</div>
        <div class="kpi-value" style="color:var(--green)">${fmtM(totalDeductible)}</div>
        <div class="kpi-sub">確定申告で計上可能</div></div>
      <div class="kpi"><div class="kpi-label">按分前の支出合計</div>
        <div class="kpi-value">${fmtM(kasanData.reduce((s,d)=>s+d.total,0))}</div></div>
      <div class="kpi"><div class="kpi-label">プライベート分（経費不可）</div>
        <div class="kpi-value" style="color:var(--text3)">${fmtM(kasanData.reduce((s,d)=>s+d.total,0)-totalDeductible)}</div></div>
    </div>

    <div class="card">
      <div class="card-title"> 按分割合の設定
        <button class="btn btn-sm btn-primary" onclick="saveKasanSettings()">保存して仕訳に反映</button>
      </div>
      <div class="alert a-yellow" style="font-size:11px;margin-bottom:12px">
        ! 按分割合の根拠を記録しておいてください（税務調査で問われる場合があります）。
        <strong>例：家賃→事務所面積÷総面積、光熱費→作業時間÷総時間</strong>
      </div>
      <table><thead><tr><th>科目</th><th>年間支出</th><th>按分割合（%）</th><th>経費計上額</th><th>根拠メモ</th></tr></thead>
      <tbody>
        ${kasanData.map(d=>`<tr>
          <td style="font-weight:700">${d.cat}</td>
          <td class="mono">${d.total.toLocaleString()}円</td>
          <td><div style="display:flex;align-items:center;gap:6px">
            <input type="range" id="ks-${d.cat}" min="0" max="100" value="${d.ratio}"
              oninput="document.getElementById('ks-val-${d.cat}').textContent=this.value+'%';updateKasanPreview()"
              style="width:80px">
            <span id="ks-val-${d.cat}" style="font-family:var(--mono);min-width:32px">${d.ratio}%</span>
          </div></td>
          <td class="mono" id="ks-ded-${d.cat}" style="color:var(--green)">${d.deductible.toLocaleString()}円</td>
          <td><input type="text" id="ks-note-${d.cat}" value="${ks[d.cat+'_note']||''}"
            placeholder="例: 事務所${d.cat==='地代家賃'?'30㎡÷100㎡=30%':'使用時間8h÷24h=33%'}"
            style="font-size:11px;width:180px"></td>
        </tr>`).join('')}
      </tbody></table>
    </div>

    <div class="card" id="kasan-journal-preview" style="display:none">
      <div class="card-title"> 生成される按分仕訳（プレビュー）</div>
      <div id="kasan-preview-content"></div>
    </div>

    <div class="alert a-blue" style="font-size:11px">
       <strong>確定申告書への記載方法</strong>：按分後の金額を「地代家賃」「水道光熱費」等の科目に計上してください。
      freee連携タブから仕訳を送信すると自動的に反映されます。
    </div>
  `;
}

function updateKasanPreview() {
  const cats = ['地代家賃','水道光熱費','通信費','車両費','新聞図書費'];
  const a = accounts[currentAcct];
  const J = a.journals||[];
  let total = 0;
  cats.forEach(cat => {
    const ratio = parseInt(document.getElementById('ks-'+cat)?.value||0);
    const catTotal = J.filter(j=>j.category===cat&&j.type==='expense').reduce((s,j)=>s+j.amount,0);
    const ded = Math.floor(catTotal * ratio / 100);
    total += ded;
    const dedEl = document.getElementById('ks-ded-'+cat);
    if (dedEl) dedEl.textContent = '' +ded.toLocaleString();
  });
}

function saveKasanSettings() {
  const a = accounts[currentAcct];
  if (!a.kasan_settings) a.kasan_settings = {};
  const cats = ['地代家賃','水道光熱費','通信費','車両費','新聞図書費'];
  cats.forEach(cat => {
    const ratio = parseInt(document.getElementById('ks-'+cat)?.value||0);
    const note  = document.getElementById('ks-note-'+cat)?.value||'';
    a.kasan_settings[cat] = ratio;
    a.kasan_settings[cat+'_note'] = note;
  });
  save(currentAcct);
  alert(' 按分割合を保存しました。損益計算書に自動反映されます。');
  renderKasan();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. 固定資産・減価償却台帳
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const USEFUL_LIFE = {
  'PC・サーバー': 4, 'カメラ・映像機器': 5, '家具・什器': 8,
  '自動車': 6, '軽自動車': 4, 'バイク・自転車': 3,
  '工具・機械': 7, 'ソフトウェア': 5, '建物（木造）': 22,
  '建物（RC）': 47, 'その他': 5
};

function calcYearlyDep(asset) {
  const life = asset.useful_life || USEFUL_LIFE[asset.asset_type] || 5;
  if (asset.dep_method === 'lump') {
    // 一括償却（3年均等）
    return Math.floor(asset.cost / 3);
  } else if (asset.dep_method === 'small') {
    // 少額減価償却（全額即時償却）
    return asset.cost;
  } else {
    // 定額法
    return Math.floor(asset.cost * (1/life));
  }
}

function renderAssets() {
  const a = accounts[currentAcct];
  const assets = a.fixed_assets || [];
  const year = a.year || new Date().getFullYear();
  const totalDep = assets.filter(as=>as.active!==false).reduce((s,as)=>s+calcYearlyDep(as),0);
  const totalCost = assets.reduce((s,as)=>s+as.cost,0);
  const totalBookValue = assets.reduce((s,as)=>{
    const startYear = parseInt((as.purchase_date||'').slice(0,4))||year;
    const elapsed = year - startYear;
    const life = as.useful_life || USEFUL_LIFE[as.asset_type] || 5;
    const bv = Math.max(1, as.cost - calcYearlyDep(as) * Math.min(elapsed, life));
    return s + bv;
  }, 0);

  document.getElementById('main-content').innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi"><div class="kpi-label">固定資産数</div><div class="kpi-value">${assets.length}件</div></div>
      <div class="kpi"><div class="kpi-label">取得価額合計</div><div class="kpi-value">${fmtM(totalCost)}</div></div>
      <div class="kpi"><div class="kpi-label">${year}年度 償却額</div>
        <div class="kpi-value" style="color:var(--red)">${fmtM(totalDep)}</div></div>
      <div class="kpi"><div class="kpi-label">帳簿価額合計</div>
        <div class="kpi-value" style="color:var(--yellow)">${fmtM(totalBookValue)}</div></div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="showAddAsset()">＋ 固定資産を追加</button>
      <button class="btn btn-sm" onclick="addAllDepJournals()">⚡ 今年度の償却費を一括仕訳</button>
      <button class="btn btn-sm" onclick="exportAssetsCSV()"> 固定資産台帳CSV</button>
    </div>

    ${totalDep>0?`<div class="alert a-blue"> ${year}年度の減価償却費合計: <strong>${totalDep.toLocaleString()}円</strong>
      <button class="btn btn-sm btn-primary" style="margin-left:8px" onclick="addAllDepJournals()">⚡ 一括で仕訳追加</button>
    </div>`:''}

    <div class="card">
      <div class="card-title"> 固定資産台帳</div>
      ${assets.length ? `
      <div style="overflow-x:auto">
      <table><thead><tr>
        <th>資産名</th><th>種別</th><th>取得日</th><th>取得価額</th>
        <th>償却方法</th><th>耐用年数</th><th>${year}年償却額</th><th>帳簿価額</th><th>状態</th><th></th>
      </tr></thead>
      <tbody>${assets.map(as=>{
        const life = as.useful_life || USEFUL_LIFE[as.asset_type] || 5;
        const startYear = parseInt((as.purchase_date||'').slice(0,4))||year;
        const elapsed = year - startYear;
        const yearDep = calcYearlyDep(as);
        const bookValue = Math.max(1, as.cost - yearDep * Math.min(elapsed, life));
        const depPercent = as.cost > 0 ? Math.round((as.cost-bookValue)/as.cost*100) : 0;
        const isFullyDep = elapsed >= life;
        return `<tr style="${isFullyDep?'opacity:0.6':''}">
          <td style="font-weight:700">${as.name}</td>
          <td style="font-size:11px">${as.asset_type||'—'}</td>
          <td style="font-family:var(--mono);font-size:10px">${as.purchase_date||'—'}</td>
          <td class="mono">${as.cost.toLocaleString()}円</td>
          <td style="font-size:11px">${as.dep_method==='lump'?'一括(3年)':as.dep_method==='small'?'即時償却':'定額法'}</td>
          <td style="text-align:center">${life}年</td>
          <td class="mono" style="color:${isFullyDep?'var(--text3)':'var(--red)'}">
            ${isFullyDep?'償却済':'' +yearDep.toLocaleString()}円</td>
          <td class="mono" style="color:var(--yellow)">${bookValue.toLocaleString()}円</td>
          <td>
            <div style="display:flex;align-items:center;gap:4px">
              <div style="width:40px;height:4px;background:var(--bg4);border-radius:2px">
                <div style="height:100%;background:${depPercent>=100?'var(--text3)':'var(--accent)'};width:${Math.min(100,depPercent)}%;border-radius:2px"></div>
              </div>
              <span style="font-size:10px;color:var(--text3)">${depPercent}%</span>
            </div>
          </td>
          <td><button class="btn btn-ghost btn-sm" style="font-size:9px" onclick="deleteAsset('${as.id}')">削除</button></td>
        </tr>`;
      }).join('')}</tbody></table>
      </div>` : `<div class="empty">固定資産がありません<br><button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="showAddAsset()">追加する</button></div>`}
    </div>

    <div class="alert a-blue" style="font-size:11px">
       <strong>少額減価償却資産の特例</strong>：青色申告の個人事業主は取得価額30万円未満の資産を即時全額経費計上できます（年間合計300万円まで）。
      「即時償却」を選択してください。
    </div>
  `;
}

function showAddAsset() {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" style="width:480px">
    <div class="modal-title"> 固定資産を追加</div>
    <div class="form-row"><span class="form-label">資産名</span>
      <input type="text" id="as-name" placeholder="MacBook Pro 2026"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">種別</div>
        <select id="as-type" onchange="updateUsefulLife()">
          ${Object.keys(USEFUL_LIFE).map(k=>`<option>${k}</option>`).join('')}
        </select></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">取得日</div>
        <input type="date" id="as-date" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">取得価額（円）</div>
        <input type="number" id="as-cost" placeholder="150000" oninput="suggestDepMethod()"></div>
      <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">耐用年数</div>
        <input type="number" id="as-life" value="4" min="1"></div>
    </div>
    <div><div style="font-size:11px;color:var(--text3);margin-bottom:3px">償却方法</div>
      <select id="as-method">
        <option value="straight">定額法（通常）</option>
        <option value="lump">一括償却（3年均等・10万円以上20万円未満）</option>
        <option value="small">即時償却（青色申告・30万円未満）</option>
      </select>
    </div>
    <div id="as-method-hint" class="alert a-blue" style="font-size:11px;margin-top:8px"></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn btn-primary btn-sm" onclick="addAsset(this)">追加</button>
      <button class="btn btn-ghost btn-sm" onclick="this.closest('.modal-bg').remove()">キャンセル</button>
    </div>
  </div>`;
  document.getElementById('app').appendChild(bg);
  updateUsefulLife();
}

function updateUsefulLife() {
  const type = document.getElementById('as-type')?.value;
  const lifeEl = document.getElementById('as-life');
  if (lifeEl && type) lifeEl.value = USEFUL_LIFE[type] || 5;
  suggestDepMethod();
}

function suggestDepMethod() {
  const cost = parseInt(document.getElementById('as-cost')?.value)||0;
  const hint = document.getElementById('as-method-hint');
  const method = document.getElementById('as-method');
  if (!hint || !cost) return;
  if (cost < 100000) {
    hint.innerHTML = ' 10万円未満のため<strong>消耗品費</strong>として全額即時経費計上できます（固定資産不要）。';
    hint.style.display = 'block';
  } else if (cost < 200000) {
    hint.innerHTML = ' 20万円未満のため<strong>一括償却</strong>（3年均等）が利用できます。';
    if (method) method.value = 'lump';
    hint.style.display = 'block';
  } else if (cost < 300000) {
    hint.innerHTML = ' 30万円未満のため青色申告なら<strong>即時償却</strong>（少額減価償却の特例）が使えます。';
    if (method) method.value = 'small';
    hint.style.display = 'block';
  } else {
    hint.innerHTML = ' 30万円以上のため<strong>定額法</strong>で耐用年数にわたって償却します。';
    if (method) method.value = 'straight';
    hint.style.display = 'block';
  }
}

function addAsset(btn) {
  const a = accounts[currentAcct];
  if (!a.fixed_assets) a.fixed_assets = [];
  const cost = parseInt(document.getElementById('as-cost').value)||0;
  if (cost < 100000) {
    alert('10万円未満は消耗品費として通常の経費計上をしてください。固定資産台帳への登録は不要です。');
    return;
  }
  a.fixed_assets.push({
    id: 'fa'+Date.now(),
    name: document.getElementById('as-name').value,
    asset_type: document.getElementById('as-type').value,
    purchase_date: document.getElementById('as-date').value,
    cost,
    useful_life: parseInt(document.getElementById('as-life').value)||5,
    dep_method: document.getElementById('as-method').value,
    active: true,
  });
  save(currentAcct); btn.closest('.modal-bg').remove(); renderAssets();
}

function addAllDepJournals() {
  const a = accounts[currentAcct];
  const assets = (a.fixed_assets||[]).filter(as=>as.active!==false);
  const year = a.year || new Date().getFullYear();
  let added = 0;
  assets.forEach(as => {
    const life = as.useful_life || USEFUL_LIFE[as.asset_type] || 5;
    const startYear = parseInt((as.purchase_date||'').slice(0,4))||year;
    const elapsed = year - startYear;
    if (elapsed >= life) return;
    const dep = calcYearlyDep(as);
    const alreadyExists = (a.journals||[]).some(j =>
      j.category==='減価償却費' && j.description.includes(as.name) && j.date.startsWith(String(year))
    );
    if (alreadyExists) return;
    if (!a.journals) a.journals = [];
    a.journals.push({
      id: Date.now()+Math.random(), date:`${year}-12-31`,
      description:`減価償却費 ${as.name}（${as.dep_method==='lump'?'一括償却':as.dep_method==='small'?'即時償却':'定額法'}・耐用${life}年）`,
      amount: dep, type:'expense', category:'減価償却費',
      tax_rate:0, tax_type:'不課税', status:'confirmed',
    });
    added++;
  });
  save(currentAcct); updateKPI(); renderSidebar();
  if (added === 0) alert('今年度分の減価償却費は既に登録済みです。');
  else alert(` ${added}件の減価償却仕訳を追加しました`);
  renderAssets();
}

function deleteAsset(id) {
  if (!confirm('この固定資産を削除しますか？')) return;
  const a = accounts[currentAcct];
  a.fixed_assets = (a.fixed_assets||[]).filter(as=>as.id!==id);
  save(currentAcct); renderAssets();
}

function exportAssetsCSV() {
  const a = accounts[currentAcct];
  const year = a.year || new Date().getFullYear();
  const rows = [['資産名','種別','取得日','取得価額','償却方法','耐用年数','今年度償却額','帳簿価額']];
  (a.fixed_assets||[]).forEach(as=>{
    const life = as.useful_life || USEFUL_LIFE[as.asset_type] || 5;
    const startYear = parseInt((as.purchase_date||'').slice(0,4))||year;
    const elapsed = year - startYear;
    const dep = calcYearlyDep(as);
    const bv = Math.max(1, as.cost - dep*Math.min(elapsed,life));
    rows.push([as.name, as.asset_type, as.purchase_date, as.cost,
      as.dep_method==='lump'?'一括償却':as.dep_method==='small'?'即時償却':'定額法',
      life, elapsed>=life?0:dep, bv]);
  });
  const csv = rows.map(r=>r.map(v=>'\"'+v+'\"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href=url; link.download=`固定資産台帳_${year}.csv`; link.click();
  URL.revokeObjectURL(url);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. 貸借対照表（簡易版）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function calcBS(a) {
  const J = (a.journals||[]).filter(j=>j.status==='confirmed');
  const year = a.year || new Date().getFullYear();

  // 資産の部
  const cash = (a.cash_balance||0); // 手動入力
  const bankBalance = (a.bank_balance||0); // 手動入力
  const receivables = J.filter(j=>j.type==='income'&&j.status==='confirmed').reduce((s,j)=>s+j.amount,0)
    - (a.received_amount||0); // 売上-回収済み
  const fixedAssets = (a.fixed_assets||[]).reduce((s,as)=>{
    const life = as.useful_life || USEFUL_LIFE[as.asset_type] || 5;
    const startYear = parseInt((as.purchase_date||'').slice(0,4))||year;
    const elapsed = year - startYear;
    const dep = calcYearlyDep(as);
    return s + Math.max(1, as.cost - dep*Math.min(elapsed,life));
  }, 0);
  const totalAssets = cash + bankBalance + fixedAssets;

  // 負債の部
  const payables = J.filter(j=>j.type==='expense').reduce((s,j)=>s+j.amount,0)
    - (a.paid_amount||0); // 経費-支払済み
  const loans = (a.loan_balance||0); // 手動入力
  const depositReceived = (a.tenants||[]).filter(t=>t.status==='active').reduce((s,t)=>s+(t.deposit||0),0);
  const totalLiabilities = loans + depositReceived;

  // 資本の部（事業主資本 = 資産 - 負債）
  const pl = calcPL(a);
  const ownerCapital = (a.opening_capital||0) + pl.operatingProfit;
  const totalEquity = totalAssets - totalLiabilities;

  return { cash, bankBalance, receivables, fixedAssets, totalAssets,
           payables, loans, depositReceived, totalLiabilities,
           ownerCapital, totalEquity, pl };
}

function renderBS() {
  const a = accounts[currentAcct];
  const bs = calcBS(a);

  document.getElementById('main-content').innerHTML = `
    <div class="alert a-blue" style="margin-bottom:12px;font-size:12px">
       <strong>貸借対照表</strong>は青色申告65万円控除に必要です。正確な数値は現金・預金残高を手動入力してください。
      売掛金・買掛金は仕訳データから自動集計されます。
    </div>

    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi"><div class="kpi-label">資産合計</div>
        <div class="kpi-value" style="color:var(--green)">${fmtM(bs.totalAssets)}</div></div>
      <div class="kpi"><div class="kpi-label">負債合計</div>
        <div class="kpi-value" style="color:var(--red)">${fmtM(bs.totalLiabilities)}</div></div>
      <div class="kpi"><div class="kpi-label">純資産（事業主資本）</div>
        <div class="kpi-value" style="color:var(--accent)">${fmtM(bs.totalEquity)}</div></div>
    </div>

    <!-- 残高入力 -->
    <div class="card">
      <div class="card-title"> 残高を入力（年末時点）
        <button class="btn btn-sm btn-primary" onclick="saveBSSettings()">保存</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
        ${[
          ['cash_balance','現金残高（年末）','0'],
          ['bank_balance','預金残高（年末・全口座合計）','0'],
          ['received_amount','売掛金の回収済み額','0'],
          ['paid_amount','買掛金の支払済み額','0'],
          ['loan_balance','借入金残高','0'],
          ['opening_capital','期首事業主資本','0'],
        ].map(([key,label,ph])=>`
          <div>
            <div style="font-size:11px;color:var(--text3);margin-bottom:3px">${label}</div>
            <input type="number" id="bs-${key}" value="${a[key]||0}" placeholder="${ph}"
              style="font-family:var(--mono)">
          </div>`).join('')}
      </div>
    </div>

    <!-- 貸借対照表 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <!-- 資産の部 -->
      <div class="card">
        <div class="card-title" style="color:var(--green)">資産の部</div>
        <div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:8px">【流動資産】</div>
        <div class="pl-line"><span>現金</span><span class="mono">${bs.cash.toLocaleString()}円</span></div>
        <div class="pl-line"><span>預金</span><span class="mono">${bs.bankBalance.toLocaleString()}円</span></div>
        <div class="pl-line"><span>売掛金（概算）</span><span class="mono">${Math.max(0,bs.receivables).toLocaleString()}円</span></div>
        <div style="font-size:12px;font-weight:700;color:var(--text3);margin:10px 0 6px">【固定資産】</div>
        ${(a.fixed_assets||[]).map(as=>{
          const life = as.useful_life||USEFUL_LIFE[as.asset_type]||5;
          const startYear = parseInt((as.purchase_date||'').slice(0,4))||a.year;
          const elapsed = (a.year||new Date().getFullYear())-startYear;
          const dep = calcYearlyDep(as);
          const bv = Math.max(1, as.cost - dep*Math.min(elapsed,life));
          return `<div class="pl-line"><span style="font-size:11px">${as.name}</span><span class="mono">${bv.toLocaleString()}円</span></div>`;
        }).join('')}
        <div class="pl-line bold sep"><span>資産合計</span><span class="mono" style="color:var(--green)">${bs.totalAssets.toLocaleString()}円</span></div>
      </div>
      <!-- 負債・資本の部 -->
      <div class="card">
        <div class="card-title" style="color:var(--red)">負債・純資産の部</div>
        <div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:8px">【流動負債】</div>
        <div class="pl-line"><span>買掛金（概算）</span><span class="mono">${Math.max(0,bs.payables).toLocaleString()}円</span></div>
        <div style="font-size:12px;font-weight:700;color:var(--text3);margin:10px 0 6px">【固定負債】</div>
        <div class="pl-line"><span>借入金</span><span class="mono">${bs.loans.toLocaleString()}円</span></div>
        ${bs.depositReceived>0?`<div class="pl-line"><span>敷金預り金</span><span class="mono">${bs.depositReceived.toLocaleString()}円</span></div>`:''}
        <div class="pl-line bold sep"><span>負債合計</span><span class="mono" style="color:var(--red)">${bs.totalLiabilities.toLocaleString()}円</span></div>
        <div style="font-size:12px;font-weight:700;color:var(--text3);margin:10px 0 6px">【純資産】</div>
        <div class="pl-line"><span>事業主資本（期首）</span><span class="mono">${(a.opening_capital||0).toLocaleString()}円</span></div>
        <div class="pl-line"><span>当年利益</span><span class="mono" style="color:${bs.pl.operatingProfit>=0?'var(--green)':'var(--red)'}">${bs.pl.operatingProfit.toLocaleString()}円</span></div>
        <div class="pl-line bold sep"><span>純資産合計</span><span class="mono" style="color:var(--accent)">${bs.totalEquity.toLocaleString()}円</span></div>
        <div class="pl-line bold" style="border-top:2px solid var(--accent);margin-top:4px">
          <span>負債・純資産合計</span><span class="mono" style="color:var(--accent)">${(bs.totalLiabilities+bs.totalEquity).toLocaleString()}円</span></div>
      </div>
    </div>

    <div class="alert a-yellow" style="font-size:11px">
      ! この貸借対照表は<strong>freeeへの仕訳送信後</strong>、freeeの青色申告決算書で正式なB/Sを作成してください。
      上記はfreeeに送信する前の目安として使用してください。65万円控除には複式簿記による正式なB/Sが必要です。
    </div>
    <div class="card">
      <div class="card-title"> CSV出力</div>
      <button class="btn btn-sm" onclick="exportBSCSV()"> 貸借対照表CSV</button>
    </div>
  `;
}

function saveBSSettings() {
  const a = accounts[currentAcct];
  ['cash_balance','bank_balance','received_amount','paid_amount','loan_balance','opening_capital'].forEach(key=>{
    const el = document.getElementById('bs-'+key);
    if (el) a[key] = parseInt(el.value)||0;
  });
  save(currentAcct); renderBS();
}

function exportBSCSV() {
  const a = accounts[currentAcct];
  const bs = calcBS(a);
  const rows = [
    ['区分','項目','金額'],
    ['資産','現金',bs.cash],['資産','預金',bs.bankBalance],
    ['資産','売掛金',Math.max(0,bs.receivables)],['資産','固定資産',bs.fixedAssets],
    ['資産','資産合計',bs.totalAssets],
    ['負債','買掛金',Math.max(0,bs.payables)],['負債','借入金',bs.loans],
    ['負債','負債合計',bs.totalLiabilities],
    ['純資産','事業主資本',bs.ownerCapital],['純資産','純資産合計',bs.totalEquity],
  ];
  const csv = rows.map(r=>r.map(v=>'\"'+v+'\"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href=url; link.download=`貸借対照表_${a.year||2026}.csv`; link.click();
  URL.revokeObjectURL(url);
}


// ══════════════════════════════════════════════════════════════
// プラン管理・機能表示制御
// ══════════════════════════════════════════════════════════════
const PLANS = {
  trial:     { name: 'トライアル', price: 0,    max_journals: -1,  realestate: true,  trial_days: 14 },
  solo:      { name: 'ソロ',       price: 1480, max_journals: -1,  realestate: false },
  pro:       { name: 'プロ',       price: 2980, max_journals: -1,  realestate: false },
  realestate:{ name: '不動産',     price: 2980, max_journals: -1,  realestate: true  },
  office:    { name: '事務所',     price: 9800, max_journals: -1,  realestate: true  },
};

// トライアルの残り日数を計算
function getTrialDaysLeft(email) {
  const a = accounts[email || currentAcct];
  if (!a || a.plan !== 'trial') return null;
  const start = a.trial_start ? new Date(a.trial_start) : new Date();
  const elapsed = Math.floor((new Date() - start) / (1000*60*60*24));
  return Math.max(0, 14 - elapsed);
}

// トライアル期限切れか判定
function isTrialExpired(email) {
  const a = accounts[email || currentAcct];
  if (!a) return false;
  if (a.plan !== 'trial') return false;
  const left = getTrialDaysLeft(email);
  return left !== null && left <= 0;
}

function getPlan(email) {
  const key = email || currentAcct;
  if (!key || !accounts[key]) return PLANS.free;
  const a = accounts[key];
  return PLANS[a?.plan || 'free'] || PLANS.free;
}

function hasRealEstate(email) {
  if (!email || !accounts[email]) return false;
  return getPlan(email).realestate;
}

function canAddJournal(email) {
  const plan = getPlan(email);
  if (plan.max_journals === -1) return true;
  const a = accounts[email || currentAcct];
  return (a?.journals?.length || 0) < plan.max_journals;
}

// プラン変更（設定から）
function changePlan(email, newPlan) {
  const a = accounts[email];
  if (!a) return;
  a.plan = newPlan;
  save(email);
  updateMobileNav(null);
  renderSidebar();
}

// ──  撮影メニュー ──


// ──  帳簿メニュー ──


// ──  申告メニュー ──



// ── プランアップグレード促進 ──
function showUpgradePrompt(feature) {
  const messages = {
    realestate: {
      icon: '',
      title: '不動産管理は不動産プラン専用です',
      desc: '物件管理・入居者管理・家賃自動仕訳・ローン管理・物件別損益レポートが使えます。',
      plan: '不動産プラン',
      price: '月2,980円',
    }
  };
  const m = messages[feature] || { icon:'', title:'この機能はアップグレードが必要です', desc:'', plan:'有料プラン', price:'' };
  const bg = document.createElement('div'); bg.className='modal-bg';
  bg.innerHTML = `<div class="modal" style="text-align:center;padding:32px 24px">
    <div style="font-size:48px;margin-bottom:12px">${m.icon}</div>
    <div style="font-size:18px;font-weight:900;margin-bottom:8px">${m.title}</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:20px;line-height:1.6">${m.desc}</div>
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:20px">
      <div style="font-size:11px;color:var(--text3)">必要なプラン</div>
      <div style="font-size:20px;font-weight:900;color:var(--accent)">${m.plan}</div>
      <div style="font-size:14px;color:var(--text2)">${m.price}</div>
    </div>
    <div style="display:flex;gap:8px;justify-content:center">
      <button onclick="this.closest('.modal-bg').remove()" class="btn btn-ghost btn-sm">閉じる</button>
      <button onclick="this.closest('.modal-bg').remove();alert('準備中：Stripeで課金後にプランが切り替わります')" class="btn btn-primary btn-sm">プランを変更する</button>
    </div>
    <div style="font-size:10px;color:var(--text3);margin-top:12px">
      ※現在β版のため、プランの変更は運営に直接お問い合わせください
    </div>
  </div>`;
  document.getElementById('app').appendChild(bg);
}


// ══════════════════════════════════════════════════════════════
//  認証システム（Supabase Auth + パスキー / WebAuthn）
// ══════════════════════════════════════════════════════════════

const AUTH_KEY = 'ninja_auth_user';
let authUser = null; // { id, email, name }

// ── 認証状態の初期化 ──
async function initAuth() {
  // Supabase未設定 → 必ずβ版モード（招待コード）で起動
  const stored = sessionStorage.getItem('ninja_choba_auth');
  if (stored === '1') {
    unlockApp();
    return;
  }
  // β版アクセス欄を表示
  document.getElementById('pw-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('beta-access').style.display = 'block';
  document.getElementById('auth-form-login').style.display = 'none';
  document.getElementById('auth-form-signup').style.display = 'none';
  const tabs = document.querySelectorAll('[id^="auth-tab-"]');
  tabs.forEach(el => el.style.display = 'none');
  setTimeout(() => {
    const el = document.getElementById('pw-input');
    if (el) el.focus();
  }, 200);
}
// ══════════════════════════════════════════════════════════════
//  パスキー / WebAuthn
// ══════════════════════════════════════════════════════════════

const PASSKEY_KEY = 'ninja_passkey_cred';

// パスキーが使えるか確認
async function checkPasskeyAvailable() {
  if (!window.PublicKeyCredential) return;
  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    const stored = localStorage.getItem(PASSKEY_KEY);
    if (available && stored) {
      // 登録済み → ボタンを表示
      const btn = document.getElementById('passkey-btn');
      const div = document.getElementById('passkey-divider');
      if (btn) btn.style.display = 'block';
      if (div) div.style.display = 'block';
    }
  } catch(e) {}
}

// ログイン後にパスキー登録を促す
function offerPasskeyRegistration() {
  if (!window.PublicKeyCredential) return;
  const stored = localStorage.getItem(PASSKEY_KEY);
  if (stored) return; // 既に登録済み

  PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(available => {
    if (!available) return;
    const bg = document.createElement('div'); bg.className='modal-bg';
    bg.innerHTML = `<div class="modal" style="text-align:center;padding:28px 24px;max-width:300px">
      <div style="font-size:40px;margin-bottom:12px"></div>
      <div style="font-size:16px;font-weight:900;margin-bottom:8px">次回からFace ID / 指紋で入れます</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:20px;line-height:1.6">
        パスキーを登録すると、パスワードを入力しなくても生体認証で忍者帳場に入れます。
      </div>
      <button onclick="registerPasskey();this.closest('.modal-bg').remove()"
        style="width:100%;padding:12px;background:linear-gradient(135deg,#7c6fff,#3d2fff);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:8px;font-family:var(--font)">
         パスキーを登録する
      </button>
      <button onclick="this.closest('.modal-bg').remove()"
        style="width:100%;padding:10px;background:transparent;border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--text3);cursor:pointer;font-family:var(--font)">
        今はしない
      </button>
    </div>`;
    document.getElementById('app').appendChild(bg);
  });
}

// パスキーを登録
async function registerPasskey() {
  if (!authUser) return;
  try {
    const userId = new TextEncoder().encode(authUser.id.replace(/-/g,'').slice(0,16));
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: '忍者帳場', id: location.hostname },
        user: { id: userId, name: authUser.email, displayName: authUser.name || authUser.email },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000,
      }
    });

    // 認証情報を保存（credentialIdをlocalStorageに）
    const credId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
    localStorage.setItem(PASSKEY_KEY, JSON.stringify({
      credId,
      email: authUser.email,
      created: new Date().toISOString()
    }));

    // ボタンを表示
    const btn = document.getElementById('passkey-btn');
    const div = document.getElementById('passkey-divider');
    if (btn) btn.style.display = 'block';
    if (div) div.style.display = 'block';

    // 成功トースト
    const toast = document.createElement('div');
    toast.style.cssText='position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(46,204,140,0.95);color:#fff;padding:10px 20px;border-radius:99px;font-size:12px;font-weight:700;z-index:9999;white-space:nowrap';
    toast.textContent = ' パスキーを登録しました。次回からFace ID / 指紋で入れます';
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(), 3000);

  } catch(e) {
    if (e.name !== 'NotAllowedError') {
      alert('パスキーの登録に失敗しました: ' + e.message);
    }
  }
}

// パスキーでログイン
async function loginWithPasskey() {
  const stored = localStorage.getItem(PASSKEY_KEY);
  if (!stored) return;
  const { credId, email } = JSON.parse(stored);

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const rawId = Uint8Array.from(atob(credId), c => c.charCodeAt(0));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: rawId, type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      }
    });

    if (assertion) {
      // 認証成功 → メール+保存済みトークンでセッション復元
      const token = getStoredToken();
      if (token) {
        // トークンでユーザー情報取得
        const res = await fetch('/api/supabase?path=/auth/v1/user', {
          headers: { 'apikey': SB.key, 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
          const user = await res.json();
          if (user?.id) {
            authUser = { id: user.id, email: user.email, name: user.user_metadata?.name || email };
            unlockApp();
            return;
          }
        }
      }
      // トークン切れ → パスワード再入力を促す
      const errEl = document.getElementById('auth-error');
      errEl.textContent = 'セッションが切れました。パスワードで再ログインしてください。';
      errEl.style.display = 'block';
    }
  } catch(e) {
    if (e.name !== 'NotAllowedError') {
      // console.log('Passkey error:', e.message);
    }
  }
}

// パスキーを削除
function removePasskey() {
  localStorage.removeItem(PASSKEY_KEY);
  const btn = document.getElementById('passkey-btn');
  const div = document.getElementById('passkey-divider');
  if (btn) btn.style.display = 'none';
  if (div) div.style.display = 'none';
  alert('パスキーを削除しました。');
}


function applyJournalFilter() {
  const word = document.getElementById('j-filter-word')?.value || '';
  const cat  = document.getElementById('j-filter-cat')?.value  || '';
  const type = document.getElementById('j-filter-type')?.value || '';
  renderJournal(cat, word, type);
}

function exportJournalCSV() {
  const a = accounts[currentAcct];
  const rows = [['日付','摘要','勘定科目','税区分','税率','金額','区分','状態','判定フェーズ']];
  (a.journals||[]).slice().reverse().forEach(j => {
    rows.push([j.date, j.description, j.category, j.tax_type, j.tax_rate||'', j.amount,
      j.type==='income'?'収入':'支出', j.status, j.phase||'']);
  });
  const csv = rows.map(r=>r.map(v=>'"'+v+'"').join(',')).join('\n');
  const blob = new Blob(['﻿'+csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href=url; link.download=`仕訳帳_${a.year||new Date().getFullYear()}.csv`;
  link.click(); URL.revokeObjectURL(url);
}


// ══════════════════════════════════════════════════════════════
//  スマートオンボーディング
// レシート枚数に応じてメッセージを切り替える
// ══════════════════════════════════════════════════════════════

function getOnboardingState(a) {
  const receiptCount = (a.receipts || []).length;
  const journalCount = (a.journals || []).length;
  const hasFreee     = a.freee_config?.connected;
  const hasBudget    = Object.keys(a.budgets || {}).length > 0;

  if (receiptCount === 0 && journalCount === 0) {
    return 'new';          // 完全初回
  } else if (receiptCount < 5) {
    return 'beginner';     // 使い始め（1〜4枚）
  } else if (receiptCount < 20) {
    return 'growing';      // 成長中（5〜19枚）
  } else if (!hasFreee) {
    return 'ready_freee';  // 20枚超えたのにfreee未連携
  } else if (!hasBudget) {
    return 'ready_budget'; // freee連携済み・予算未設定
  } else {
    return 'pro';          // フル活用中
  }
}

function getOnboardingMessage(a) {
  const state = getOnboardingState(a);
  const receiptCount = (a.receipts || []).length;
  const journalCount = (a.journals || []).length;

  const messages = {
    new: {
      icon: '',
      title: 'まずレシートを撮ってみましょう',
      desc: '撮影するだけでAIが自動で仕訳します。難しい操作は一切不要です。',
      action: 'レシートを撮影する',
      actionFn: "showCaptureMenu()",
      color: 'var(--accent)',
      bg: 'rgba(124,111,255,0.08)',
      border: 'rgba(124,111,255,0.25)',
    },
    beginner: {
      icon: '',
      title: `${receiptCount}枚登録できました！順調です`,
      desc: 'レシートを撮り続けると、AIがあなたのパターンを学習して精度が上がります。',
      action: '続けてレシートを撮る',
      actionFn: "showCaptureMenu()",
      color: 'var(--green)',
      bg: 'rgba(46,204,140,0.06)',
      border: 'rgba(46,204,140,0.2)',
    },
    growing: {
      icon: '',
      title: `${receiptCount}枚・${journalCount}件の仕訳が蓄積されています`,
      desc: '損益計算書で今月の収支を確認してみましょう。freeeと連携すると確定申告まで完結します。',
      action: '損益計算書を見る',
      actionFn: "mobileTab('pl')",
      color: 'var(--blue)',
      bg: 'rgba(77,159,255,0.06)',
      border: 'rgba(77,159,255,0.2)',
    },
    ready_freee: {
      icon: '',
      title: 'freeeと連携して確定申告を完結させましょう',
      desc: `${receiptCount}枚のレシートが蓄積されました。freeeに仕訳を送信すれば確定申告書が自動で作成されます。`,
      action: 'freeeと連携する',
      actionFn: "mobileTab('freee')",
      color: 'var(--yellow)',
      bg: 'rgba(255,204,68,0.06)',
      border: 'rgba(255,204,68,0.2)',
    },
    ready_budget: {
      icon: '',
      title: '予算を設定して経費をコントロールしましょう',
      desc: '予算を設定すると、超過しそうな科目をアラートでお知らせします。',
      action: '予算を設定する',
      actionFn: "mobileTab('budget')",
      color: 'var(--green)',
      bg: 'rgba(46,204,140,0.06)',
      border: 'rgba(46,204,140,0.2)',
    },
    pro: {
      icon: null, // メッセージ非表示
      title: null,
    },
  };

  return messages[state] || messages.new;
}

function renderOnboardingBanner(a) {
  const msg = getOnboardingMessage(a);
  if (!msg.icon || !msg.title) return ''; // proは非表示

  return `<div style="background:${msg.bg};border:1px solid ${msg.border};border-radius:12px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:12px">
    <div style="font-size:28px;flex-shrink:0">${msg.icon}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:13px;font-weight:700;color:${msg.color};margin-bottom:2px">${msg.title}</div>
      <div style="font-size:11px;color:var(--text2);line-height:1.5">${msg.desc}</div>
    </div>
    <button onclick="${msg.actionFn}"
      style="flex-shrink:0;padding:7px 12px;background:${msg.color};color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);white-space:nowrap">
      ${msg.action}
    </button>
  </div>`;
}


// ══════════════════════════════════════════════════════════════
// 未定義関数の補完
// ══════════════════════════════════════════════════════════════

// ── ログアウト ──
async function doLogout() {
  sessionStorage.removeItem(PW_KEY);
  try { if (SB.client) await SB.client.auth.signOut(); } catch(e) {}
  location.reload();
}

// ── 物件書類スキャン（不動産） ──
async function scanPropertyDoc(e, source) {
  const file = e.target.files[0]; if (!file) return;
  const propForm = document.getElementById('prop-form-status');
  if (propForm) {
    propForm.style.display = 'block';
    propForm.innerHTML = '<div style="padding:8px;font-size:12px;color:var(--blue)"> 書類を読み取り中...</div>';
  }
  try {
    const b64 = await fileToBase64(file);
    const isPDF = file.type === 'application/pdf';
    const block = isPDF
      ? {type:'document', source:{type:'base64', media_type:'application/pdf', data:b64}}
      : {type:'image', source:{type:'base64', media_type:file.type, data:b64}};

    const res = await fetch('/api/claude', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model: MODEL, max_tokens: 1000,
        messages:[{role:'user', content:[block, {type:'text', text:`この不動産関連書類を読み取りJSONのみ返してください。
{"name":"物件名","type":"マンション/アパート/戸建等","address":"住所","structure":"構造(RC/木造等)","built":"YYYY-MM-DD","acquisition_date":"YYYY-MM-DD","acquisition_cost":取得価額,"land_cost":土地,"building_cost":建物,"total_units":総戸数,"floors":階数,"notes":"備考"}`}]}]})
    });
    const d = await res.json();
    const raw = d.content[0].text.replace(/\`\`\`json|\`\`\`/g,'').trim();
    const p = JSON.parse(raw);
    // フォームに自動入力
    const setVal = (id, val) => { const el=document.getElementById(id); if(el&&val!=null) el.value=val; };
    setVal('p-name', p.name);
    setVal('p-type', p.type);
    setVal('p-address', p.address);
    setVal('p-structure', p.structure);
    setVal('p-built', p.built);
    setVal('p-acq-date', p.acquisition_date);
    setVal('p-acq-cost', p.acquisition_cost);
    setVal('p-land', p.land_cost);
    setVal('p-building', p.building_cost);
    setVal('p-units', p.total_units);
    setVal('p-floors', p.floors);
    setVal('p-notes', p.notes);
    if (propForm) propForm.innerHTML = '<div style="padding:8px;font-size:12px;color:var(--green)"> 書類を読み取りました。内容を確認してください。</div>';
  } catch(err) {
    if (propForm) propForm.innerHTML = '<div style="padding:8px;font-size:12px;color:var(--red)"> 読み取り失敗。手動で入力してください。</div>';
  }
}

// ── 管理会社レポート読込（不動産） ──
function showMgmtReportUpload() {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = '<div class="modal" style="width:420px">'
    + '<div class="modal-title"> 管理会社レポートを読み込む</div>'
    + '<div class="alert a-blue" style="font-size:11px;margin-bottom:12px">管理会社から届いた月次レポート（PDF・画像）をアップロードすると、家賃収入・管理費・修繕費などを自動で仕訳します。</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:12px">'
    + '<label style="cursor:pointer;flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:14px;border-radius:var(--radius);background:linear-gradient(135deg,var(--accent2),#3d2fff);color:#fff;font-size:12px;font-weight:700">'
    + ' カメラで撮影<input type="file" accept="image/*" capture="environment" style="display:none" onchange="parseMgmtReport(this)"></label>'
    + '<label style="cursor:pointer;flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:14px;border-radius:var(--radius);background:var(--bg4);border:1px solid var(--border2);color:var(--text2);font-size:12px">'
    + ' ファイル選択<input type="file" accept="image/*,.pdf" style="display:none" onchange="parseMgmtReport(this)"></label></div>'
    + '<div id="mgmt-report-status" style="display:none"></div>'
    + '<button onclick="this.closest(\'.modal-bg\').remove()" class="btn btn-ghost btn-sm" style="width:100%">閉じる</button></div>';
  document.getElementById('app').appendChild(bg);
}

async function parseMgmtReport(input) {
  const file = input.files[0]; if (!file) return;
  const statusEl = document.getElementById('mgmt-report-status');
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.innerHTML = '<div style="padding:8px;font-size:12px;color:var(--blue)"> レポートを解析中...</div>';
  }
  try {
    const b64 = await fileToBase64(file);
    const isPDF = file.type === 'application/pdf';
    const block = isPDF
      ? {type:'document', source:{type:'base64', media_type:'application/pdf', data:b64}}
      : {type:'image', source:{type:'base64', media_type:file.type, data:b64}};
    const res = await fetch('/api/claude', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model: MODEL, max_tokens: 1500,
        messages:[{role:'user', content:[block, {type:'text', text:'この管理会社月次レポートを読み取り、以下のJSON形式で返してください。\n{"month":"YYYY-MM","items":[{"date":"YYYY-MM-DD","description":"摘要","amount":金額,"type":"income/expense","category":"勘定科目"}]}'}]}]})
    });
    const d = await res.json();
    const raw = d.content[0].text.replace(/\`\`\`json|\`\`\`/g,'').trim();
    const report = JSON.parse(raw);
    const a = accounts[currentAcct]; if(!a.journals) a.journals=[];
    let added = 0;
    (report.items||[]).forEach(item => {
      a.journals.push({
        id: Date.now()+Math.random(), date: item.date, description: item.description,
        amount: item.amount, type: item.type||'income', category: item.category||'売上高',
        tax_rate: 10, tax_type: '課税', status: 'confirmed', phase: 'phase2',
        income_type: 'realestate',
      });
      added++;
    });
    save(currentAcct); updateKPI(); renderSidebar();
    if (statusEl) statusEl.innerHTML = '<div style="padding:8px;font-size:12px;color:var(--green)"> ' + added + '件の仕訳を追加しました（' + (report.month||'') + '）</div>';
    input.closest('.modal-bg')?.remove();
    if (added > 0) renderRealEstate();
  } catch(err) {
    if (statusEl) statusEl.innerHTML = '<div style="padding:8px;font-size:12px;color:var(--red)"> 読み取り失敗</div>';
  }
}


// ══════════════════════════════════════════════════════════════
// デモ版統合: ロール・アラート・整えるUX・トースト
// ══════════════════════════════════════════════════════════════

// ── ロール管理 ──


function setUserRole(email, role) {
  const a = accounts[email || currentAcct];
  if (a) { a.role = role; save(email || currentAcct); }
}

// ── アラート自動検出（未入力・未確認を自動で洗い出す） ──
function detectAlerts(a) {
  if (!a) return [];
  var alerts = [];
  var J = a.journals || [];
  var R = a.receipts || [];

  // 要確認仕訳
  var ambiguous = J.filter(function(j){ return j.status === 'ambiguous'; });
  if (ambiguous.length > 0) {
    alerts.push({ type: 'warning', icon: '!', text: ambiguous.length + '件の仕訳を整える必要があります', action: "switchTab('review')", actionText: '整える' });
  }

  // 判断待ち
  var pending = (a.pending || []).filter(function(p){ return p.status === 'pending'; });
  if (pending.length > 0) {
    alerts.push({ type: 'warning', icon: '', text: pending.length + '件が判断待ちです', action: "switchTab('review')", actionText: '確認する' });
  }

  // 未払い請求書
  var unpaid = (a.invoices || []).filter(function(i){ return i.status === 'unpaid'; });
  if (unpaid.length > 0) {
    var total = unpaid.reduce(function(s,i){ return s + i.amount; }, 0);
    alerts.push({ type: 'info', icon: '', text: '未払い請求書 ' + unpaid.length + '件（' + total.toLocaleString() + '円）', action: "switchTab('invoices')", actionText: '確認する' });
  }

  // freee未連携
  if (!a.freee_config || !a.freee_config.connected) {
    if (J.length >= 20) {
      alerts.push({ type: 'suggestion', icon: '', text: 'freeeと連携すると確定申告が楽になります', action: "switchTab('freee')", actionText: '連携する' });
    }
  }

  // 空室アラート（不動産）
  if (typeof hasRealEstate === 'function' && hasRealEstate(currentAcct)) {
    var tenants = a.tenants || [];
    var vacant = tenants.filter(function(t){ return t.status === 'vacant'; });
    if (vacant.length > 0) {
      alerts.push({ type: 'warning', icon: '', text: vacant.length + '室が空室です', action: "switchTab('realestate')", actionText: '確認する' });
    }
  }

  // 予算超過
  var year = a.year || new Date().getFullYear();
  var month = String(new Date().getMonth() + 1).padStart(2, '0');
  var budgets = a.budgets || {};
  var monthKey = year + '-' + month;
  for (var cat in budgets) {
    if (cat.includes('_note')) continue;
    var budgetAmt = budgets[cat];
    if (!budgetAmt) continue;
    var spent = J.filter(function(j){ return j.category === cat && j.date && j.date.slice(5,7) === month; })
                  .reduce(function(s,j){ return s + j.amount; }, 0);
    if (spent > budgetAmt) {
      alerts.push({ type: 'warning', icon: '', text: cat + 'が予算超過（' + (spent - budgetAmt).toLocaleString() + '超）', action: "switchTab('budget')", actionText: '確認する' });
    }
  }

  return alerts;
}

function renderAlertsCard(a) {
  var alerts = detectAlerts(a);
  if (alerts.length === 0) {
    return '<div style="background:rgba(46,204,140,0.08);border:1px solid rgba(46,204,140,0.2);border-radius:var(--radius);padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:10px">'
      + '<span style="font-size:20px"></span>'
      + '<div style="font-size:13px;color:var(--green);font-family:var(--serif)">すべて整っています</div>'
      + '</div>';
  }
  return '<div class="card" style="border-color:rgba(255,204,68,0.3)">'
    + '<div class="card-title" style="color:var(--yellow)">整えておきたいこと（' + alerts.length + '件）</div>'
    + alerts.map(function(al){
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">'
          + '<span style="font-size:18px">' + al.icon + '</span>'
          + '<div style="flex:1;font-size:12px;color:var(--text2)">' + al.text + '</div>'
          + '<button onclick="' + al.action + '" style="padding:5px 10px;background:var(--bg4);border:1px solid var(--border2);border-radius:var(--radius-sm);font-size:11px;color:var(--accent);cursor:pointer;font-family:var(--font);white-space:nowrap">' + al.actionText + '</button>'
          + '</div>';
      }).join('')
    + '</div>';
}

// ── 統一トースト通知 ──
function showToast(message, type) {
  type = type || 'success';
  var colors = {
    success: 'linear-gradient(135deg,rgba(46,204,140,0.97),rgba(30,160,100,0.97))',
    warning: 'linear-gradient(135deg,rgba(255,204,68,0.97),rgba(220,170,30,0.97))',
    error:   'linear-gradient(135deg,rgba(255,95,126,0.97),rgba(200,60,90,0.97))',
    info:    'linear-gradient(135deg,rgba(124,111,255,0.97),rgba(90,79,255,0.97))',
  };
  var textColor = type === 'warning' ? '#1b1b1b' : '#fff';
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);'
    + 'background:' + (colors[type] || colors.success) + ';color:' + textColor + ';'
    + 'padding:11px 22px;border-radius:99px;font-size:13px;font-weight:700;font-family:var(--serif);'
    + 'z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.4);white-space:nowrap;pointer-events:none;'
    + 'animation:fadeInUp 0.3s ease';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function(){
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(function(){ toast.remove(); }, 300);
  }, 2500);
}


// ══════════════════════════════════════════════════════════════
//  alert_flags + 整えるUX + role設計 + status遷移
// ══════════════════════════════════════════════════════════════

// ── 1. alert_flags 自動生成 ──
function buildAlertFlags(journal) {
  const flags = [];
  if (!journal.amount || journal.amount <= 0)    flags.push('missing_amount');
  if (!journal.category || journal.category === '?') flags.push('missing_category');
  if (!journal.date)                              flags.push('missing_date');
  if (journal.confidence === 'low')               flags.push('ai_low_confidence');
  if (journal.status === 'ambiguous')             flags.push('needs_review');
  // 給与・外注系は支払先チェック
  const payrollCats = ['給与賃金','外注費','支払報酬料'];
  if (payrollCats.includes(journal.category) && !journal.payee) flags.push('missing_payee');
  return flags;
}

function normalizeJournal(journal) {
  const alertFlags = buildAlertFlags(journal);
  return {
    ...journal,
    alertFlags,
    hasAlert: alertFlags.length > 0,
    status: alertFlags.length === 0 && journal.status === 'ambiguous' ? 'confirmed' : journal.status,
  };
}

// 整えるUXのラベル
const ALERT_LABELS = {
  missing_amount:     '金額が未設定です',
  missing_category:   '科目が未設定です',
  missing_date:       '日付が未設定です',
  ai_low_confidence:  'AI判定の確信度が低めです',
  needs_review:       '内容の確認をお願いします',
  missing_payee:      '支払先が未設定です',
};

function getAlertLabel(flag) {
  return ALERT_LABELS[flag] || flag;
}

// alert_flagsのグループ集計
function groupAlertFlags(journals) {
  const counts = {};
  Object.keys(ALERT_LABELS).forEach(k => counts[k] = 0);
  for (const j of journals) {
    for (const flag of (j.alertFlags || [])) {
      if (counts[flag] !== undefined) counts[flag]++;
    }
  }
  return counts;
}

// ── 2. status遷移管理 ──
// unconfirmed → confirmed → ready_for_freee → sent_to_freee
const STATUS_LABELS = {
  unconfirmed:    { label: '未確認',       color: 'var(--yellow)',  next: 'confirmed' },
  confirmed:      { label: '確認済み',     color: 'var(--green)',   next: 'ready_for_freee' },
  ambiguous:      { label: '要確認',       color: 'var(--yellow)',  next: 'confirmed' },
  pending:        { label: '判断待ち',     color: 'var(--red)',     next: 'confirmed' },
  ready_for_freee:{ label: 'freee送信待ち',color: 'var(--blue)',    next: 'sent_to_freee' },
  sent_to_freee:  { label: 'freee送信済み',color: 'var(--text3)',   next: null },
  excluded:       { label: '除外',         color: 'var(--text3)',   next: null },
};

function getStatusLabel(status) {
  return STATUS_LABELS[status]?.label || status;
}

function getStatusColor(status) {
  return STATUS_LABELS[status]?.color || 'var(--text3)';
}

function advanceStatus(journalId) {
  const a = accounts[currentAcct];
  const j = (a.journals || []).find(j => String(j.id) === String(journalId));
  if (!j) return;
  const next = STATUS_LABELS[j.status]?.next;
  if (next) {
    j.status = next;
    // alert_flagsを再計算
    const updated = normalizeJournal(j);
    j.alertFlags = updated.alertFlags;
    j.hasAlert = updated.hasAlert;
    save(currentAcct);
    updateKPI();
    renderSidebar();
  }
}

// ── 3. role設計 ──
const ROLES = {
  admin:      { name: '管理者',   icon: '', desc: '全機能・全事業者を管理',    color: 'var(--accent)' },
  user:       { name: '利用者',   icon: '', desc: 'レシート撮影・仕訳入力',     color: 'var(--green)' },
  accountant: { name: '税理武士', icon: '', desc: '帳簿確認・freee送信',        color: 'var(--yellow)' },
};

function getCurrentRole() {
  const a = accounts[currentAcct];
  return a?.role || 'user';
}

function setRole(email, role) {
  if (!accounts[email]) return;
  accounts[email].role = role;
  save(email);
  updateRoleUI();
}

function updateRoleUI() {
  const role = getCurrentRole();
  const roleInfo = ROLES[role] || ROLES.user;
  // ロール表示バッジを更新（あれば）
  const el = document.getElementById('role-badge');
  if (el) {
    el.textContent = roleInfo.icon + ' ' + roleInfo.name;
    el.style.color = roleInfo.color;
  }
}

// ── 4. 「帳場で確認」画面 ──
function renderHojoConfirm() {
  const a = accounts[currentAcct];
  const journals = (a.journals || []).map(normalizeJournal);
  const grouped = groupAlertFlags(journals.filter(j => j.status !== 'sent_to_freee'));

  const needsAttention = journals.filter(j => j.hasAlert);
  const readyForFreee  = journals.filter(j => j.status === 'ready_for_freee');
  const confirmed      = journals.filter(j => j.status === 'confirmed' && !j.hasAlert);

  document.getElementById('main-content').innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi" style="cursor:pointer" onclick="filterJournalsByFlag('needs_attention')">
        <div class="kpi-label">整えが必要</div>
        <div class="kpi-value" style="color:${needsAttention.length>0?'var(--yellow)':'var(--green)'}">${needsAttention.length}件</div>
        <div class="kpi-sub">${needsAttention.length>0?'タップして確認':'すべて整っています'}</div>
      </div>
      <div class="kpi" style="cursor:pointer" onclick="filterJournalsByFlag('ready_for_freee')">
        <div class="kpi-label">freee送信待ち</div>
        <div class="kpi-value" style="color:var(--blue)">${readyForFreee.length}件</div>
        <div class="kpi-sub">確認済みの仕訳</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">確認済み</div>
        <div class="kpi-value" style="color:var(--green)">${confirmed.length}件</div>
        <div class="kpi-sub">整い済み</div>
      </div>
    </div>

    ${needsAttention.length > 0 ? `
    <div class="card" style="border-color:rgba(255,204,68,0.3)">
      <div class="card-title"> 整えておきたいところ
        <span style="font-size:11px;color:var(--text3);font-weight:400">— タップして整えられます</span>
      </div>
      ${Object.entries(grouped).filter(([,count]) => count > 0).map(([flag, count]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="filterJournalsByFlag('${flag}')">
          <span style="font-size:13px;color:var(--text2)">${getAlertLabel(flag)}</span>
          <span style="background:rgba(255,204,68,0.15);color:var(--yellow);padding:2px 10px;border-radius:99px;font-size:12px;font-weight:700">${count}件</span>
        </div>
      `).join('')}
    </div>` : `
    <div class="alert a-green"> すべての仕訳が整っています</div>`}

    ${readyForFreee.length > 0 ? `
    <div class="card" style="border-color:rgba(77,159,255,0.3)">
      <div class="card-title"> freeeへ送信できる仕訳
        <button class="btn btn-primary btn-sm" onclick="mobileTab('freee')">送信する</button>
      </div>
      <div style="font-size:13px;color:var(--text2)">${readyForFreee.length}件の仕訳がfreee送信待ちです。freee連携タブから一括送信できます。</div>
    </div>` : ''}

    <div class="card">
      <div class="card-title"> 仕訳の状態別一覧</div>
      ${Object.entries(STATUS_LABELS).map(([status, info]) => {
        const count = journals.filter(j => j.status === status).length;
        if (count === 0) return '';
        return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">'
          + '<span style="color:' + info.color + ';font-size:12px">' + info.label + '</span>'
          + '<span style="font-size:12px;font-weight:700">' + count + '件</span></div>';
      }).join('')}
    </div>
  `;
}

function filterJournalsByFlag(flag) {
  // 仕訳帳に移動してフィルターをかける
  if (flag === 'ready_for_freee') {
    switchTab('journal');
    setTimeout(() => {
      const sel = document.getElementById('j-filter-type');
      // statusフィルターは別途追加
    }, 100);
  } else {
    switchTab('journal');
  }
}

// 既存のjournalにalert_flagsを付与してからsave
function refreshAlertFlags(email) {
  const a = accounts[email || currentAcct];
  if (!a || !a.journals) return;
  a.journals = a.journals.map(normalizeJournal);
  save(email || currentAcct);
}


// ══════════════════════════════════════════════════════════════
//  クレジットカードCSVインポート
// 対応：楽天・三井住友・三菱UFJ・PayPay・アメックス・JCB・イオン・エポス
// ══════════════════════════════════════════════════════════════

const CARD_FORMATS = {
  rakuten: {
    name: '楽天カード',
    icon: '',
    detect: (headers) => headers.some(h => h.includes('利用日') || h.includes('利用店名・商品名')),
    parse: (row, headers) => {
      const get = (keys) => { for(const k of keys){ const i=headers.findIndex(h=>h.includes(k)); if(i>=0&&row[i]) return row[i].trim(); } return ''; };
      const dateRaw = get(['利用日']);
      const date = dateRaw.replace(/\//g,'-').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, (_,y,m,d)=>`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
      const desc = get(['利用店名・商品名','利用店名']);
      const amtRaw = get(['利用金額(円)','利用金額','請求金額']);
      const amount = parseInt(amtRaw.replace(/[,，¥円\s]/g,'')) || 0;
      return { date, description: desc, amount, type: 'expense' };
    }
  },
  smbc: {
    name: '三井住友カード',
    icon: '',
    detect: (headers) => headers.some(h => h.includes('お支払い金額') || h.includes('ご利用日') && h.length < 10),
    parse: (row, headers) => {
      const get = (keys) => { for(const k of keys){ const i=headers.findIndex(h=>h.includes(k)); if(i>=0&&row[i]) return row[i].trim(); } return ''; };
      const dateRaw = get(['ご利用日']);
      const date = dateRaw.replace(/\//g,'-').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, (_,y,m,d)=>`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
      const desc = get(['ご利用先','利用先']);
      const amtRaw = get(['お支払い金額','ご利用金額','金額']);
      const amount = parseInt(amtRaw.replace(/[,，¥円\s]/g,'')) || 0;
      return { date, description: desc, amount, type: 'expense' };
    }
  },
  mufg: {
    name: '三菱UFJカード',
    icon: '',
    detect: (headers) => headers.some(h => h.includes('お支払金額') || h.includes('ご利用金額') && headers.some(h2=>h2.includes('取引日'))),
    parse: (row, headers) => {
      const get = (keys) => { for(const k of keys){ const i=headers.findIndex(h=>h.includes(k)); if(i>=0&&row[i]) return row[i].trim(); } return ''; };
      const dateRaw = get(['取引日','ご利用日']);
      const date = dateRaw.replace(/\//g,'-').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, (_,y,m,d)=>`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
      const desc = get(['ご利用先名','利用先','摘要']);
      const amtRaw = get(['お支払金額','ご利用金額','金額(円)']);
      const amount = parseInt(amtRaw.replace(/[,，¥円\s]/g,'')) || 0;
      return { date, description: desc, amount, type: 'expense' };
    }
  },
  paypay: {
    name: 'PayPayカード',
    icon: '',
    detect: (headers) => headers.some(h => h.includes('利用日') && headers.some(h2=>h2.includes('利用金額') || h2.includes('支払金額'))),
    parse: (row, headers) => {
      const get = (keys) => { for(const k of keys){ const i=headers.findIndex(h=>h.includes(k)); if(i>=0&&row[i]) return row[i].trim(); } return ''; };
      const dateRaw = get(['利用日']);
      const date = dateRaw.replace(/\//g,'-').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, (_,y,m,d)=>`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
      const desc = get(['利用店舗','加盟店名','利用先']);
      const amtRaw = get(['利用金額','支払金額','請求金額']);
      const amount = parseInt(amtRaw.replace(/[,，¥円\s]/g,'')) || 0;
      return { date, description: desc, amount, type: 'expense' };
    }
  },
  amex: {
    name: 'アメックス',
    icon: '',
    detect: (headers) => headers.some(h => h.includes('Date') || h.includes('Amount') || h.toLowerCase().includes('amex')),
    parse: (row, headers) => {
      const get = (keys) => { for(const k of keys){ const i=headers.findIndex(h=>h.toLowerCase().includes(k.toLowerCase())); if(i>=0&&row[i]) return row[i].trim(); } return ''; };
      const dateRaw = get(['Date','利用日','取引日']);
      // MM/DD/YY or YYYY/MM/DD
      let date = dateRaw;
      if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateRaw)) {
        const [m,d,y] = dateRaw.split('/');
        date = `20${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
      } else {
        date = dateRaw.replace(/\//g,'-');
      }
      const desc = get(['Description','利用先','Merchant']);
      const amtRaw = get(['Amount','金額','利用金額']);
      const amount = Math.abs(parseFloat(amtRaw.replace(/[,，¥円$\s]/g,'')) || 0);
      return { date, description: desc, amount, type: 'expense' };
    }
  },
  jcb: {
    name: 'JCB',
    icon: '',
    detect: (headers) => headers.some(h => h.includes('ご利用日') && headers.some(h2=>h2.includes('ご利用金額') || h2.includes('支払金額'))),
    parse: (row, headers) => {
      const get = (keys) => { for(const k of keys){ const i=headers.findIndex(h=>h.includes(k)); if(i>=0&&row[i]) return row[i].trim(); } return ''; };
      const dateRaw = get(['ご利用日','利用日']);
      const date = dateRaw.replace(/\//g,'-').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, (_,y,m,d)=>`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
      const desc = get(['ご利用先名','利用先','加盟店名']);
      const amtRaw = get(['ご利用金額','支払金額','金額']);
      const amount = parseInt(amtRaw.replace(/[,，¥円\s]/g,'')) || 0;
      return { date, description: desc, amount, type: 'expense' };
    }
  },
  aeon: {
    name: 'イオンカード',
    icon: '',
    detect: (headers) => headers.some(h => h.includes('ショッピング') || h.includes('利用年月日')),
    parse: (row, headers) => {
      const get = (keys) => { for(const k of keys){ const i=headers.findIndex(h=>h.includes(k)); if(i>=0&&row[i]) return row[i].trim(); } return ''; };
      const dateRaw = get(['利用年月日','利用日','ご利用日']);
      const date = dateRaw.replace(/\//g,'-').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, (_,y,m,d)=>`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
      const desc = get(['ご利用先','利用先名称','加盟店']);
      const amtRaw = get(['ご利用金額','利用金額','金額']);
      const amount = parseInt(amtRaw.replace(/[,，¥円\s]/g,'')) || 0;
      return { date, description: desc, amount, type: 'expense' };
    }
  },
  epos: {
    name: 'エポスカード',
    icon: '',
    detect: (headers) => headers.some(h => h.includes('利用日') && headers.some(h2=>h2.includes('支払金額') || h2.includes('お支払金額'))),
    parse: (row, headers) => {
      const get = (keys) => { for(const k of keys){ const i=headers.findIndex(h=>h.includes(k)); if(i>=0&&row[i]) return row[i].trim(); } return ''; };
      const dateRaw = get(['利用日']);
      const date = dateRaw.replace(/\//g,'-').replace(/(\d{4})-(\d{1,2})-(\d{1,2})/, (_,y,m,d)=>`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
      const desc = get(['利用先','加盟店名','お店・サービス名']);
      const amtRaw = get(['支払金額','お支払金額','ご利用金額']);
      const amount = parseInt(amtRaw.replace(/[,，¥円\s]/g,'')) || 0;
      return { date, description: desc, amount, type: 'expense' };
    }
  },
};

// CSVを解析してフォーマットを自動判定
function detectCardFormat(csvText) {
  const lines = csvText.split('\n').filter(l => l.trim());
  let headerLine = '';
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length >= 3) { headerLine = lines[i]; headerIdx = i; break; }
  }
  const headers = parseCSVLine(headerLine).map(h => h.trim());
  for (const [key, fmt] of Object.entries(CARD_FORMATS)) {
    if (fmt.detect(headers)) return { key, fmt, headers, headerIdx };
  }
  return null;
}
function parseCSVLine(line) {
  const result = [];
  let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else { cur += c; }
  }
  result.push(cur);
  return result;
}

// CSVインポートUIを表示
function showCardCSVImport() {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  const cardBtns = Object.entries(CARD_FORMATS).map(([,f]) =>
    '<div style="text-align:center;padding:8px 4px;background:var(--bg3);border-radius:8px;font-size:11px">'
    + '<div style="font-size:18px;margin-bottom:2px">' + f.icon + '</div>'
    + '<div style="color:var(--text2)">' + f.name + '</div></div>'
  ).join('');

  bg.innerHTML = '<div class="modal" style="width:460px">'
    + '<div class="modal-title"> カード明細をインポート</div>'
    + '<div style="font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.7">カード会社のMyページから利用明細をCSVダウンロードして、ここにドロップするだけで自動仕訳します。</div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px">' + cardBtns + '</div>'
    + '<div id="csv-drop-area" style="border:2px dashed var(--border2);border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;margin-bottom:12px;transition:all 0.2s" onclick="document.getElementById(\'csv-file-input\').click()" ondragover="event.preventDefault();this.style.borderColor=\'var(--accent)\'" ondragleave="this.style.borderColor=\'var(--border2)\'" ondrop="handleCSVDrop(event)">'
    + '<input type="file" id="csv-file-input" accept=".csv" style="display:none" onchange="handleCSVFile(this.files[0])">'
    + '<div style="font-size:28px;margin-bottom:8px"></div>'
    + '<div style="font-size:13px;font-weight:700;color:var(--text)">CSVファイルをドロップ</div>'
    + '<div style="font-size:11px;color:var(--text3);margin-top:4px">またはタップしてファイルを選択</div></div>'
    + '<div id="csv-status" style="display:none"></div>'
    + '<div id="csv-preview" style="display:none"></div>'
    + '<button onclick="this.closest(\'.modal-bg\').remove()" class="btn btn-ghost btn-sm" style="width:100%">閉じる</button>'
    + '</div>';
  document.getElementById('app').appendChild(bg);
}

function handleCSVDrop(e) {
  e.preventDefault();
  const area = document.getElementById('csv-drop-area');
  if (area) { area.style.borderColor='var(--border2)'; area.style.background=''; }
  const file = e.dataTransfer.files[0];
  if (file) handleCSVFile(file);
}

async function handleCSVFile(file) {
  if (!file || !file.name.endsWith('.csv')) {
    showCSVStatus('error', 'CSVファイルを選択してください');
    return;
  }
  showCSVStatus('loading', ' ファイルを読み込み中...');

  const text = await file.text().catch(() => null);
  if (!text) { showCSVStatus('error', 'ファイルの読み込みに失敗しました'); return; }

  const detected = detectCardFormat(text);
  if (!detected) {
    showCSVStatus('error', '対応していないフォーマットです。フォーマットを確認してください。');
    return;
  }

  const { key, fmt, headers, headerIdx } = detected;
  const lines = text.split('\n').filter(l => l.trim());
  const dataLines = lines.slice(headerIdx + 1).filter(l => l.trim() && !l.startsWith('合計') && !l.startsWith('小計'));

  // 各行をパース
  const parsed = [];
  for (const line of dataLines) {
    const row = parseCSVLine(line);
    if (row.length < 2) continue;
    try {
      const item = fmt.parse(row, headers);
      if (item.amount > 0 && item.date && item.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        parsed.push(item);
      }
    } catch(e) {}
  }

  if (parsed.length === 0) {
    showCSVStatus('error', 'データが見つかりませんでした。');
    return;
  }

  showCSVStatus('success', fmt.icon + ' ' + fmt.name + 'を検出 — ' + parsed.length + '件のデータが見つかりました');
  showCSVPreview(parsed, fmt, key);
}

function showCSVStatus(type, msg) {
  const el = document.getElementById('csv-status');
  if (!el) return;
  const colors = { loading:'var(--blue)', success:'var(--green)', error:'var(--red)' };
  el.style.display = 'block';
  el.style.padding = '10px 12px';
  el.style.borderRadius = '8px';
  el.style.fontSize = '12px';
  el.style.marginBottom = '10px';
  el.style.background = 'var(--bg3)';
  el.style.color = colors[type] || 'var(--text)';
  el.textContent = msg;
}

function showCSVPreview(items, fmt, cardKey) {
  const el = document.getElementById('csv-preview');
  if (!el) return;
  const totalAmt = items.reduce((s,i) => s + i.amount, 0);
  const previewRows = items.slice(0,5).map(item =>
    '<div style="display:flex;justify-content:space-between;padding:8px 12px;font-size:11px;border-bottom:1px solid var(--border)">'
    + '<div><div style="color:var(--text)">' + (item.description||'（店名なし）') + '</div>'
    + '<div style="color:var(--text3)">' + item.date + '</div></div>'
    + '<div style="font-weight:700;color:var(--text)">' + item.amount.toLocaleString() + '円</div></div>'
  ).join('');
  const moreText = items.length > 5 ? '<div style="padding:8px 12px;font-size:11px;color:var(--text3);text-align:center">他 ' + (items.length-5) + '件...</div>' : '';
  const itemsJSON = encodeURIComponent(JSON.stringify(items));
  el.style.display = 'block';
  el.innerHTML = '<div style="background:var(--bg3);border-radius:8px;overflow:hidden;margin-bottom:10px">'
    + '<div style="display:flex;justify-content:space-between;padding:10px 12px;font-size:12px;border-bottom:1px solid var(--border)">'
    + '<span style="color:var(--text2)">合計 ' + items.length + '件</span>'
    + '<span style="font-weight:700">' + totalAmt.toLocaleString() + '円</span></div>'
    + '<div style="max-height:200px;overflow-y:auto">' + previewRows + moreText + '</div></div>'
    + '<button onclick="importCSVFromEncoded(\'' + itemsJSON + '\', \'' + cardKey + '\')"'
    + ' style="width:100%;padding:12px;background:linear-gradient(135deg,var(--accent2),#3d2fff);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font)">'
    + ' ' + items.length + '件を仕訳に取り込む</button>';
}

function importCSVFromEncoded(encoded, cardKey) {
  const items = JSON.parse(decodeURIComponent(encoded));
  importCSVToJournals(items, cardKey);
}

async function importCSVToJournals(items, cardKey) {
  const a = accounts[currentAcct];
  if (!a.journals) a.journals = [];
  const fmt = CARD_FORMATS[cardKey];

  // AI自動仕訳
  showCSVStatus('loading', ' AIが勘定科目を判定中...');

  let added = 0;
  for (const item of items) {
    // 重複チェック（同日・同金額・同店名）
    const dup = a.journals.find(j=>j.date===item.date && j.amount===item.amount && j.description===item.description);
    if (dup) continue;

    // Phase1 辞書判定
    let category = '消耗品費';
    let tax_rate = 10;
    for (const kw of Object.keys(KW||{})) {
      if (item.description.includes(kw)) {
        category = KW[kw].category || category;
        break;
      }
    }

    const journal = normalizeJournal({
      id: Date.now() + Math.random(),
      date: item.date,
      type: 'expense',
      category,
      description: item.description + '（' + fmt.name + '）',
      amount: item.amount,
      tax_rate,
      tax_type: '課税',
      status: 'unconfirmed',
      phase: 'phase1',
      source: 'card_csv',
      card: cardKey,
    });
    a.journals.push(journal);
    added++;
  }

  save(currentAcct);
  updateKPI();
  renderSidebar();

  showCSVStatus('success', ' ' + added + '件を仕訳に追加しました（重複 ' + (items.length-added) + '件はスキップ）');
  document.getElementById('csv-preview').style.display = 'none';

  // トースト
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(46,204,140,0.97);color:#fff;padding:10px 20px;border-radius:99px;font-size:12px;font-weight:700;z-index:9999;white-space:nowrap';
  toast.textContent = ' ' + fmt.name + ' ' + added + '件を取り込みました';
  document.getElementById('app').appendChild(toast);
  setTimeout(()=>{toast.style.opacity='0';toast.style.transition='opacity 0.3s';setTimeout(()=>toast.remove(),300);}, 2500);
}


// ══════════════════════════════════════════════════════════════
//  Supabase完全接続レイヤー
// ══════════════════════════════════════════════════════════════

// ── Supabase経由でアカウントデータを読み込む ──
async function loadFromSupabase(userId) {
  if (!SB.client) return false;
  try {
    const { data, error } = await SB.client
      .from('accounts')
      .select('email, name, business, year, plan, role, data_json')
      .eq('user_id', userId);
    if (error || !data) return false;
    for (const row of data) {
      try {
        const extra = row.data_json ? JSON.parse(row.data_json) : {};
        accounts[row.email] = {
          name: row.name,
          email: row.email,
          business: row.business,
          year: row.year,
          plan: row.plan || 'free',
          role: row.role || 'user',
          ...extra,
        };
      } catch(e) {}
    }
    return Object.keys(accounts).length > 0;
  } catch(e) { return false; }
}

// ── Supabase経由で仕訳を読み込む ──
async function loadJournalsFromSupabase(email) {
  if (!SB.client || !email) return false;
  try {
    const { data, error } = await SB.client
      .from('journals')
      .select('*')
      .eq('account_email', email)
      .order('date', { ascending: false });
    if (error || !data) return false;
    const a = accounts[email];
    if (!a) return false;
    a.journals = data.map(function(row) {
      return {
        id: row.id,
        date: row.date,
        type: row.type,
        category: row.category,
        description: row.description,
        amount: row.amount,
        tax_rate: row.tax_rate || 10,
        tax_type: row.tax_type || '課税',
        status: row.status || 'confirmed',
        phase: row.phase || 'phase1',
        alert_flags: row.alert_flags || [],
        payee: row.payee || '',
        source: row.source || '',
        freee_deal_id: row.freee_deal_id || null,
      };
    });
    return true;
  } catch(e) { return false; }
}

// ── Supabase経由で仕訳を保存（1件） ──
async function saveJournalToSupabase(email, journal) {
  if (!SB.client || !email) return false;
  try {
    const row = {
      id: String(journal.id),
      account_email: email,
      date: journal.date,
      type: journal.type,
      category: journal.category,
      description: journal.description,
      amount: journal.amount,
      tax_rate: journal.tax_rate || 10,
      tax_type: journal.tax_type || '課税',
      status: journal.status || 'confirmed',
      phase: journal.phase || 'phase1',
      alert_flags: journal.alertFlags || [],
      payee: journal.payee || '',
      source: journal.source || '',
    };
    const { error } = await SB.client
      .from('journals')
      .upsert(row, { onConflict: 'id' });
    return !error;
  } catch(e) { return false; }
}

// ── Supabase経由でアカウントを保存 ──
async function saveAccountToSupabase(email) {
  if (!SB.client || !email || !SB.userId) return false;
  const a = accounts[email];
  if (!a) return false;
  try {
    // journals以外をdata_jsonに格納
    const extra = {};
    const skipKeys = ['name','email','business','year','plan','role','journals'];
    Object.keys(a).forEach(function(k) {
      if (!skipKeys.includes(k)) extra[k] = a[k];
    });
    const row = {
      user_id: SB.userId,
      email: email,
      name: a.name || '',
      business: a.business || '',
      year: a.year || new Date().getFullYear(),
      plan: a.plan || 'free',
      role: a.role || 'user',
      data_json: JSON.stringify(extra),
    };
    const { error } = await SB.client
      .from('accounts')
      .upsert(row, { onConflict: 'email' });
    return !error;
  } catch(e) { return false; }
}

// ── 接続テスト ──
async function testSupabaseConnection() {
  const el = document.getElementById('supabase-test-result');
  if (el) { el.style.display = 'block'; el.textContent = '接続テスト中...'; el.style.color = 'var(--blue)'; }
  if (!SB.client) {
    if (el) { el.textContent = ' Supabaseが設定されていません（SUPABASE_URL・SUPABASE_ANON_KEY未設定）'; el.style.color = 'var(--red)'; }
    return false;
  }
  try {
    const { data, error } = await SB.client.from('journals').select('id').limit(1);
    if (error) {
      if (el) { el.textContent = ' エラー: ' + error.message; el.style.color = 'var(--red)'; }
      return false;
    }
    if (el) { el.textContent = ' Supabase接続成功！データベースに接続できています。'; el.style.color = 'var(--green)'; }
    return true;
  } catch(e) {
    if (el) { el.textContent = ' 接続エラー: ' + e.message; el.style.color = 'var(--red)'; }
    return false;
  }
}


// ══════════════════════════════════════════════════════════════
//  消費税率管理システム
// 税率は画面から変更可能 / 改定日を設定すると自動切り替え
// ══════════════════════════════════════════════════════════════

const TAX_CONFIG_KEY = 'ninja_tax_config';


// 指定日時点で有効な税率を返す


// 現在の標準税率・軽減税率


// 税率設定モーダル
function showTaxConfigModal() {
  const cfg = getTaxConfig();
  const rates = getCurrentTaxRates();
  const scheduleHtml = (cfg.schedules || []).map(function(s, i) {
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-family:var(--sans);font-size:12px">'
      + '<div style="flex:1"><div style="font-weight:700">' + s.effective_date + ' 施行</div>'
      + '<div style="color:var(--text3)">標準 ' + s.standard + '% / 軽減 ' + s.reduced + '%</div></div>'
      + '<button onclick="removeTaxSchedule(' + i + ')" style="padding:3px 8px;background:var(--red-bg);color:var(--red);border:1px solid rgba(204,51,51,.2);border-radius:6px;font-family:var(--sans);font-size:10px;cursor:pointer">削除</button>'
      + '</div>';
  }).join('');

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };

  let html = '<div class="modal" style="width:380px">';
  html += '<div class="modal-title"> 消費税率の設定 <span class="modal-close" onclick="this.closest(\'.modal-bg\').remove()">×</span></div>';
  html += '<div class="card" style="margin-bottom:12px">';
  html += '<div class="card-title">現在の適用税率</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  html += '<div style="text-align:center;padding:12px;background:var(--bg3);border-radius:var(--radius-sm)"><div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-bottom:4px">標準税率</div><div style="font-size:24px;font-weight:900">' + rates.standard + '%</div></div>';
  html += '<div style="text-align:center;padding:12px;background:var(--bg3);border-radius:var(--radius-sm)"><div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-bottom:4px">軽減税率（食品等）</div><div style="font-size:24px;font-weight:900">' + rates.reduced + '%</div></div>';
  html += '</div></div>';

  html += '<div class="card" style="margin-bottom:12px">';
  html += '<div class="card-title">税率を変更する（即時適用）</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">';
  html += '<div><div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:4px">標準税率 (%)</div><input type="number" id="new-standard" value="' + cfg.standard + '" min="0" max="99" class="form-inp" style="font-size:16px;font-weight:700;text-align:center"></div>';
  html += '<div><div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:4px">軽減税率 (%)</div><input type="number" id="new-reduced" value="' + cfg.reduced + '" min="0" max="99" class="form-inp" style="font-size:16px;font-weight:700;text-align:center"></div>';
  html += '</div>';
  html += '<button onclick="applyTaxRateNow()" style="width:100%;padding:10px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer">今すぐ変更する</button>';
  html += '</div>';

  html += '<div class="card" style="margin-bottom:12px">';
  html += '<div class="card-title">改定スケジュールを追加</div>';
  html += '<div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:10px">施行日を設定しておくと、その日から自動的に新税率が適用されます</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">';
  html += '<div><div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-bottom:3px">施行日</div><input type="date" id="sched-date" class="form-inp" style="font-size:12px"></div>';
  html += '<div><div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-bottom:3px">標準税率</div><input type="number" id="sched-standard" placeholder="15" min="0" max="99" class="form-inp" style="font-size:14px;font-weight:700;text-align:center"></div>';
  html += '<div><div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-bottom:3px">軽減税率</div><input type="number" id="sched-reduced" placeholder="10" min="0" max="99" class="form-inp" style="font-size:14px;font-weight:700;text-align:center"></div>';
  html += '</div>';
  html += '<button onclick="addTaxSchedule()" style="width:100%;padding:10px;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font);font-size:12px;cursor:pointer">スケジュールを追加</button>';
  html += '</div>';

  if (scheduleHtml) {
    html += '<div class="card"><div class="card-title">登録済みスケジュール</div>' + scheduleHtml + '</div>';
  }
  html += '</div>';
  bg.innerHTML = html;
  document.getElementById('app').appendChild(bg);
}

function applyTaxRateNow() {
  const standard = parseInt(document.getElementById('new-standard').value);
  const reduced = parseInt(document.getElementById('new-reduced').value);
  if (isNaN(standard) || isNaN(reduced) || standard < 0 || reduced < 0) {
    showToast('正しい税率を入力してください');
    return;
  }
  if (reduced > standard) {
    showToast('軽減税率は標準税率以下にしてください');
    return;
  }
  const cfg = getTaxConfig();
  cfg.standard = standard;
  cfg.reduced = reduced;
  saveTaxConfig(cfg);
  document.querySelector('.modal-bg').remove();
  showToast('税率を ' + standard + '% / ' + reduced + '% に変更しました');
}

function addTaxSchedule() {
  const date = document.getElementById('sched-date').value;
  const standard = parseInt(document.getElementById('sched-standard').value);
  const reduced = parseInt(document.getElementById('sched-reduced').value);
  if (!date || isNaN(standard) || isNaN(reduced)) {
    showToast('全ての項目を入力してください');
    return;
  }
  if (reduced > standard) {
    showToast('軽減税率は標準税率以下にしてください');
    return;
  }
  const cfg = getTaxConfig();
  if (!cfg.schedules) cfg.schedules = [];
  // 同じ日付があれば上書き
  const idx = cfg.schedules.findIndex(function(s) { return s.effective_date === date; });
  if (idx >= 0) cfg.schedules[idx] = { effective_date: date, standard: standard, reduced: reduced };
  else cfg.schedules.push({ effective_date: date, standard: standard, reduced: reduced });
  cfg.schedules.sort(function(a,b) { return a.effective_date.localeCompare(b.effective_date); });
  saveTaxConfig(cfg);
  document.querySelector('.modal-bg').remove();
  showToast(date + ' から 標準' + standard + '% / 軽減' + reduced + '% に自動切り替えします');
}

function removeTaxSchedule(idx) {
  const cfg = getTaxConfig();
  cfg.schedules.splice(idx, 1);
  saveTaxConfig(cfg);
  document.querySelector('.modal-bg').remove();
  showTaxConfigModal();
}

// 起動時に税率改定スケジュールをチェック
function getTaxConfig() {
  try {
    const stored = localStorage.getItem(TAX_CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return {
    standard: 10,
    reduced: 8,
    schedules: []
  };
}

function saveTaxConfig(cfg) {
  try { localStorage.setItem(TAX_CONFIG_KEY, JSON.stringify(cfg)); } catch(e) {}
}

// 指定日時点で有効な税率を返す
function getEffectiveTaxRate(type, dateStr) {
  const cfg = getTaxConfig();
  const d = dateStr || new Date().toISOString().slice(0,10);
  // スケジュールを日付の降順でチェック
  const schedules = (cfg.schedules || []).filter(function(s) { return s.effective_date <= d; });
  schedules.sort(function(a,b) { return b.effective_date.localeCompare(a.effective_date); });
  if (schedules.length > 0) {
    const s = schedules[0];
    return type === 'reduced' ? s.reduced : s.standard;
  }
  return type === 'reduced' ? cfg.reduced : cfg.standard;
}

// 現在の標準税率・軽減税率
function getCurrentTaxRates() {
  return {
    standard: getEffectiveTaxRate('standard'),
    reduced: getEffectiveTaxRate('reduced'),
  };
}


function renderSidebarLogo() {
  const el = document.getElementById('sb-logo');
  if (!el) return;
  el.style.display = window.innerWidth >= 768 ? 'block' : 'none';
}

// ウィンドウリサイズで切り替え
window.addEventListener('resize', function() {
  renderDesktopNav();
  renderSidebarLogo();
  const bnav = document.getElementById('bottom-nav-bar');
  if (bnav) bnav.style.display = window.innerWidth >= 768 ? 'none' : 'flex';
});


// ── デスクトップナビ ──
function renderDesktopNav() {
  const el = document.getElementById('desktop-nav');
  if (!el) return;
  if (window.innerWidth < 768) { el.innerHTML = ''; return; }
  const isRE = currentAcct && typeof hasRealEstate === 'function' && hasRealEstate(currentAcct);
  const sections = [
    { title: '記録する', items: [
      { icon: '', label: 'レシート撮影', tab: 'receipt' },
      { icon: '', label: 'カード明細', action: 'showCardCSVImport()' },
      { icon: '!', label: '要確認', tab: 'review' },
    ]},
    { title: '帳簿', items: [
      { icon: '', label: '仕訳帳', tab: 'journal' },
      { icon: '', label: '損益計算書', tab: 'pl' },
      { icon: '', label: '資金繰り', tab: 'cashflow' },
      { icon: '', label: '消費税', tab: 'tax' },
    ]},
    { title: '申告', items: [
      { icon: '', label: '確定申告', tab: 'checklist' },
      { icon: '', label: '固定資産', tab: 'assets' },
    ]},
    { title: '独立の術', items: [
      { icon: '', label: '独立の術', tab: 'dokuritsu' },
    ]},
    { title: '連携', items: [
      { icon: '', label: 'freee', tab: 'freee' },
      { icon: '', label: '請求書', tab: 'invoices' },
    ]},
  ];
  if (isRE) sections.push({ title: '不動産', items: [{ icon: '', label: '不動産管理', tab: 'realestate' }] });
  let inner = '';
  sections.forEach(function(sec) {
    inner += '<div class="sb-nav-section">' + sec.title + '</div>';
    sec.items.forEach(function(item) {
      const active = item.tab && currentTab === item.tab ? ' active' : '';
      const fn = item.action ? item.action : 'switchTab(' + JSON.stringify(item.tab) + ')';
      inner += '<div class="sb-nav-item' + active + '" onclick="' + fn + '">'
        + '<span class="sb-icon">' + item.icon + '</span>' + item.label + '</div>';
    });
  });
  el.innerHTML = inner;
}
;


// ══════════════════════════════════════════════════════════════
// ① すぐ実装：ローディング・カンマ表示・バリデーション・重複チェック
//              ダッシュボード警告・送信状態管理・送信履歴
// ══════════════════════════════════════════════════════════════

// ── ローディング表示 ──
function showLoading(msg) {
  let el = document.getElementById('global-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-loading';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.85);z-index:9998;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px';
    el.innerHTML = '<div id="gl-spinner" style="width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--text);border-radius:50%;animation:spin .8s linear infinite"></div>'
      + '<div id="gl-msg" style="font-family:var(--sans);font-size:13px;color:var(--text2)"></div>';
    document.body.appendChild(el);
    // spinアニメーション
    if (!document.getElementById('spin-style')) {
      const st = document.createElement('style');
      st.id = 'spin-style';
      st.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(st);
    }
  }
  el.style.display = 'flex';
  document.getElementById('gl-msg').textContent = msg || '処理中...';
}

function hideLoading() {
  const el = document.getElementById('global-loading');
  if (el) el.style.display = 'none';
}

// ── カンマ表示（入力欄） ──
function formatWithComma(input) {
  const raw = input.value.replace(/[^0-9]/g, '');
  if (!raw) { input.value = ''; return; }
  input.value = parseInt(raw, 10).toLocaleString();
  input.dataset.rawValue = raw;
}

function getRawValue(input) {
  return parseInt((input.dataset.rawValue || input.value).replace(/[^0-9]/g, '') || '0', 10);
}

// 金額入力欄にカンマフォーマットを適用
function applyCommaFormat() {
  document.querySelectorAll('input[data-type="amount"]').forEach(function(inp) {
    inp.addEventListener('input', function() { formatWithComma(this); });
    inp.addEventListener('blur', function() { formatWithComma(this); });
  });
}

// ── バリデーション ──
function validateJournal(data) {
  const errors = [];
  if (!data.date) errors.push('日付は必須です');
  if (!data.amount || data.amount <= 0) errors.push('金額を入力してください（0より大きい値）');
  if (!data.category) errors.push('勘定科目を選択してください');
  if (!data.description || data.description.trim() === '') errors.push('摘要を入力してください');
  if (data.tax_rate === undefined || data.tax_rate === null) errors.push('税率を選択してください');
  return errors;
}

function showValidationErrors(errors) {
  if (!errors.length) return true;
  showToast('! ' + errors[0]);
  return false;
}

// ── 重複チェック ──
function isDuplicateJournal(journals, newJournal) {
  return journals.some(function(j) {
    return j.date === newJournal.date
      && j.amount === newJournal.amount
      && j.description === newJournal.description
      && j.id !== newJournal.id;
  });
}

function checkDuplicateBeforeSave(journals, newJournal) {
  if (isDuplicateJournal(journals, newJournal)) {
    showToast('! 同じ日付・金額・摘要の仕訳が既にあります（重複の可能性）');
    return false;
  }
  return true;
}

// ── ダッシュボード学習状況 ──
function renderLearningStatus() {
  const el = document.getElementById('learning-status-card');
  if (!el) return;
  const lrData = calcLearningScore();
  const rank = getLearningRank(lrData.score);
  const a = accounts[currentAcct];
  const pendingCount = getPendingOCRCount(a);
  el.innerHTML = '<div style="display:flex;align-items:center;gap:12px">'
    + '<div style="flex:1">'
    + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-bottom:2px">AI学習ランク</div>'
    + '<div id="learning-rank-badge" style="font-size:16px;font-weight:900;color:' + rank.color + '">' + rank.label + '</div>'
    + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">評点 ' + lrData.score + ' / ルール <span id="learning-rules-count">' + lrData.totalRules + '</span>件</div>'
    + '</div>'
    + (pendingCount > 0 ? '<div style="text-align:center;padding:8px 12px;background:var(--yellow-bg);border-radius:8px;cursor:pointer" onclick="showPendingOCRList()">'
      + '<div style="font-size:20px;font-weight:900;color:var(--yellow)">' + pendingCount + '</div>'
      + '<div style="font-family:var(--sans);font-size:9px;color:var(--yellow)">判定待ち</div>'
      + '</div>' : '')
    + '<button onclick="showLearningRulesModal()" style="padding:6px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;font-family:var(--sans);font-size:11px;cursor:pointer">管理</button>'
    + '</div>';
}

function showPendingOCRList() {
  const a = accounts[currentAcct];
  const pending = ((a && a.pending_ocr) || []).filter(function(p) { return p.status === 'pending'; });
  if (!pending.length) { showToast('判定待ちはありません'); return; }
  switchTab('review');
}

// ── ダッシュボード警告バナー ──
function buildDashboardAlerts(a) {
  const journals = a.journals || [];
  const alerts = [];

  // 要確認仕訳
  const needsReview = journals.filter(function(j) { return j.alert || j.status === 'unconfirmed'; }).length;
  if (needsReview > 0) {
    alerts.push({ level: 'warning', icon: '!', msg: '整えが必要な仕訳が' + needsReview + '件あります', action: "switchTab('review')", actionLabel: '確認する' });
  }

  // freee送信待ち
  const freeeWaiting = journals.filter(function(j) { return j.status === 'confirmed' && !j.freee_sent; }).length;
  if (freeeWaiting > 10) {
    alerts.push({ level: 'info', icon: '', msg: 'freee送信待ちが' + freeeWaiting + '件あります', action: "switchTab('freee')", actionLabel: '送信する' });
  }

  // 今月データなし
  const now = new Date();
  const thisMonth = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  const thisMonthData = journals.filter(function(j) { return (j.date||'').startsWith(thisMonth); });
  if (thisMonthData.length === 0 && now.getDate() > 10) {
    alerts.push({ level: 'warning', icon: '', msg: '今月の仕訳がまだ登録されていません', action: "switchTab('receipt')", actionLabel: '登録する' });
  }

  return alerts;
}

function renderDashboardAlerts(a) {
  const alerts = buildDashboardAlerts(a);
  const container = document.getElementById('dashboard-alerts');
  if (!container) return;
  if (!alerts.length) { container.innerHTML = ''; return; }

  const colors = { warning: 'var(--yellow)', info: 'var(--blue)', error: 'var(--red)' };
  const bgs = { warning: 'rgba(170,119,0,0.06)', info: 'rgba(26,74,138,0.06)', error: 'rgba(204,51,51,0.06)' };

  container.innerHTML = alerts.map(function(al) {
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:' + bgs[al.level] + ';border-radius:10px;margin-bottom:8px">'
      + '<span style="font-size:16px">' + al.icon + '</span>'
      + '<span style="flex:1;font-family:var(--sans);font-size:12px;color:' + colors[al.level] + ';font-weight:600">' + al.msg + '</span>'
      + '<button onclick="' + al.action + '" style="padding:4px 10px;background:' + colors[al.level] + ';color:#fff;border:none;border-radius:99px;font-family:var(--sans);font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap">' + al.actionLabel + '</button>'
      + '</div>';
  }).join('');
}

// ── 送信状態管理 ──
const FREEE_STATUS = {
  unsent:   { label: '未送信',   color: 'var(--text3)' },
  sending:  { label: '送信中',   color: 'var(--blue)' },
  sent:     { label: '送信済み', color: 'var(--green)' },
  error:    { label: 'エラー',   color: 'var(--red)' },
  mismatch: { label: '差異あり', color: 'var(--yellow)' },
};

function getFreeeStatus(journal) {
  if (journal.freee_error) return 'error';
  if (journal.freee_mismatch) return 'mismatch';
  if (journal.freee_sent) return 'sent';
  if (journal.freee_sending) return 'sending';
  return 'unsent';
}

function getFreeeStatusLabel(journal) {
  const st = getFreeeStatus(journal);
  return FREEE_STATUS[st] || FREEE_STATUS.unsent;
}

// ── 送信履歴 ──
function addFreeeLog(email, journal, status, detail) {
  const a = accounts[email];
  if (!a) return;
  if (!a.freee_logs) a.freee_logs = [];
  a.freee_logs.unshift({
    id: Date.now(),
    journal_id: journal.id,
    journal_desc: journal.description,
    amount: journal.amount,
    status: status,
    detail: detail || '',
    sent_at: new Date().toISOString(),
  });
  // 最大100件保持
  if (a.freee_logs.length > 100) a.freee_logs = a.freee_logs.slice(0, 100);
}

function renderFreeeHistory() {
  const a = accounts[currentAcct];
  if (!a) return '';
  const logs = a.freee_logs || [];
  if (!logs.length) return '<div style="font-family:var(--sans);font-size:12px;color:var(--text3);padding:12px 0">送信履歴はありません</div>';

  return logs.slice(0, 20).map(function(log) {
    const st = FREEE_STATUS[log.status] || FREEE_STATUS.unsent;
    const dt = new Date(log.sent_at).toLocaleString('ja-JP', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:11px">'
      + '<span style="color:' + st.color + ';font-weight:700;font-family:var(--sans);min-width:56px">' + st.label + '</span>'
      + '<span style="flex:1;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (log.journal_desc||'') + '</span>'
      + '<span style="color:var(--text3);font-family:var(--sans);white-space:nowrap">' + (log.amount||0).toLocaleString() + '円</span>'
      + '<span style="color:var(--text3);font-family:var(--sans);font-size:10px;white-space:nowrap">' + dt + '</span>'
      + '</div>';
  }).join('');
}

// ── リトライ ──
async function retryFreeeJournal(journalId) {
  const a = accounts[currentAcct];
  const j = (a.journals||[]).find(function(x) { return x.id == journalId; });
  if (!j) return;
  j.freee_error = null;
  j.freee_sending = true;
  showToast(' 再送信中...');
  // freee送信処理を呼ぶ
  if (typeof sendJournalToFreee === 'function') {
    await sendJournalToFreee(j);
  } else {
    j.freee_sent = true;
    j.freee_sending = false;
    addFreeeLog(currentAcct, j, 'sent', '手動再送信');
    showToast(' 再送信しました');
  }
  save(currentAcct);
  renderSidebar();
}


// ══════════════════════════════════════════════════════════════
//  OCR・学習ロジック系
// 1. OCR失敗時エラー表示・再試行・手入力切替
// 2. 判定待ち保存・ダッシュボード表示
// 3. 高精度自動判定ロジック
// 4. 学習データ保存・優先適用
// 5. 学習評点・ランク表示
// ══════════════════════════════════════════════════════════════

// ── 1. OCRエラー処理 ──
function handleOCRError(error, imageData) {
  const content = document.getElementById('main-content');
  if (!content) return;

  const errHtml = '<div style="background:var(--red-bg);border:1px solid rgba(204,51,51,.2);border-radius:var(--radius);padding:16px;margin-bottom:12px">'
    + '<div style="font-family:var(--sans);font-size:13px;font-weight:700;color:var(--red);margin-bottom:8px"> OCR読み取りに失敗しました</div>'
    + '<div style="font-family:var(--sans);font-size:11px;color:var(--text2);margin-bottom:12px">' + (error || '画像を認識できませんでした') + '</div>'
    + '<div style="display:flex;gap:8px">'
    + '<button onclick="retryOCR()" style="flex:1;padding:8px;background:var(--text);color:#fff;border:none;border-radius:var(--radius-sm);font-family:var(--font);font-size:12px;cursor:pointer">再読み込み</button>'
    + '<button onclick="switchToManualEntry()" style="flex:1;padding:8px;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font);font-size:12px;cursor:pointer">手入力に切替</button>'
    + '<button onclick="savePendingOCR()" style="flex:1;padding:8px;background:var(--yellow-bg);color:var(--yellow);border:1px solid rgba(170,119,0,.2);border-radius:var(--radius-sm);font-family:var(--font);font-size:12px;cursor:pointer">判定待ちとして保存</button>'
    + '</div></div>';

  const existingErr = document.getElementById('ocr-error-block');
  if (existingErr) existingErr.remove();
  const errDiv = document.createElement('div');
  errDiv.id = 'ocr-error-block';
  errDiv.innerHTML = errHtml;
  content.prepend(errDiv);
}

function retryOCR() {
  const errDiv = document.getElementById('ocr-error-block');
  if (errDiv) errDiv.remove();
  document.getElementById('receipt-file-input') && document.getElementById('receipt-file-input').click();
}

function switchToManualEntry() {
  const errDiv = document.getElementById('ocr-error-block');
  if (errDiv) errDiv.remove();
  switchTab('journal');
  setTimeout(function() {
    if (typeof showAddJournalModal === 'function') showAddJournalModal();
  }, 300);
}

// ── 2. 判定待ち保存 ──
function savePendingOCR(imageData, rawText) {
  const a = accounts[currentAcct];
  if (!a) { showToast('事業者を選択してください'); return; }
  if (!a.pending_ocr) a.pending_ocr = [];

  const pending = {
    id: Date.now(),
    saved_at: new Date().toISOString(),
    raw_text: rawText || '',
    image_ref: imageData ? '[画像あり]' : '',
    status: 'pending',
  };
  a.pending_ocr.push(pending);
  save(currentAcct);
  renderDashboard();

  const errDiv = document.getElementById('ocr-error-block');
  if (errDiv) errDiv.remove();
  showToast('判定待ちとして保存しました');
}

function getPendingOCRCount(a) {
  return ((a && a.pending_ocr) || []).filter(function(p) { return p.status === 'pending'; }).length;
}

// ── 3. 高精度自動判定ロジック ──
function classifyReceiptPrecise(storeName, items, amount) {
  const text = (storeName + ' ' + (items || '')).toLowerCase();

  // 学習データを最優先
  const learned = getLearningRuleFor(storeName);
  if (learned) return { category: learned.category, confidence: 'high', source: 'learned' };

  // Phase1 辞書（既存KWを活用）
  if (typeof KW !== 'undefined') {
    for (const kw of Object.keys(KW)) {
      if (text.includes(kw.toLowerCase())) {
        return { category: KW[kw].cat || KW[kw], confidence: 'medium', source: 'dictionary' };
      }
    }
  }

  // ルールベース判定
  const rules = [
    { pattern: /スターバックス|コーヒー|カフェ|珈琲/, category: '会議費', confidence: 'high' },
    { pattern: /タクシー|uber|ウーバー|電車|バス|交通|新幹線|飛行機|ＪＲ|jr/, category: '旅費交通費', confidence: 'high' },
    { pattern: /アマゾン|amazon|楽天|yahoo|ヤフー/, category: '消耗品費', confidence: 'medium' },
    { pattern: /ガソリン|エネオス|出光|コスモ/, category: '旅費交通費', confidence: 'high' },
    { pattern: /電気|ガス|水道|東京電力|大阪ガス/, category: '水道光熱費', confidence: 'high' },
    { pattern: /ソフトバンク|ドコモ|au|楽天モバイル|インターネット|通信/, category: '通信費', confidence: 'high' },
    { pattern: /家賃|賃料|マンション|アパート|駐車場/, category: '地代家賃', confidence: 'high' },
    { pattern: /接待|会食|レストラン|居酒屋|焼肉|寿司|ステーキ/, category: '接待交際費', confidence: 'medium' },
    { pattern: /コンビニ|セブン|ファミマ|ローソン|ミニストップ/, category: '会議費', confidence: 'low' },
    { pattern: /文具|コクヨ|ロフト|東急ハンズ/, category: '消耗品費', confidence: 'high' },
    { pattern: /保険|共済/, category: '損害保険料', confidence: 'high' },
    { pattern: /広告|宣伝|印刷|チラシ|看板/, category: '広告宣伝費', confidence: 'high' },
    { pattern: /外注|フリーランス|業務委託/, category: '外注費', confidence: 'high' },
  ];

  // 金額ルール（飲食系）
  if (amount && amount <= 5000 && /レストラン|食堂|定食|ランチ/.test(text)) {
    return { category: '会議費', confidence: 'medium', source: 'amount_rule' };
  }

  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      return { category: rule.category, confidence: rule.confidence, source: 'rule' };
    }
  }

  return { category: '雑費', confidence: 'low', source: 'fallback' };
}

// ── 4. 学習データ保存・優先適用 ──
function getLearningRules(email) {
  try {
    const key = 'learning_rules_' + (email || currentAcct);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch(e) { return []; }
}

function saveLearningRules(rules, email) {
  try {
    const key = 'learning_rules_' + (email || currentAcct);
    localStorage.setItem(key, JSON.stringify(rules));
  } catch(e) {}
}

function getLearningRuleFor(storeName) {
  const rules = getLearningRules();
  const name = (storeName || '').toLowerCase().trim();
  return rules.find(function(r) {
    return name.includes(r.pattern.toLowerCase()) || r.pattern.toLowerCase().includes(name);
  }) || null;
}

function addLearningRule(pattern, category, source) {
  const rules = getLearningRules();
  const existing = rules.findIndex(function(r) { return r.pattern.toLowerCase() === pattern.toLowerCase(); });
  const rule = {
    id: Date.now(),
    pattern: pattern,
    category: category,
    source: source || 'manual',
    applied: 0,
    created_at: new Date().toISOString(),
  };
  if (existing >= 0) {
    rules[existing] = { ...rules[existing], category: category, updated_at: new Date().toISOString() };
  } else {
    rules.push(rule);
  }
  saveLearningRules(rules);
  return rule;
}

// 仕訳修正時に学習データへ自動保存
function learnFromCorrection(storeName, correctedCategory) {
  if (!storeName || !correctedCategory) return;
  addLearningRule(storeName, correctedCategory, 'user_correction');
  updateLearningScore();
}

// ── 5. 学習評点・ランク ──
const LEARNING_RANKS = [
  { min: 0,   label: '初期',   color: 'var(--text3)' },
  { min: 5,   label: '見習い', color: 'var(--blue)' },
  { min: 15,  label: '育成中', color: 'var(--green)' },
  { min: 30,  label: '熟練',   color: 'var(--yellow)' },
  { min: 60,  label: '師範',   color: '#c0392b' },
];

function calcLearningScore(email) {
  const rules = getLearningRules(email);
  const totalRules = rules.length;
  const totalApplied = rules.reduce(function(s, r) { return s + (r.applied || 0); }, 0);
  const userRules = rules.filter(function(r) { return r.source === 'user_correction'; }).length;
  const score = totalRules * 2 + totalApplied + userRules * 3;
  return { score: score, totalRules: totalRules, totalApplied: totalApplied, userRules: userRules };
}

function getLearningRank(score) {
  let rank = LEARNING_RANKS[0];
  for (const r of LEARNING_RANKS) {
    if (score >= r.min) rank = r;
  }
  return rank;
}

function updateLearningScore() {
  const { score, totalRules, totalApplied } = calcLearningScore();
  const rank = getLearningRank(score);
  const el = document.getElementById('learning-rank-badge');
  if (el) {
    el.textContent = rank.label + ' (評点:' + score + ')';
    el.style.color = rank.color;
  }
  const rulesEl = document.getElementById('learning-rules-count');
  if (rulesEl) rulesEl.textContent = totalRules + '件';
  const appliedEl = document.getElementById('learning-applied-count');
  if (appliedEl) appliedEl.textContent = totalApplied + '回';
}

// ── 手動学習データ登録モーダル ──
function showLearningRulesModal() {
  const rules = getLearningRules();
  const lrData = calcLearningScore();
  const rank = getLearningRank(lrData.score);

  const rulesHtml = rules.length ? rules.slice(0,20).map(function(r) {
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:11px">'
      + '<span style="flex:1;font-family:var(--sans);color:var(--text2)">' + r.pattern + '</span>'
      + '<span style="color:var(--blue);font-family:var(--sans)">' + r.category + '</span>'
      + '<span style="color:var(--text3);font-family:var(--sans);font-size:9px">' + (r.applied||0) + '回</span>'
      + '<button onclick="deleteLearningRule(' + r.id + ')" style="padding:2px 6px;background:var(--red-bg);color:var(--red);border:none;border-radius:4px;font-size:9px;cursor:pointer">削除</button>'
      + '</div>';
  }).join('') : '<div style="font-family:var(--sans);font-size:12px;color:var(--text3);padding:12px 0">学習データがありません</div>';

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '460px';

  modal.innerHTML = '<div class="modal-title"> 学習データ管理'
    + '<span class="modal-close" id="lr-close-btn">×</span></div>'
    + '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg3);border-radius:var(--radius);margin-bottom:14px">'
    + '<div style="font-size:28px"></div>'
    + '<div><div style="font-family:var(--sans);font-size:11px;color:var(--text3)">学習ランク</div>'
    + '<div style="font-size:18px;font-weight:900;color:' + rank.color + '">' + rank.label + '</div>'
    + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">評点 ' + lrData.score + ' / ルール ' + lrData.totalRules + '件</div>'
    + '</div></div>'
    + '<div class="card-title" style="margin-bottom:10px">新しいルールを追加</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
    + '<div><div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-bottom:3px">店名・キーワード</div>'
    + '<input id="lr-pattern" class="form-inp" placeholder="例：スターバックス"></div>'
    + '<div><div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-bottom:3px">勘定科目</div>'
    + '<select id="lr-category" class="form-select"><option>売上高</option><option>仕入高</option><option>会議費</option><option>接待交際費</option><option>消耗品費</option><option>旅費交通費</option><option>通信費</option><option>広告宣伝費</option><option>地代家賃</option><option>水道光熱費</option><option>外注費</option><option>給与賃金</option><option>修繕費</option><option>損害保険料</option><option>雑費</option></select></div></div>'
    + '<button onclick="saveLearningRuleFromModal()" style="width:100%;padding:10px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;margin-bottom:14px">追加する</button>'
    + '<div class="card-title" style="margin-bottom:8px">登録済みルール (' + lrData.totalRules + '件)</div>'
    + '<div style="max-height:200px;overflow-y:auto">' + rulesHtml + '</div>';

  bg.appendChild(modal);
  document.getElementById('app').appendChild(bg);
  document.getElementById('lr-close-btn').onclick = function() { bg.remove(); };
  setTimeout(updateLearningScore, 100);
}

function saveLearningRuleFromModal() {
  const pattern = document.getElementById('lr-pattern').value.trim();
  const category = document.getElementById('lr-category').value;
  if (!pattern) { showToast('キーワードを入力してください'); return; }
  addLearningRule(pattern, category, 'manual');
  document.querySelector('.modal-bg').remove();
  showToast('学習ルールを追加しました: ' + pattern + ' → ' + category);
  updateLearningScore();
}

function deleteLearningRule(id) {
  const rules = getLearningRules().filter(function(r) { return r.id !== id; });
  saveLearningRules(rules);
  document.querySelector('.modal-bg').remove();
  showLearningRulesModal();
  showToast('削除しました');
  updateLearningScore();
}


// ══════════════════════════════════════════════════════════════
//  構制・権限・登録者管理（複数人対応）
// ══════════════════════════════════════════════════════════════

// ── 1. ロール管理（admin / member） ──
const USER_ROLES = {
  admin:  { label: '管理者', color: 'var(--red)' },
  member: { label: 'メンバー', color: 'var(--blue)' },
};

function getCurrentUserRole() {
  const a = accounts[currentAcct];
  if (!a) return 'member';
  if (a.role === 'admin' || a.role === 'administrator') return 'admin';
  return 'member';
}

function isAdmin() {
  return getCurrentUserRole() === 'admin';
}

function requireAdmin() {
  if (!isAdmin()) { showToast('この操作は管理者のみ実行できます'); return false; }
  return true;
}

// ── 2. 入力者管理（複数人対応） ──
function getMembers() {
  const a = accounts[currentAcct];
  return (a && a.members) || [];
}

function addMember(name, role) {
  if (!requireAdmin()) return;
  const a = accounts[currentAcct];
  if (!a.members) a.members = [];
  if (a.members.find(function(m) { return m.name === name; })) {
    showToast('同じ名前のメンバーが既に存在します'); return;
  }
  a.members.push({
    id: Date.now(),
    name: name,
    role: role || 'member',
    created_at: new Date().toISOString(),
  });
  save(currentAcct);
  showToast(name + ' を追加しました');
}

function removeMember(memberId) {
  if (!requireAdmin()) return;
  const a = accounts[currentAcct];
  if (!a.members) return;
  a.members = a.members.filter(function(m) { return m.id !== memberId; });
  save(currentAcct);
}

function getCurrentMember() {
  try { return sessionStorage.getItem('ninja_current_member') || ''; } catch(e) { return ''; }
}

function setCurrentMember(name) {
  try { sessionStorage.setItem('ninja_current_member', name); } catch(e) {}
  updateMemberDisplay();
}

function updateMemberDisplay() {
  const el = document.getElementById('current-member-badge');
  const name = getCurrentMember();
  if (el) {
    el.textContent = name ? name : '入力者未設定';
    el.style.color = name ? 'var(--text)' : 'var(--text3)';
  }
}

// 入力者選択モーダル（複数人対応）
function showMemberSelectModal() {
  const members = getMembers();
  const current = getCurrentMember();
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };
  const modal = document.createElement('div');
  modal.className = 'modal';

  let html = '<div class="modal-title">入力者を選択</div>';

  if (members.length) {
    members.forEach(function(m) {
      const isActive = m.name === current;
      const btn = document.createElement('button');
      btn.style.cssText = 'width:100%;padding:12px 16px;border:1px solid '
        + (isActive ? 'var(--text)' : 'var(--border)')
        + ';border-radius:var(--radius);background:'
        + (isActive ? 'var(--bg3)' : 'var(--bg2)')
        + ';font-family:var(--font);font-size:14px;cursor:pointer;text-align:left;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center';
      btn.innerHTML = '<span>' + m.name + '</span>'
        + '<span style="font-family:var(--sans);font-size:10px;color:var(--text3)">'
        + (USER_ROLES[m.role]||USER_ROLES.member).label + (isActive ? ' · 選択中' : '') + '</span>';
      btn.onclick = function() { setCurrentMember(m.name); bg.remove(); };
      html += btn.outerHTML;
    });
  } else {
    html += '<div style="font-family:var(--sans);font-size:12px;color:var(--text3);padding:12px 0">メンバーが登録されていません</div>';
  }

  if (current) {
    html += '<button id="clear-member-btn" style="width:100%;padding:10px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:12px;cursor:pointer;margin-top:4px">選択解除</button>';
  }

  modal.innerHTML = html;
  bg.appendChild(modal);
  document.getElementById('app').appendChild(bg);

  // イベント設定（outerHTMLでonclickが使えないため）
  members.forEach(function(m, idx) {
    const btns = modal.querySelectorAll('button');
    if (btns[idx]) {
      btns[idx].onclick = function() { setCurrentMember(m.name); bg.remove(); };
    }
  });
  const clearBtn = document.getElementById('clear-member-btn');
  if (clearBtn) clearBtn.onclick = function() { setCurrentMember(''); bg.remove(); };
}

// メンバー管理モーダル（admin用）
function showMemberManageModal() {
  if (!requireAdmin()) return;
  const members = getMembers();
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };
  const modal = document.createElement('div');
  modal.className = 'modal';

  const memberList = members.length
    ? members.map(function(m) {
        return '<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--border)">'
          + '<div style="flex:1"><div style="font-size:13px;font-weight:600">' + m.name + '</div>'
          + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">' + (USER_ROLES[m.role]||USER_ROLES.member).label + '</div></div>'
          + '<select onchange="changeMemberRole(' + m.id + ',this.value)" style="font-family:var(--sans);font-size:11px;padding:3px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg)">'
          + '<option value="member"' + (m.role==='member'?' selected':'') + '>メンバー</option>'
          + '<option value="admin"' + (m.role==='admin'?' selected':'') + '>管理者</option>'
          + '</select>'
          + '<button onclick="removeMemberById(' + m.id + ')" style="padding:4px 8px;background:var(--red-bg);color:var(--red);border:none;border-radius:6px;font-size:11px;cursor:pointer">削除</button>'
          + '</div>';
      }).join('')
    : '<div style="font-family:var(--sans);font-size:12px;color:var(--text3);padding:12px 0">メンバーがいません</div>';

  modal.innerHTML = '<div class="modal-title">メンバー管理</div>'
    + '<div class="form-row"><label class="form-label">名前</label>'
    + '<input id="new-member-name" class="form-inp" placeholder="例：田中、山本、経理担当 など"></div>'
    + '<div class="form-row"><label class="form-label">権限</label>'
    + '<select id="new-member-role" class="form-select"><option value="member">メンバー</option><option value="admin">管理者</option></select></div>'
    + '<button onclick="addMemberFromModal()" style="width:100%;padding:10px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;margin-bottom:14px">追加する</button>'
    + '<div style="max-height:240px;overflow-y:auto">' + memberList + '</div>';

  bg.appendChild(modal);
  document.getElementById('app').appendChild(bg);
}

function addMemberFromModal() {
  const name = document.getElementById('new-member-name').value.trim();
  const role = document.getElementById('new-member-role').value;
  if (!name) { showToast('名前を入力してください'); return; }
  addMember(name, role);
  document.querySelector('.modal-bg').remove();
  showMemberManageModal();
}

function removeMemberById(id) {
  removeMember(id);
  document.querySelector('.modal-bg').remove();
  showMemberManageModal();
}

function changeMemberRole(id, role) {
  const a = accounts[currentAcct];
  const m = (a.members||[]).find(function(x) { return x.id === id; });
  if (m) { m.role = role; save(currentAcct); }
}

// ── 3. 入力者を仕訳に保存 ──
function attachMemberToJournal(journal) {
  const member = getCurrentMember();
  if (member) journal.input_by = member;
  journal.input_at = new Date().toISOString();
  return journal;
}

// ── 4. 登録者別ダッシュボード集計 ──
function calcMemberStats(a) {
  const journals = a.journals || [];
  const stats = {};
  journals.forEach(function(j) {
    const name = j.input_by || '（未設定）';
    if (!stats[name]) stats[name] = { count: 0, amount: 0, last_at: '' };
    stats[name].count++;
    stats[name].amount += j.type === 'expense' ? (j.amount || 0) : 0;
    if (!stats[name].last_at || j.input_at > stats[name].last_at) {
      stats[name].last_at = j.input_at || j.date || '';
    }
  });
  return stats;
}

function renderMemberStats() {
  const el = document.getElementById('member-stats-card');
  if (!el) return;
  const a = accounts[currentAcct];
  if (!a) return;
  const stats = calcMemberStats(a);
  const entries = Object.entries(stats);
  if (!entries.length) { el.innerHTML = ''; return; }

  el.innerHTML = '<div class="card-title">登録者別入力状況</div>'
    + entries.map(function(entry) {
        const name = entry[0], s = entry[1];
        const lastDate = s.last_at ? s.last_at.slice(0,10) : '—';
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">'
          + '<div style="flex:1"><div style="font-size:13px;font-weight:600">' + name + '</div>'
          + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">最終: ' + lastDate + '</div></div>'
          + '<div style="text-align:right"><div style="font-size:13px;font-weight:700">' + s.count + '件</div>'
          + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">' + s.amount.toLocaleString() + '円</div></div>'
          + '</div>';
      }).join('');
}

// ── 5. 仕訳帳の登録者別フィルタ ──
function filterJournalsByMember(journals, memberName) {
  if (!memberName) return journals;
  return journals.filter(function(j) {
    return (j.input_by || '（未設定）') === memberName;
  });
}

function getMemberFilterOptions(journals) {
  const names = {};
  journals.forEach(function(j) { names[j.input_by || '（未設定）'] = true; });
  return Object.keys(names);
}


// ══════════════════════════════════════════════════════════════
//  レシート重複・監査ログ
// 1. 重複検出ロジック
// 2. ダッシュボード赤警告
// 3. ワンクリック削除
// 4. 監査ログ保存・表示
// ══════════════════════════════════════════════════════════════

// ── 1. 重複検出 ──
function findDuplicateReceipts(journals) {
  const seen = {};
  const duplicates = [];
  journals.forEach(function(j) {
    const key = j.date + '_' + j.amount + '_' + (j.description || '').trim().slice(0, 20);
    if (seen[key]) {
      // 両方を重複候補に追加
      if (!duplicates.find(function(d) { return d.id === seen[key].id; })) {
        duplicates.push(seen[key]);
      }
      duplicates.push(j);
    } else {
      seen[key] = j;
    }
  });
  return duplicates;
}

function getDuplicateCount(a) {
  return findDuplicateReceipts(a.journals || []).length;
}

// ── 2. ダッシュボード赤警告 ──
function renderDuplicateWarning() {
  const el = document.getElementById('duplicate-warning');
  if (!el) return;
  const a = accounts[currentAcct];
  if (!a) return;
  const dups = findDuplicateReceipts(a.journals || []);
  if (!dups.length) { el.innerHTML = ''; return; }

  el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;'
    + 'background:var(--red-bg);border:1px solid rgba(204,51,51,.25);border-radius:var(--radius);'
    + 'cursor:pointer" onclick="showDuplicateModal()">'
    + '<span style="font-size:18px"></span>'
    + '<div style="flex:1">'
    + '<div style="font-family:var(--sans);font-size:12px;font-weight:700;color:var(--red)">重複の可能性がある仕訳が ' + dups.length + ' 件あります</div>'
    + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">タップして確認・削除</div>'
    + '</div>'
    + '<span style="font-size:22px;font-weight:900;color:var(--red)">' + dups.length + '</span>'
    + '</div>';
}

// ── 3. 重複モーダル・ワンクリック削除 ──
function showDuplicateModal() {
  const a = accounts[currentAcct];
  const dups = findDuplicateReceipts(a.journals || []);
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '480px';

  let inner = '<div class="modal-title">重複候補 (' + dups.length + '件)</div>'
    + '<div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:12px">同一日付・金額・摘要の仕訳です。不要な方を削除してください。</div>';

  dups.forEach(function(j) {
    inner += '<div style="display:flex;align-items:flex-start;gap:8px;padding:10px 0;border-bottom:1px solid var(--border)">'
      + '<div style="flex:1"><div style="font-size:13px;font-weight:600">' + (j.description || '') + '</div>'
      + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">'
      + j.date + ' · ' + j.category + ' · ' + (j.amount||0).toLocaleString() + '円'
      + (j.input_by ? ' · ' + j.input_by : '') + '</div></div>'
      + '<button data-jid="' + j.id + '" class="dup-del-btn" '
      + 'style="padding:5px 10px;background:var(--red-bg);color:var(--red);border:1px solid rgba(204,51,51,.2);border-radius:6px;font-family:var(--sans);font-size:11px;cursor:pointer;white-space:nowrap">削除</button>'
      + '</div>';
  });

  modal.innerHTML = inner;
  bg.appendChild(modal);
  document.getElementById('app').appendChild(bg);

  modal.querySelectorAll('.dup-del-btn').forEach(function(btn) {
    btn.onclick = function() {
      deleteJournalWithLog(btn.dataset.jid, '重複削除');
      bg.remove();
      renderDuplicateWarning();
      renderDashboard();
    };
  });
}

function deleteJournalWithLog(journalId, reason) {
  const a = accounts[currentAcct];
  if (!a || !a.journals) return;
  const j = a.journals.find(function(x) { return String(x.id) === String(journalId); });
  if (!j) return;
  addAuditLog('delete', 'journal', j, reason || '手動削除');
  a.journals = a.journals.filter(function(x) { return String(x.id) !== String(journalId); });
  save(currentAcct);
  updateKPI();
  renderSidebar();
  showToast('削除しました');
}

// ── 4. 監査ログ ──
function addAuditLog(action, target, data, note) {
  const a = accounts[currentAcct];
  if (!a) return;
  if (!a.audit_logs) a.audit_logs = [];
  a.audit_logs.unshift({
    id: Date.now(),
    action: action,       // create / update / delete / lock / unlock
    target: target,       // journal / receipt / setting
    data_snapshot: {
      id: data.id,
      date: data.date,
      description: data.description,
      amount: data.amount,
      category: data.category,
    },
    note: note || '',
    operator: getCurrentMember() || 'system',
    operated_at: new Date().toISOString(),
  });
  // 最大200件
  if (a.audit_logs.length > 200) a.audit_logs = a.audit_logs.slice(0, 200);
}

function renderAuditLog() {
  const a = accounts[currentAcct];
  const logs = (a && a.audit_logs) || [];
  const el = document.getElementById('audit-log-list');
  if (!el) return;

  const ACTION_LABELS = {
    create: { label: '登録', color: 'var(--green)' },
    update: { label: '修正', color: 'var(--blue)' },
    delete: { label: '削除', color: 'var(--red)' },
    lock:   { label: '締め', color: 'var(--yellow)' },
    unlock: { label: '締め解除', color: 'var(--yellow)' },
  };

  if (!logs.length) {
    el.innerHTML = '<div style="font-family:var(--sans);font-size:12px;color:var(--text3);padding:12px 0">操作履歴はありません</div>';
    return;
  }

  el.innerHTML = logs.slice(0, 30).map(function(log) {
    const act = ACTION_LABELS[log.action] || { label: log.action, color: 'var(--text3)' };
    const dt = new Date(log.operated_at).toLocaleString('ja-JP', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
    const d = log.data_snapshot || {};
    return '<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:11px">'
      + '<span style="font-family:var(--sans);font-weight:700;color:' + act.color + ';min-width:40px">' + act.label + '</span>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)">' + (d.description || log.target) + '</div>'
      + '<div style="font-family:var(--sans);font-size:9px;color:var(--text3)">'
      + (d.amount ? d.amount.toLocaleString() + '円 · ' : '')
      + (log.note || '') + ' · ' + (log.operator || '') + '</div>'
      + '</div>'
      + '<span style="font-family:var(--sans);font-size:9px;color:var(--text3);white-space:nowrap">' + dt + '</span>'
      + '</div>';
  }).join('');
}

function showAuditLogModal() {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '480px';
  modal.innerHTML = '<div class="modal-title"> 操作履歴</div>'
    + '<div id="audit-log-list"></div>';
  bg.appendChild(modal);
  document.getElementById('app').appendChild(bg);
  renderAuditLog();
}


// ══════════════════════════════════════════════════════════════
//  freee差異・履歴・再送・状態管理
// 1. 送信状態管理（未送信/送信中/送信済み/エラー）
// 2. エラー再送信
// 3. 送信取消（未送信に戻す）
// 4. 差異検出・警告
// 5. 差異詳細比較・一括修正
// ══════════════════════════════════════════════════════════════

// ── 1. 送信状態管理 ──
function updateFreeeStatus(journalId, status, detail) {
  const a = accounts[currentAcct];
  const j = (a.journals||[]).find(function(x){ return String(x.id)===String(journalId); });
  if (!j) return;
  const prev = getFreeeStatus(j);
  j.freee_status = status;
  j.freee_sent = (status === 'sent');
  j.freee_sending = (status === 'sending');
  j.freee_error = (status === 'error') ? (detail || 'エラーが発生しました') : null;
  j.freee_sent_at = (status === 'sent') ? new Date().toISOString() : j.freee_sent_at;
  addAuditLog('update', 'journal', j, 'freee状態変更: ' + prev + ' → ' + status);
  addFreeeLog(currentAcct, j, status, detail || '');
  save(currentAcct);
}

// ── 2. エラー再送信 ──
async function retrySendToFreee(journalId) {
  const a = accounts[currentAcct];
  const j = (a.journals||[]).find(function(x){ return String(x.id)===String(journalId); });
  if (!j) return;
  showLoading('freeeに再送信中...');
  updateFreeeStatus(journalId, 'sending');
  try {
    // freee APIが設定済みなら実際に送信
    if (a.freee_config && a.freee_config.connected && typeof sendSingleJournalToFreee === 'function') {
      await sendSingleJournalToFreee(j);
    } else {
      // デモ: 1秒後に送信済みに
      await new Promise(function(r){ setTimeout(r, 1000); });
      updateFreeeStatus(journalId, 'sent', '再送信成功');
    }
    showToast('再送信しました');
  } catch(e) {
    updateFreeeStatus(journalId, 'error', e.message || '再送信失敗');
    showToast('再送信に失敗しました');
  } finally {
    hideLoading();
    if (typeof renderFreee === 'function') renderFreee();
  }
}

// ── 3. 送信取消（未送信に戻す） ──
function revertFreeeStatus(journalId) {
  const a = accounts[currentAcct];
  const j = (a.journals||[]).find(function(x){ return String(x.id)===String(journalId); });
  if (!j) return;
  if (!requireAdmin()) return;
  j.freee_status = 'unsent';
  j.freee_sent = false;
  j.freee_sending = false;
  j.freee_error = null;
  j.freee_deal_id = null;
  j.freee_sent_at = null;
  addAuditLog('update', 'journal', j, 'freee送信取消');
  save(currentAcct);
  showToast('未送信に戻しました');
  if (typeof renderFreee === 'function') renderFreee();
}

// ── 4. 差異検出 ──
function detectFreeeMismatch(journal) {
  if (!journal.freee_data) return [];
  const diffs = [];
  const f = journal.freee_data;
  if (f.amount && f.amount !== journal.amount) {
    diffs.push({ field: '金額', local: journal.amount, freee: f.amount });
  }
  if (f.category && f.category !== journal.category) {
    diffs.push({ field: '勘定科目', local: journal.category, freee: f.category });
  }
  if (f.date && f.date !== journal.date) {
    diffs.push({ field: '日付', local: journal.date, freee: f.date });
  }
  if (f.description && f.description !== journal.description) {
    diffs.push({ field: '摘要', local: journal.description, freee: f.description });
  }
  return diffs;
}

function getMismatchedJournals(a) {
  return (a.journals||[]).filter(function(j) {
    if (!j.freee_sent || !j.freee_data) return false;
    return detectFreeeMismatch(j).length > 0;
  });
}

function renderFreeeMismatchWarning() {
  const el = document.getElementById('freee-mismatch-warning');
  if (!el) return;
  const a = accounts[currentAcct];
  if (!a) return;
  const mismatched = getMismatchedJournals(a);
  if (!mismatched.length) { el.innerHTML = ''; return; }

  const totalDiffAmount = mismatched.reduce(function(s, j) {
    const diff = j.freee_data ? Math.abs((j.freee_data.amount||0) - (j.amount||0)) : 0;
    return s + diff;
  }, 0);

  el.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;'
    + 'background:var(--yellow-bg);border:1px solid rgba(170,119,0,.25);border-radius:var(--radius);'
    + 'margin-bottom:10px;cursor:pointer" onclick="showMismatchModal()">'
    + '<span style="font-size:18px">⚡</span>'
    + '<div style="flex:1">'
    + '<div style="font-family:var(--sans);font-size:12px;font-weight:700;color:var(--yellow)">freeeと差異がある仕訳 ' + mismatched.length + '件</div>'
    + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">差異金額合計: ' + totalDiffAmount.toLocaleString() + '円</div>'
    + '</div>'
    + '<span style="font-family:var(--sans);font-size:11px;color:var(--yellow)">詳細 →</span>'
    + '</div>';
}

// ── 5. 差異詳細・一括修正 ──
function showMismatchModal() {
  const a = accounts[currentAcct];
  const mismatched = getMismatchedJournals(a);
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '520px';

  let inner = '<div class="modal-title">⚡ freee差異一覧 (' + mismatched.length + '件)</div>';

  mismatched.forEach(function(j) {
    const diffs = detectFreeeMismatch(j);
    inner += '<div style="padding:10px 0;border-bottom:1px solid var(--border)">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
      + '<div style="font-size:13px;font-weight:600">' + (j.description||'') + '</div>'
      + '<div style="display:flex;gap:4px">'
      + '<button data-jid="' + j.id + '" class="apply-local-btn" style="padding:4px 8px;background:var(--blue-bg);color:var(--blue);border:1px solid rgba(26,74,138,.2);border-radius:6px;font-size:10px;cursor:pointer">帳場を適用</button>'
      + '<button data-jid="' + j.id + '" class="apply-freee-btn" style="padding:4px 8px;background:var(--green-bg);color:var(--green);border:1px solid rgba(42,122,80,.2);border-radius:6px;font-size:10px;cursor:pointer">freeeを適用</button>'
      + '</div></div>';
    diffs.forEach(function(d) {
      inner += '<div style="display:flex;gap:8px;font-family:var(--sans);font-size:10px;padding:2px 0">'
        + '<span style="color:var(--text3);min-width:56px">' + d.field + '</span>'
        + '<span style="color:var(--blue)">帳場: ' + d.local + '</span>'
        + '<span style="color:var(--text3)">→</span>'
        + '<span style="color:var(--green)">freee: ' + d.freee + '</span>'
        + '</div>';
    });
    inner += '</div>';
  });

  if (mismatched.length > 1) {
    inner += '<div style="display:flex;gap:8px;margin-top:12px">'
      + '<button id="apply-all-local" style="flex:1;padding:10px;background:var(--blue-bg);color:var(--blue);border:1px solid rgba(26,74,138,.2);border-radius:var(--radius);font-family:var(--font);font-size:12px;cursor:pointer">全て帳場を基準に修正</button>'
      + '<button id="apply-all-freee" style="flex:1;padding:10px;background:var(--green-bg);color:var(--green);border:1px solid rgba(42,122,80,.2);border-radius:var(--radius);font-family:var(--font);font-size:12px;cursor:pointer">全てfreeeを基準に修正</button>'
      + '</div>';
  }

  modal.innerHTML = inner;
  bg.appendChild(modal);
  document.getElementById('app').appendChild(bg);

  // イベント設定
  modal.querySelectorAll('.apply-local-btn').forEach(function(btn) {
    btn.onclick = function() { applyLocalToFreee(btn.dataset.jid); bg.remove(); renderFreeeMismatchWarning(); };
  });
  modal.querySelectorAll('.apply-freee-btn').forEach(function(btn) {
    btn.onclick = function() { applyFreeeToLocal(btn.dataset.jid); bg.remove(); renderFreeeMismatchWarning(); };
  });
  const allLocalBtn = document.getElementById('apply-all-local');
  if (allLocalBtn) allLocalBtn.onclick = function() {
    mismatched.forEach(function(j) { applyLocalToFreee(j.id); });
    bg.remove(); renderFreeeMismatchWarning(); showToast('全て帳場基準で修正しました');
  };
  const allFreeeBtn = document.getElementById('apply-all-freee');
  if (allFreeeBtn) allFreeeBtn.onclick = function() {
    mismatched.forEach(function(j) { applyFreeeToLocal(j.id); });
    bg.remove(); renderFreeeMismatchWarning(); showToast('全てfreee基準で修正しました');
  };
}

function applyLocalToFreee(journalId) {
  const a = accounts[currentAcct];
  const j = (a.journals||[]).find(function(x){ return String(x.id)===String(journalId); });
  if (!j || !j.freee_data) return;
  j.freee_data.amount = j.amount;
  j.freee_data.category = j.category;
  j.freee_data.date = j.date;
  j.freee_data.description = j.description;
  j.freee_mismatch = false;
  addAuditLog('update', 'journal', j, 'freee差異: 帳場を適用');
  save(currentAcct);
}

function applyFreeeToLocal(journalId) {
  const a = accounts[currentAcct];
  const j = (a.journals||[]).find(function(x){ return String(x.id)===String(journalId); });
  if (!j || !j.freee_data) return;
  const f = j.freee_data;
  if (f.amount) j.amount = f.amount;
  if (f.category) j.category = f.category;
  if (f.date) j.date = f.date;
  if (f.description) j.description = f.description;
  j.freee_mismatch = false;
  addAuditLog('update', 'journal', j, 'freee差異: freeeを適用');
  save(currentAcct);
}


// ══════════════════════════════════════════════════════════════
// バッチ① 帳簿統制：月次締め・Undo・ソート・ページング・デバウンス・試算表
// ══════════════════════════════════════════════════════════════

// ── 月次締め ──
function lockMonth(yearMonth) {
  if (!requireAdmin()) return;
  const a = accounts[currentAcct];
  if (!a.locked_months) a.locked_months = [];
  if (!a.locked_months.includes(yearMonth)) {
    a.locked_months.push(yearMonth);
    addAuditLog('lock', 'journal', { id: yearMonth, description: yearMonth + ' 月次締め' }, '月次締め');
    save(currentAcct);
    showToast(yearMonth + ' を締めました');
    renderJournal && renderJournal();
  }
}

function unlockMonth(yearMonth) {
  if (!requireAdmin()) return;
  const a = accounts[currentAcct];
  if (!a.locked_months) return;
  a.locked_months = a.locked_months.filter(function(m) { return m !== yearMonth; });
  addAuditLog('unlock', 'journal', { id: yearMonth, description: yearMonth + ' 締め解除' }, '締め解除');
  save(currentAcct);
  showToast(yearMonth + ' の締めを解除しました');
  renderJournal && renderJournal();
}

function isMonthLocked(date) {
  const a = accounts[currentAcct];
  if (!a || !a.locked_months) return false;
  const ym = (date || '').slice(0, 7);
  return a.locked_months.includes(ym);
}

function getLockedMonths() {
  const a = accounts[currentAcct];
  return (a && a.locked_months) || [];
}

function showLockModal() {
  const a = accounts[currentAcct];
  const locked = getLockedMonths();
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    months.push(ym);
  }
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };
  const modal = document.createElement('div');
  modal.className = 'modal';
  let inner = '<div class="modal-title">月次締め管理</div>';
  inner += '<div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:12px">締めた月は一般ユーザーが編集できなくなります</div>';
  months.forEach(function(ym) {
    const isLocked = locked.includes(ym);
    inner += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">'
      + '<span style="font-family:var(--sans);font-size:13px;font-weight:600;flex:1">' + ym + '</span>'
      + '<span style="font-family:var(--sans);font-size:10px;color:' + (isLocked ? 'var(--green)' : 'var(--text3)') + '">' + (isLocked ? '締め済み' : '未締め') + '</span>'
      + '<button data-ym="' + ym + '" data-locked="' + isLocked + '" class="lock-btn" style="padding:5px 12px;background:' + (isLocked ? 'var(--yellow-bg)' : 'var(--text)') + ';color:' + (isLocked ? 'var(--yellow)' : '#fff') + ';border:none;border-radius:6px;font-family:var(--sans);font-size:11px;cursor:pointer">' + (isLocked ? '解除' : '締める') + '</button>'
      + '</div>';
  });
  modal.innerHTML = inner;
  bg.appendChild(modal);
  document.getElementById('app').appendChild(bg);
  modal.querySelectorAll('.lock-btn').forEach(function(btn) {
    btn.onclick = function() {
      if (btn.dataset.locked === 'true') unlockMonth(btn.dataset.ym);
      else lockMonth(btn.dataset.ym);
      bg.remove();
      showLockModal();
    };
  });
}

// ── Undo ──
const UNDO_STACK = [];
const UNDO_MAX = 20;

function pushUndo(action, data) {
  UNDO_STACK.push({ action: action, data: JSON.parse(JSON.stringify(data)), ts: Date.now() });
  if (UNDO_STACK.length > UNDO_MAX) UNDO_STACK.shift();
}

function undo() {
  if (!UNDO_STACK.length) { showToast('元に戻せる操作がありません'); return; }
  const last = UNDO_STACK.pop();
  const a = accounts[currentAcct];
  if (last.action === 'delete_journal') {
    if (!a.journals) a.journals = [];
    a.journals.push(last.data);
    a.journals.sort(function(x,y) { return y.date.localeCompare(x.date); });
    showToast('削除を取り消しました');
  } else if (last.action === 'update_journal') {
    const idx = a.journals.findIndex(function(j) { return String(j.id) === String(last.data.id); });
    if (idx >= 0) a.journals[idx] = last.data;
    showToast('編集を取り消しました');
  } else if (last.action === 'add_journal') {
    a.journals = (a.journals||[]).filter(function(j) { return String(j.id) !== String(last.data.id); });
    showToast('追加を取り消しました');
  }
  save(currentAcct);
  renderDashboard && renderDashboard();
  renderJournal && renderJournal();
}

// ── デバウンス ──
function debounce(fn, delay) {
  let timer;
  return function() {
    const args = arguments;
    const ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function() { fn.apply(ctx, args); }, delay || 300);
  };
}

// ── ソート ──
function sortJournals(journals, key, dir) {
  const d = dir === 'asc' ? 1 : -1;
  return journals.slice().sort(function(a, b) {
    if (key === 'date') return d * a.date.localeCompare(b.date);
    if (key === 'amount') return d * ((a.amount||0) - (b.amount||0));
    if (key === 'category') return d * (a.category||'').localeCompare(b.category||'');
    if (key === 'input_by') return d * (a.input_by||'').localeCompare(b.input_by||'');
    return 0;
  });
}

// ── ページング ──
function paginateJournals(journals, page, perPage) {
  const p = page || 1;
  const pp = perPage || 50;
  const total = journals.length;
  const pages = Math.ceil(total / pp);
  const items = journals.slice((p-1)*pp, p*pp);
  return { items: items, page: p, pages: pages, total: total };
}

function renderPagination(page, pages, onPage) {
  if (pages <= 1) return '';
  let html = '<div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:12px 0;font-family:var(--sans);font-size:12px">';
  if (page > 1) html += '<button onclick="(' + onPage.toString() + ')(' + (page-1) + ')" style="padding:4px 10px;border:1px solid var(--border);border-radius:6px;cursor:pointer;background:var(--bg)">←</button>';
  html += '<span style="color:var(--text3)">' + page + ' / ' + pages + 'ページ</span>';
  if (page < pages) html += '<button onclick="(' + onPage.toString() + ')(' + (page+1) + ')" style="padding:4px 10px;border:1px solid var(--border);border-radius:6px;cursor:pointer;background:var(--bg)">→</button>';
  html += '</div>';
  return html;
}

// ── 試算表 ──
function calcTrialBalance(a) {
  const journals = a.journals || [];
  const byCategory = {};
  journals.forEach(function(j) {
    const cat = j.category || '未分類';
    if (!byCategory[cat]) byCategory[cat] = { debit: 0, credit: 0 };
    if (j.type === 'income') byCategory[cat].credit += j.amount || 0;
    else byCategory[cat].debit += j.amount || 0;
  });
  const totalIncome = journals.filter(function(j){ return j.type==='income'; }).reduce(function(s,j){ return s+(j.amount||0); }, 0);
  const totalExpense = journals.filter(function(j){ return j.type==='expense'; }).reduce(function(s,j){ return s+(j.amount||0); }, 0);
  return { byCategory: byCategory, totalIncome: totalIncome, totalExpense: totalExpense, profit: totalIncome - totalExpense };
}

function renderTrialBalance() {
  const a = accounts[currentAcct];
  if (!a) return;
  const tb = calcTrialBalance(a);
  const el = document.getElementById('main-content');
  if (!el) return;

  const rows = Object.entries(tb.byCategory).map(function(entry) {
    const cat = entry[0], v = entry[1];
    return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px">'
      + '<span style="color:var(--text2)">' + cat + '</span>'
      + '<div style="display:flex;gap:16px;font-family:var(--sans)">'
      + '<span style="color:var(--text3);min-width:80px;text-align:right">' + (v.debit ? v.debit.toLocaleString()+'円' : '—') + '</span>'
      + '<span style="color:var(--green);min-width:80px;text-align:right">' + (v.credit ? v.credit.toLocaleString()+'円' : '—') + '</span>'
      + '</div></div>';
  }).join('');

  el.innerHTML = '<div class="card">'
    + '<div class="card-title">試算表</div>'
    + '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:2px solid var(--border);font-family:var(--sans);font-size:10px;color:var(--text3)">'
    + '<span>科目</span><div style="display:flex;gap:16px"><span style="min-width:80px;text-align:right">借方（費用）</span><span style="min-width:80px;text-align:right">貸方（収益）</span></div></div>'
    + rows
    + '<div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700;font-size:13px">'
    + '<span>合計</span><div style="display:flex;gap:16px;font-family:var(--sans)">'
    + '<span style="min-width:80px;text-align:right">' + tb.totalExpense.toLocaleString() + '円</span>'
    + '<span style="color:var(--green);min-width:80px;text-align:right">' + tb.totalIncome.toLocaleString() + '円</span>'
    + '</div></div>'
    + '<div style="background:var(--bg3);padding:10px;border-radius:8px;margin-top:8px;display:flex;justify-content:space-between;align-items:center">'
    + '<span style="font-family:var(--sans);font-size:12px">当期純利益</span>'
    + '<span style="font-size:18px;font-weight:900;color:' + (tb.profit>=0?'var(--green)':'var(--red)') + '">' + tb.profit.toLocaleString() + '円</span>'
    + '</div></div>';
}


// ══════════════════════════════════════════════════════════════
// バッチ② 資金繰り・グラフ・KPI
// ══════════════════════════════════════════════════════════════

// ── 資金繰り（6ヶ月先） ──
function getCashflowPlan(a) {
  return (a && a.cashflow_plan) || [];
}

function saveCashflowPlan(plan) {
  const a = accounts[currentAcct];
  if (!a) return;
  a.cashflow_plan = plan;
  save(currentAcct);
}

function calcCashflow(a, startBalance) {
  const plan = getCashflowPlan(a);
  const journals = a.journals || [];
  const now = new Date();
  const months = [];

  // 過去3ヶ月の実績を取得
  const past3 = [];
  for (let i = 3; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    const income = journals.filter(function(j){ return j.type==='income' && (j.date||'').startsWith(ym); }).reduce(function(s,j){ return s+(j.amount||0); }, 0);
    const expense = journals.filter(function(j){ return j.type==='expense' && (j.date||'').startsWith(ym); }).reduce(function(s,j){ return s+(j.amount||0); }, 0);
    past3.push({ ym:ym, income:income, expense:expense });
  }

  // 平均・伸び率を計算
  const avgIncome = past3.reduce(function(s,m){ return s+m.income; }, 0) / (past3.length || 1);
  const avgExpense = past3.reduce(function(s,m){ return s+m.expense; }, 0) / (past3.length || 1);

  // 伸び率（3ヶ月前→直近月の変化率、月次平均）
  const incomeGrowth = past3.length >= 2 && past3[0].income > 0
    ? Math.pow(past3[past3.length-1].income / past3[0].income, 1/(past3.length-1)) - 1
    : 0;
  const expenseGrowth = past3.length >= 2 && past3[0].expense > 0
    ? Math.pow(past3[past3.length-1].expense / past3[0].expense, 1/(past3.length-1)) - 1
    : 0;

  // 伸び率は最大±5%/月に制限（外れ値対策）
  const cappedIncomeGrowth = Math.max(-0.05, Math.min(0.05, incomeGrowth));
  const cappedExpenseGrowth = Math.max(-0.05, Math.min(0.05, expenseGrowth));

  // 6ヶ月分を生成
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const ym = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    const label = (d.getMonth()+1) + '月';
    const isCurrentMonth = i === 0;

    // 今月は実績、来月以降は予測
    let income, expense, isActual, isForecast;

    if (isCurrentMonth) {
      // 今月: 実績
      income = journals.filter(function(j){ return j.type==='income' && (j.date||'').startsWith(ym); }).reduce(function(s,j){ return s+(j.amount||0); }, 0);
      expense = journals.filter(function(j){ return j.type==='expense' && (j.date||'').startsWith(ym); }).reduce(function(s,j){ return s+(j.amount||0); }, 0);
      isActual = true;
      isForecast = false;
    } else {
      // 来月以降: 過去3ヶ月平均 × 伸び率^i で予測
      income = Math.round(avgIncome * Math.pow(1 + cappedIncomeGrowth, i));
      expense = Math.round(avgExpense * Math.pow(1 + cappedExpenseGrowth, i));
      isActual = false;
      isForecast = true;
    }

    // 手動登録の予定を加算
    const planned = plan.filter(function(p){ return p.ym === ym; });
    const plannedIncome = planned.filter(function(p){ return p.type==='income'; }).reduce(function(s,p){ return s+(p.amount||0); }, 0);
    const plannedExpense = planned.filter(function(p){ return p.type==='expense'; }).reduce(function(s,p){ return s+(p.amount||0); }, 0);
    income += plannedIncome;
    expense += plannedExpense;

    const net = income - expense;
    months.push({
      ym: ym, label: label,
      income: income, expense: expense, net: net,
      isActual: isActual, isForecast: isForecast,
      plannedIncome: plannedIncome, plannedExpense: plannedExpense,
    });
  }

  // 残高推移
  let balance = startBalance || 0;
  months.forEach(function(m) {
    m.openBalance = balance;
    balance += m.net;
    m.closeBalance = balance;
  });

  // 予測注記情報を付加
  months._forecastNote = {
    avgIncome: Math.round(avgIncome),
    avgExpense: Math.round(avgExpense),
    incomeGrowthPct: Math.round(cappedIncomeGrowth * 1000) / 10,
    expenseGrowthPct: Math.round(cappedExpenseGrowth * 1000) / 10,
    basePeriod: past3.filter(function(m){ return m.income > 0 || m.expense > 0; }).length,
  };

  return months;
}

function renderCashflow() {
  const a = accounts[currentAcct];
  if (!a) return;
  const startBalance = getTotalBankBalance ? getTotalBankBalance() : (a.bank_balance || 0);
  const months = calcCashflow(a, startBalance);
  const note = months._forecastNote || {};
  const el = document.getElementById('main-content');
  if (!el) return;

  // 初回残高未設定の案内
  const balanceWarning = !a.bank_balance
    ? '<div style="background:var(--yellow-bg);border:1px solid rgba(170,119,0,.2);border-radius:10px;padding:10px 14px;margin-bottom:10px;font-family:var(--sans);font-size:11px;color:var(--yellow);font-weight:600">銀行残高が未設定です。正確な予測のために残高を入力してください。</div>'
    : '';

  const canvasId = 'cashflow-canvas';

  let html = balanceWarning;

  // メインカード
  html += '<div class="card">'
    + '<div class="card-title">資金繰り予測（6ヶ月）'
    + '<button onclick="showCashflowEditModal()" style="font-family:var(--sans);font-size:10px;color:var(--blue);background:none;border:none;cursor:pointer;margin-left:8px">＋ 予定を追加</button>'
    + '</div>'
    + '<div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:10px">現在残高: <span style="font-size:18px;font-weight:900;color:var(--text)">' + startBalance.toLocaleString() + '円</span>'
    + ' <button onclick="editBankBalance()" style="font-size:10px;color:var(--blue);background:none;border:none;cursor:pointer">編集</button></div>'
    + '<canvas id="' + canvasId + '" width="600" height="200" style="width:100%;height:180px;display:block"></canvas>'
    + '</div>';

  // 月別カード（実績/予測を区別）
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">';
  months.forEach(function(m) {
    const isDanger = m.closeBalance < 0;
    const isWarning = startBalance > 0 && m.closeBalance < startBalance * 0.2;
    const color = isDanger ? 'var(--red)' : isWarning ? 'var(--yellow,#8b6914)' : 'var(--green)';
    const bg = isDanger ? 'var(--red-bg)' : isWarning ? 'rgba(170,119,0,0.06)' : 'var(--green-bg)';
    const borderStyle = m.isForecast ? 'border:1px dashed ' + (isDanger ? 'var(--red)' : 'var(--border)') + ';' : '';
    html += '<div style="background:' + bg + ';border-radius:10px;padding:10px;text-align:center;' + borderStyle + '">'
      + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-bottom:2px">' + m.label
      + (m.isForecast ? '<span style="font-size:8px;color:var(--text3)"> 予測</span>' : '<span style="font-size:8px;color:var(--green)"> 実績</span>') + '</div>'
      + '<div style="font-size:15px;font-weight:900;color:' + color + '">' + Math.round(m.closeBalance/10000) + '万円</div>'
      + '<div style="font-family:var(--sans);font-size:9px;color:var(--text3)">' + (m.net >= 0 ? '+' : '') + Math.round(m.net/10000) + '万</div>'
      + '</div>';
  });
  html += '</div>';

  // 入出金予定リスト
  const plan = getCashflowPlan(a);
  if (plan.length) {
    html += '<div class="card" style="margin-bottom:12px"><div class="card-title">登録済み予定</div>';
    plan.slice(-10).reverse().forEach(function(p) {
      html += '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-family:var(--sans);font-size:11px">'
        + '<span style="color:var(--text3);min-width:44px">' + p.ym.slice(5) + '月</span>'
        + '<span style="color:' + (p.type==='income' ? 'var(--green)' : 'var(--red)') + ';font-size:9px;font-weight:700;min-width:32px">' + (p.type==='income' ? '収入' : '支出') + '</span>'
        + '<span style="flex:1;color:var(--text2)">' + (p.desc||'') + '</span>'
        + '<span style="font-weight:700">' + (p.amount||0).toLocaleString() + '円</span>'
        + '</div>';
    });
    html += '</div>';
  }

  // 予測注記
  if (note.basePeriod > 0) {
    html += '<div style="background:var(--bg3);border-radius:10px;padding:12px 14px;margin-bottom:12px">'
      + '<div style="font-family:var(--sans);font-size:10px;font-weight:700;color:var(--text2);margin-bottom:6px">予測の算出方法</div>'
      + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3);line-height:1.7">'
      + '過去' + note.basePeriod + 'ヶ月の実績平均（売上 ' + (note.avgIncome||0).toLocaleString() + '円 / 経費 ' + (note.avgExpense||0).toLocaleString() + '円）をベースに、'
      + '月次伸び率（売上 ' + (note.incomeGrowthPct >= 0 ? '+' : '') + note.incomeGrowthPct + '% / 経費 ' + (note.expenseGrowthPct >= 0 ? '+' : '') + note.expenseGrowthPct + '%）を加味して複利計算。'
      + '伸び率は外れ値を除くため±5%/月に制限。手動登録した予定は実数値で加算。'
      + '</div></div>';
  } else {
    html += '<div style="background:var(--bg3);border-radius:10px;padding:12px 14px;margin-bottom:12px;font-family:var(--sans);font-size:10px;color:var(--text3)">仕訳データが3ヶ月分蓄積されると、過去実績をもとに売上・経費の予測精度が上がります。</div>';
  }

  el.innerHTML = html;

  // Canvas描画
  setTimeout(function() {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const pad = { top: 24, right: 20, bottom: 30, left: 56 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    const balances = months.map(function(m){ return m.closeBalance; });
    const allVals = balances.concat([startBalance]);
    const minV = Math.min.apply(null, allVals);
    const maxV = Math.max.apply(null, allVals);
    const range = (maxV - minV) || 1;
    const margin = range * 0.1;

    function xPos(i) { return pad.left + (i / (months.length - 1)) * cW; }
    function yPos(v) { return pad.top + cH - ((v - minV + margin) / (range + margin * 2)) * cH; }

    // グリッド線・縦軸ラベル
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#999990';
    ctx.textAlign = 'right';
    for (let g = 0; g <= 3; g++) {
      const v = minV + (range * g / 3);
      const y = yPos(v);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cW, y);
      ctx.stroke();
      const label = Math.abs(v) >= 10000
        ? Math.round(v/10000) + '万'
        : Math.round(v/1000) + '千';
      ctx.fillText(label, pad.left - 4, y + 3);
    }

    // ゼロライン
    if (minV < 0 && maxV > 0) {
      const zy = yPos(0);
      ctx.strokeStyle = 'rgba(204,51,51,0.4)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, zy);
      ctx.lineTo(pad.left + cW, zy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 実績部分の塗り（今月のみ）
    if (months.length > 0 && !months[0].isForecast) {
      ctx.fillStyle = 'rgba(42,122,80,0.07)';
      const x0 = xPos(0);
      const x1 = months.length > 1 ? xPos(1) : x0 + 40;
      const y0 = yPos(months[0].closeBalance);
      const yBase = yPos(minV);
      ctx.fillRect(x0 - 20, pad.top, x1 - x0 + 20, cH);
    }

    // 予測区間を点線で
    const forecastStart = months.findIndex(function(m){ return m.isForecast; });
    if (forecastStart > 0) {
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      const fx = xPos(forecastStart) - (xPos(1) - xPos(0)) / 2;
      ctx.beginPath();
      ctx.moveTo(fx, pad.top);
      ctx.lineTo(fx, pad.top + cH);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#999990';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('← 実績  予測 →', fx + 3, pad.top + 10);
    }

    // 折れ線
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    months.forEach(function(m, i) {
      const x = xPos(i), y = yPos(m.closeBalance);
      ctx.strokeStyle = m.isForecast ? 'rgba(42,122,80,0.5)' : '#2a7a50';
      if (i === 0) { ctx.moveTo(x, y); }
      else {
        if (m.isForecast && !months[i-1].isForecast) { ctx.stroke(); ctx.setLineDash([6,3]); ctx.beginPath(); ctx.moveTo(xPos(i-1), yPos(months[i-1].closeBalance)); }
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // 点とラベル
    months.forEach(function(m, i) {
      const x = xPos(i), y = yPos(m.closeBalance);
      const isDanger = m.closeBalance < 0;
      ctx.fillStyle = isDanger ? '#cc3333' : m.isForecast ? 'rgba(42,122,80,0.6)' : '#2a7a50';
      ctx.beginPath();
      ctx.arc(x, y, m.isForecast ? 3 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      // 月ラベル
      ctx.fillStyle = '#999990';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.label, x, H - 6);
    });
  }, 100);
}



function showCashflowEditModal() {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };
  const modal = document.createElement('div');
  modal.className = 'modal';
  const now = new Date();
  const ym = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');

  modal.innerHTML = '<div class="modal-title">入出金予定を追加</div>'
    + '<div class="form-row"><label class="form-label">対象月</label><input id="cf-ym" class="form-inp" type="month" value="' + ym + '"></div>'
    + '<div class="form-row"><label class="form-label">種別</label><select id="cf-type" class="form-select"><option value="income">収入予定</option><option value="expense">支出予定</option></select></div>'
    + '<div class="form-row"><label class="form-label">内容</label><input id="cf-desc" class="form-inp" placeholder="例：売上予定、家賃、税金など"></div>'
    + '<div class="form-row"><label class="form-label">金額</label><input id="cf-amount" class="form-inp" type="number" placeholder="0"></div>'
    + '<button id="cf-save-btn" style="width:100%;padding:12px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer">追加する</button>'
    + '<button id="cf-cancel-btn" style="width:100%;padding:10px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font);font-size:12px;cursor:pointer;margin-top:8px">閉じる</button>';

  bg.appendChild(modal);
  document.getElementById('app').appendChild(bg);
  document.getElementById('cf-save-btn').onclick = saveCashflowItem;
  document.getElementById('cf-cancel-btn').onclick = function() { bg.remove(); };
}

function saveCashflowItem() {
  const ym = document.getElementById('cf-ym').value;
  const type = document.getElementById('cf-type').value;
  const desc = document.getElementById('cf-desc').value.trim();
  const amount = parseInt(document.getElementById('cf-amount').value)||0;
  if (!ym || !desc || !amount) { showToast('全て入力してください'); return; }
  const a = accounts[currentAcct];
  if (!a.cashflow_plan) a.cashflow_plan = [];
  a.cashflow_plan.push({ id: Date.now(), ym: ym, type: type, desc: desc, amount: amount });
  save(currentAcct);
  document.querySelector('.modal-bg').remove();
  renderCashflow();
  showToast('予定を追加しました');
}

// ── KPI月別集計 ──
function calcMonthlyKPI(a, months) {
  const journals = a.journals || [];
  return (months || 6);
}

function getMonthlyData(a, numMonths) {
  const journals = a.journals || [];
  const now = new Date();
  const result = [];
  for (let i = (numMonths||6)-1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const ym = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    const label = (d.getMonth()+1) + '月';
    const income = journals.filter(function(j){ return j.type==='income' && (j.date||'').startsWith(ym); }).reduce(function(s,j){ return s+(j.amount||0); }, 0);
    const expense = journals.filter(function(j){ return j.type==='expense' && (j.date||'').startsWith(ym); }).reduce(function(s,j){ return s+(j.amount||0); }, 0);
    result.push({ ym: ym, label: label, income: income, expense: expense, profit: income-expense });
  }
  return result;
}

// Canvas複合グラフ（棒＋折れ線）
function drawMonthlyChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 20, right: 20, bottom: 30, left: 55 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;
  const n = data.length;
  const barW = cW / n * 0.35;

  ctx.clearRect(0, 0, W, H);

  const maxV = Math.max.apply(null, data.map(function(d){ return Math.max(d.income, d.expense); })) || 1;

  function xCenter(i) { return pad.left + (i + 0.5) * (cW / n); }
  function yPos(v) { return pad.top + cH - (v / maxV) * cH; }

  // 収入バー（緑）
  data.forEach(function(d, i) {
    const x = xCenter(i) - barW - 2;
    const h = (d.income / maxV) * cH;
    ctx.fillStyle = 'rgba(42,122,80,0.6)';
    ctx.fillRect(x, pad.top + cH - h, barW, h);
  });

  // 支出バー（グレー）
  data.forEach(function(d, i) {
    const x = xCenter(i) + 2;
    const h = (d.expense / maxV) * cH;
    ctx.fillStyle = 'rgba(200,195,190,0.8)';
    ctx.fillRect(x, pad.top + cH - h, barW, h);
  });

  // 利益折れ線
  ctx.strokeStyle = '#1a4a8a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  data.forEach(function(d, i) {
    const x = xCenter(i);
    const y = yPos(Math.max(d.profit, 0));
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // ラベル
  data.forEach(function(d, i) {
    ctx.fillStyle = '#999990';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, xCenter(i), H - 8);
  });
}


// ══════════════════════════════════════════════════════════════
// バッチ③ 購入品リスト・思い出記録・資料アップ
// ══════════════════════════════════════════════════════════════

// ── 購入品リスト ──
const ITEM_STATUS = {
  active:    { label: '使用中',     color: 'var(--green)' },
  unused:    { label: '未使用',     color: 'var(--yellow)' },
  discard:   { label: '断捨離候補', color: 'var(--red)' },
  sold:      { label: '売却済み',   color: 'var(--text3)' },
};

const ITEM_CATS = ['衣類','家電','家具','食品','日用品','書籍','趣味','その他'];

function getItems(email) {
  const a = accounts[email || currentAcct];
  return (a && a.purchase_items) || [];
}

function addPurchaseItem(item) {
  const a = accounts[currentAcct];
  if (!a.purchase_items) a.purchase_items = [];
  const newItem = {
    id: Date.now(),
    name: item.name || '',
    category: item.category || 'その他',
    amount: item.amount || 0,
    date: item.date || new Date().toISOString().slice(0,10),
    status: item.status || 'active',
    memo: item.memo || '',
    journal_id: item.journal_id || null,
    photos: item.photos || [],
    arrival_expected: item.arrival_expected || null,
    arrived: item.arrived || false,
    sold_amount: item.sold_amount || 0,
    created_at: new Date().toISOString(),
    input_by: getCurrentMember() || '',
  };
  a.purchase_items.push(newItem);
  save(currentAcct);
  return newItem;
}

function updateItemStatus(itemId, status) {
  const a = accounts[currentAcct];
  const item = (a.purchase_items||[]).find(function(x){ return x.id == itemId; });
  if (!item) return;
  item.status = status;
  if (status === 'arrived') item.arrived = true;
  save(currentAcct);
  showToast(ITEM_STATUS[status] ? ITEM_STATUS[status].label + 'に変更しました' : '更新しました');
}

function getUnusedItems() {
  const a = accounts[currentAcct];
  const items = a && a.purchase_items || [];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return items.filter(function(item) {
    return item.status === 'active' && new Date(item.date) < oneYearAgo;
  });
}

function renderPurchaseItems() {
  const el = document.getElementById('main-content');
  if (!el) return;
  const a = accounts[currentAcct];
  if (!a) return;
  const items = (a.purchase_items || []).slice().reverse();
  const unused = getUnusedItems();

  let html = '';

  if (unused.length) {
    html += '<div style="background:var(--yellow-bg);border:1px solid rgba(170,119,0,.25);border-radius:var(--radius);padding:12px 14px;margin-bottom:11px;cursor:pointer" onclick="filterItemsByStatus(\'unused\')">'
      + '<div style="font-family:var(--sans);font-size:12px;font-weight:700;color:var(--yellow)">! 1年以上使っていないものが ' + unused.length + '件あります</div>'
      + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">断捨離の候補を確認する</div>'
      + '</div>';
  }

  html += '<div style="display:flex;gap:8px;margin-bottom:11px">'
    + '<button onclick="showAddItemModal()" style="flex:1;padding:10px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer">＋ 購入品を追加</button>'
    + '<button onclick="filterItemsByStatus(\'discard\')" style="padding:10px 14px;background:var(--red-bg);color:var(--red);border:1px solid rgba(204,51,51,.2);border-radius:var(--radius);font-family:var(--sans);font-size:11px;cursor:pointer">断捨離リスト</button>'
    + '</div>';

  if (!items.length) {
    html += '<div style="text-align:center;padding:40px 20px;font-family:var(--sans);font-size:13px;color:var(--text3)">購入品がまだありません</div>';
  } else {
    html += '<div class="card" style="padding:0;overflow:hidden">';
    items.slice(0,30).forEach(function(item) {
      const st = ITEM_STATUS[item.status] || ITEM_STATUS.active;
      html += '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer" onclick="showItemDetail(' + item.id + ')">'
        + '<div style="flex:1;min-width:0">'
        + '<div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + item.name + '</div>'
        + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">' + item.date + ' · ' + item.category + (item.amount ? ' · ' + item.amount.toLocaleString() + '円' : '') + '</div>'
        + '</div>'
        + '<span style="font-family:var(--sans);font-size:10px;font-weight:700;color:' + st.color + ';white-space:nowrap">' + st.label + '</span>'
        + '</div>';
    });
    html += '</div>';
  }

  el.innerHTML = html;
}

function showAddItemModal() {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = '<div class="modal-title">購入品を追加</div>'
    + '<div class="form-row"><label class="form-label">品名</label><input id="item-name" class="form-inp" placeholder="例：ユニクロ ダウンジャケット"></div>'
    + '<div class="form-row"><label class="form-label">カテゴリ</label><select id="item-cat" class="form-select">' + ITEM_CATS.map(function(c){ return '<option>'+c+'</option>'; }).join('') + '</select></div>'
    + '<div class="form-row"><label class="form-label">金額</label><input id="item-amount" class="form-inp" type="number" placeholder="0"></div>'
    + '<div class="form-row"><label class="form-label">購入日</label><input id="item-date" class="form-inp" type="date" value="' + new Date().toISOString().slice(0,10) + '"></div>'
    + '<div class="form-row"><label class="form-label">メモ</label><input id="item-memo" class="form-inp" placeholder="任意"></div>'
    + '<div class="form-row"><label class="form-label">到着予定日</label><input id="item-arrival" class="form-inp" type="date"></div>'
    + '<button id="item-save-btn" style="width:100%;padding:12px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;margin-top:4px">登録する</button>';
  bg.appendChild(modal);
  document.getElementById('app').appendChild(bg);
  document.getElementById('item-save-btn').onclick = function() {
    const name = document.getElementById('item-name').value.trim();
    if (!name) { showToast('品名を入力してください'); return; }
    addPurchaseItem({
      name: name,
      category: document.getElementById('item-cat').value,
      amount: parseInt(document.getElementById('item-amount').value)||0,
      date: document.getElementById('item-date').value,
      memo: document.getElementById('item-memo').value,
      arrival_expected: document.getElementById('item-arrival').value || null,
    });
    bg.remove();
    renderPurchaseItems();
    showToast('登録しました');
  };
}

function showItemDetail(itemId) {
  const a = accounts[currentAcct];
  const item = (a.purchase_items||[]).find(function(x){ return x.id == itemId; });
  if (!item) return;
  const st = ITEM_STATUS[item.status] || ITEM_STATUS.active;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = '<div class="modal-title">' + item.name + '</div>'
    + '<div style="font-family:var(--sans);font-size:12px;color:var(--text3);margin-bottom:14px">' + item.date + ' · ' + item.category + (item.amount ? ' · ' + item.amount.toLocaleString() + '円' : '') + '</div>'
    + (item.memo ? '<div style="font-family:var(--sans);font-size:12px;color:var(--text2);margin-bottom:12px"> ' + item.memo + '</div>' : '')
    + (item.arrival_expected ? '<div style="font-family:var(--sans);font-size:11px;color:var(--blue);margin-bottom:12px"> 到着予定: ' + item.arrival_expected + '</div>' : '')
    + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-bottom:8px">ステータスを変更</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
    + Object.entries(ITEM_STATUS).map(function(entry) {
        const k = entry[0], v = entry[1];
        const isActive = item.status === k;
        return '<button data-status="' + k + '" class="item-status-btn" style="padding:8px;border:1px solid ' + (isActive ? v.color : 'var(--border)') + ';border-radius:8px;background:' + (isActive ? 'rgba(0,0,0,0.04)' : 'var(--bg)') + ';font-family:var(--sans);font-size:11px;color:' + v.color + ';cursor:pointer;font-weight:' + (isActive ? '700' : '400') + '">' + v.label + '</button>';
      }).join('')
    + '</div>';
  bg.appendChild(modal);
  document.getElementById('app').appendChild(bg);
  modal.querySelectorAll('.item-status-btn').forEach(function(btn) {
    btn.onclick = function() {
      updateItemStatus(itemId, btn.dataset.status);
      bg.remove();
      renderPurchaseItems();
    };
  });
}

function filterItemsByStatus(status) {
  const a = accounts[currentAcct];
  const items = (a && a.purchase_items || []).filter(function(item) {
    if (status === 'unused') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return item.status === 'active' && new Date(item.date) < oneYearAgo;
    }
    return item.status === status;
  });
  const el = document.getElementById('main-content');
  if (!el) return;
  const title = status === 'unused' ? '1年以上未使用' : (ITEM_STATUS[status]||{label:status}).label;
  let html = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><button onclick="renderPurchaseItems()" style="background:none;border:none;cursor:pointer;font-family:var(--sans);font-size:12px;color:var(--blue)">← 戻る</button><div style="font-size:14px;font-weight:700">' + title + ' (' + items.length + '件)</div></div>';
  if (!items.length) {
    html += '<div style="text-align:center;padding:40px;font-family:var(--sans);font-size:13px;color:var(--text3)">該当なし</div>';
  } else {
    html += '<div class="card" style="padding:0;overflow:hidden">';
    items.forEach(function(item) {
      html += '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer" onclick="showItemDetail(' + item.id + ')">'
        + '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">' + item.name + '</div>'
        + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">' + item.date + ' · ' + item.category + (item.amount ? ' · ' + item.amount.toLocaleString() + '円' : '') + '</div></div>'
        + '<div style="display:flex;gap:6px">'
        + '<button data-iid="' + item.id + '" class="discard-btn" style="padding:4px 8px;background:var(--red-bg);color:var(--red);border:1px solid rgba(204,51,51,.2);border-radius:6px;font-size:10px;cursor:pointer;font-family:var(--sans)">断捨離</button>'
        + '</div></div>';
    });
    html += '</div>';
  }
  el.innerHTML = html;
  el.querySelectorAll('.discard-btn').forEach(function(btn) {
    btn.onclick = function(e) {
      e.stopPropagation();
      updateItemStatus(btn.dataset.iid, 'discard');
      filterItemsByStatus(status);
    };
  });
}


// ── テスト用ダミーデータ（鈴木花子） ──
function loadSuzukiDummyData() {
  const dummyJournals = [{"id": 1000, "date": "2025-01-01", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 149852, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1001, "date": "2025-01-01", "type": "expense", "category": "水道光熱費", "description": "東京電力 電気代", "amount": 28000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1002, "date": "2025-01-02", "type": "expense", "category": "水道光熱費", "description": "東京ガス ガス代", "amount": 12000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1003, "date": "2025-01-05", "type": "expense", "category": "地代家賃", "description": "店舗家賃", "amount": 150000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1004, "date": "2025-01-05", "type": "expense", "category": "給与賃金", "description": "パート給与", "amount": 178594, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1005, "date": "2025-01-05", "type": "expense", "category": "通信費", "description": "ソフトバンク 通信費", "amount": 8800, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1006, "date": "2025-01-05", "type": "expense", "category": "損害保険料", "description": "火災保険料", "amount": 5000, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1007, "date": "2025-01-08", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 153405, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1008, "date": "2025-01-17", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 135367, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1009, "date": "2025-01-24", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 131166, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1010, "date": "2025-02-01", "type": "expense", "category": "地代家賃", "description": "店舗家賃", "amount": 150000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1011, "date": "2025-02-01", "type": "expense", "category": "給与賃金", "description": "パート給与", "amount": 180936, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1012, "date": "2025-02-01", "type": "expense", "category": "損害保険料", "description": "火災保険料", "amount": 5000, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1013, "date": "2025-02-02", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 135965, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1014, "date": "2025-02-05", "type": "expense", "category": "水道光熱費", "description": "東京電力 電気代", "amount": 28000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1015, "date": "2025-02-05", "type": "expense", "category": "水道光熱費", "description": "東京ガス ガス代", "amount": 12000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1016, "date": "2025-02-06", "type": "expense", "category": "通信費", "description": "ソフトバンク 通信費", "amount": 8800, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1017, "date": "2025-02-10", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 151675, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1018, "date": "2025-02-10", "type": "expense", "category": "仕入高", "description": "食材仕入れ 業務スーパー", "amount": 10614, "tax_rate": 8, "tax_type": "課税（軽減）", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1019, "date": "2025-02-15", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 132087, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1020, "date": "2025-02-24", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 147718, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1021, "date": "2025-03-02", "type": "expense", "category": "水道光熱費", "description": "東京ガス ガス代", "amount": 12000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1022, "date": "2025-03-03", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 157798, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1023, "date": "2025-03-03", "type": "expense", "category": "地代家賃", "description": "店舗家賃", "amount": 150000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1024, "date": "2025-03-03", "type": "expense", "category": "給与賃金", "description": "パート給与", "amount": 172191, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1025, "date": "2025-03-04", "type": "expense", "category": "通信費", "description": "ソフトバンク 通信費", "amount": 8800, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1026, "date": "2025-03-05", "type": "expense", "category": "仕入高", "description": "食材仕入れ 業務スーパー", "amount": 16081, "tax_rate": 8, "tax_type": "課税（軽減）", "status": "confirmed", "phase": "P2", "input_by": "system"}, {"id": 1027, "date": "2025-03-06", "type": "expense", "category": "水道光熱費", "description": "東京電力 電気代", "amount": 28000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1028, "date": "2025-03-06", "type": "expense", "category": "損害保険料", "description": "火災保険料", "amount": 5000, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1029, "date": "2025-03-08", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 169838, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1030, "date": "2025-03-15", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 169699, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1031, "date": "2025-03-22", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 151932, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1032, "date": "2025-04-01", "type": "expense", "category": "給与賃金", "description": "パート給与", "amount": 183270, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1033, "date": "2025-04-02", "type": "expense", "category": "損害保険料", "description": "火災保険料", "amount": 5000, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1034, "date": "2025-04-03", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 162867, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1035, "date": "2025-04-03", "type": "expense", "category": "水道光熱費", "description": "東京電力 電気代", "amount": 28000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1036, "date": "2025-04-03", "type": "expense", "category": "水道光熱費", "description": "東京ガス ガス代", "amount": 12000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1037, "date": "2025-04-03", "type": "expense", "category": "通信費", "description": "ソフトバンク 通信費", "amount": 8800, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1038, "date": "2025-04-06", "type": "expense", "category": "地代家賃", "description": "店舗家賃", "amount": 150000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1039, "date": "2025-04-10", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 187444, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1040, "date": "2025-04-11", "type": "expense", "category": "会議費", "description": "スタッフミーティング", "amount": 4001, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1041, "date": "2025-04-17", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 157506, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1042, "date": "2025-04-22", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 182003, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1043, "date": "2025-04-24", "type": "expense", "category": "仕入高", "description": "食材仕入れ 業務スーパー", "amount": 16630, "tax_rate": 8, "tax_type": "課税（軽減）", "status": "confirmed", "phase": "P2", "input_by": "花子"}, {"id": 1044, "date": "2025-05-01", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 162146, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1045, "date": "2025-05-02", "type": "expense", "category": "給与賃金", "description": "パート給与", "amount": 182875, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1046, "date": "2025-05-02", "type": "expense", "category": "水道光熱費", "description": "東京電力 電気代", "amount": 28000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1047, "date": "2025-05-03", "type": "expense", "category": "旅費交通費", "description": "交通費", "amount": 628, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1048, "date": "2025-05-04", "type": "expense", "category": "通信費", "description": "ソフトバンク 通信費", "amount": 8800, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1049, "date": "2025-05-05", "type": "expense", "category": "地代家賃", "description": "店舗家賃", "amount": 150000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1050, "date": "2025-05-05", "type": "expense", "category": "水道光熱費", "description": "東京ガス ガス代", "amount": 12000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1051, "date": "2025-05-05", "type": "expense", "category": "損害保険料", "description": "火災保険料", "amount": 5000, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1052, "date": "2025-05-10", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 159427, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1053, "date": "2025-05-15", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 188235, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1054, "date": "2025-05-18", "type": "expense", "category": "接待交際費", "description": "取引先接待", "amount": 8770, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1055, "date": "2025-05-22", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 179461, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1056, "date": "2025-06-01", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 182097, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1057, "date": "2025-06-01", "type": "expense", "category": "損害保険料", "description": "火災保険料", "amount": 5000, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1058, "date": "2025-06-02", "type": "expense", "category": "給与賃金", "description": "パート給与", "amount": 172697, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1059, "date": "2025-06-04", "type": "expense", "category": "地代家賃", "description": "店舗家賃", "amount": 150000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1060, "date": "2025-06-04", "type": "expense", "category": "水道光熱費", "description": "東京電力 電気代", "amount": 28000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1061, "date": "2025-06-04", "type": "expense", "category": "水道光熱費", "description": "東京ガス ガス代", "amount": 12000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1062, "date": "2025-06-04", "type": "expense", "category": "通信費", "description": "ソフトバンク 通信費", "amount": 8800, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1063, "date": "2025-06-10", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 176647, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1064, "date": "2025-06-17", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 193291, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1065, "date": "2025-06-18", "type": "expense", "category": "雑費", "description": "雑費", "amount": 560, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1066, "date": "2025-06-22", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 178200, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1067, "date": "2025-06-24", "type": "expense", "category": "仕入高", "description": "食材仕入れ 業務スーパー", "amount": 19118, "tax_rate": 8, "tax_type": "課税（軽減）", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1068, "date": "2025-07-02", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 183288, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1069, "date": "2025-07-02", "type": "expense", "category": "通信費", "description": "ソフトバンク 通信費", "amount": 8800, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1070, "date": "2025-07-03", "type": "expense", "category": "地代家賃", "description": "店舗家賃", "amount": 150000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1071, "date": "2025-07-03", "type": "expense", "category": "給与賃金", "description": "パート給与", "amount": 178614, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1072, "date": "2025-07-03", "type": "expense", "category": "損害保険料", "description": "火災保険料", "amount": 5000, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1073, "date": "2025-07-03", "type": "expense", "category": "会議費", "description": "スタッフミーティング", "amount": 3717, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1074, "date": "2025-07-05", "type": "expense", "category": "水道光熱費", "description": "東京電力 電気代", "amount": 28000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1075, "date": "2025-07-06", "type": "expense", "category": "水道光熱費", "description": "東京ガス ガス代", "amount": 12000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1076, "date": "2025-07-06", "type": "expense", "category": "仕入高", "description": "コーヒー豆 専門店", "amount": 12561, "tax_rate": 8, "tax_type": "課税（軽減）", "status": "confirmed", "phase": "P2", "input_by": "花子"}, {"id": 1077, "date": "2025-07-09", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 174618, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1078, "date": "2025-07-15", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 205609, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1079, "date": "2025-07-19", "type": "expense", "category": "仕入高", "description": "食材仕入れ 市場", "amount": 30623, "tax_rate": 8, "tax_type": "課税（軽減）", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1080, "date": "2025-07-23", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 182053, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1081, "date": "2025-08-01", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 184030, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1082, "date": "2025-08-01", "type": "expense", "category": "給与賃金", "description": "パート給与", "amount": 180677, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1083, "date": "2025-08-02", "type": "expense", "category": "通信費", "description": "ソフトバンク 通信費", "amount": 8800, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1084, "date": "2025-08-03", "type": "expense", "category": "水道光熱費", "description": "東京電力 電気代", "amount": 28000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1085, "date": "2025-08-03", "type": "expense", "category": "水道光熱費", "description": "東京ガス ガス代", "amount": 12000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1086, "date": "2025-08-03", "type": "expense", "category": "損害保険料", "description": "火災保険料", "amount": 5000, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1087, "date": "2025-08-05", "type": "expense", "category": "地代家賃", "description": "店舗家賃", "amount": 150000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1088, "date": "2025-08-09", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 203035, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1089, "date": "2025-08-15", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 192998, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1090, "date": "2025-08-24", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 172035, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1091, "date": "2025-09-01", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 187826, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1092, "date": "2025-09-01", "type": "expense", "category": "水道光熱費", "description": "東京電力 電気代", "amount": 28000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1093, "date": "2025-09-01", "type": "expense", "category": "通信費", "description": "ソフトバンク 通信費", "amount": 8800, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1094, "date": "2025-09-03", "type": "expense", "category": "地代家賃", "description": "店舗家賃", "amount": 150000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1095, "date": "2025-09-03", "type": "expense", "category": "損害保険料", "description": "火災保険料", "amount": 5000, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1096, "date": "2025-09-03", "type": "expense", "category": "仕入高", "description": "コーヒー豆 専門店", "amount": 17660, "tax_rate": 8, "tax_type": "課税（軽減）", "status": "confirmed", "phase": "P2", "input_by": "花子"}, {"id": 1097, "date": "2025-09-04", "type": "expense", "category": "給与賃金", "description": "パート給与", "amount": 175520, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1098, "date": "2025-09-04", "type": "expense", "category": "水道光熱費", "description": "東京ガス ガス代", "amount": 12000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1099, "date": "2025-09-10", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 167802, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1100, "date": "2025-09-16", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 165172, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1101, "date": "2025-09-24", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 164873, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1102, "date": "2025-10-02", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 198298, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1103, "date": "2025-10-02", "type": "expense", "category": "給与賃金", "description": "パート給与", "amount": 187663, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1104, "date": "2025-10-02", "type": "expense", "category": "水道光熱費", "description": "東京電力 電気代", "amount": 28000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1105, "date": "2025-10-02", "type": "expense", "category": "通信費", "description": "ソフトバンク 通信費", "amount": 8800, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1106, "date": "2025-10-03", "type": "expense", "category": "損害保険料", "description": "火災保険料", "amount": 5000, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1107, "date": "2025-10-04", "type": "expense", "category": "水道光熱費", "description": "東京ガス ガス代", "amount": 12000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1108, "date": "2025-10-05", "type": "expense", "category": "地代家賃", "description": "店舗家賃", "amount": 150000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1109, "date": "2025-10-08", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 169801, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1110, "date": "2025-10-16", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 189811, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1111, "date": "2025-10-23", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 194769, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1112, "date": "2025-11-01", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 177578, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1113, "date": "2025-11-01", "type": "expense", "category": "水道光熱費", "description": "東京ガス ガス代", "amount": 12000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1114, "date": "2025-11-02", "type": "expense", "category": "通信費", "description": "ソフトバンク 通信費", "amount": 8800, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1115, "date": "2025-11-03", "type": "expense", "category": "地代家賃", "description": "店舗家賃", "amount": 150000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1116, "date": "2025-11-03", "type": "expense", "category": "水道光熱費", "description": "東京電力 電気代", "amount": 28000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1117, "date": "2025-11-03", "type": "expense", "category": "損害保険料", "description": "火災保険料", "amount": 5000, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1118, "date": "2025-11-05", "type": "expense", "category": "給与賃金", "description": "パート給与", "amount": 178194, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1119, "date": "2025-11-09", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 197297, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1120, "date": "2025-11-14", "type": "expense", "category": "仕入高", "description": "食材仕入れ 業務スーパー", "amount": 19327, "tax_rate": 8, "tax_type": "課税（軽減）", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1121, "date": "2025-11-15", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 182168, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1122, "date": "2025-11-19", "type": "expense", "category": "仕入高", "description": "食材仕入れ 業務スーパー", "amount": 14228, "tax_rate": 8, "tax_type": "課税（軽減）", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1123, "date": "2025-11-23", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 211290, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1124, "date": "2025-12-02", "type": "expense", "category": "水道光熱費", "description": "東京電力 電気代", "amount": 28000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1125, "date": "2025-12-02", "type": "expense", "category": "損害保険料", "description": "火災保険料", "amount": 5000, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1126, "date": "2025-12-03", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 218780, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1127, "date": "2025-12-03", "type": "expense", "category": "地代家賃", "description": "店舗家賃", "amount": 150000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1128, "date": "2025-12-06", "type": "expense", "category": "給与賃金", "description": "パート給与", "amount": 176321, "tax_rate": 0, "tax_type": "非課税", "status": "confirmed", "phase": "P1", "input_by": "花子"}, {"id": 1129, "date": "2025-12-06", "type": "expense", "category": "水道光熱費", "description": "東京ガス ガス代", "amount": 12000, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "田中(ﾊﾟｰﾄ)"}, {"id": 1130, "date": "2025-12-06", "type": "expense", "category": "通信費", "description": "ソフトバンク 通信費", "amount": 8800, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1131, "date": "2025-12-10", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 230248, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1132, "date": "2025-12-17", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 232902, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}, {"id": 1133, "date": "2025-12-23", "type": "income", "category": "売上高", "description": "売上（週次集計）", "amount": 202773, "tax_rate": 10, "tax_type": "課税", "status": "confirmed", "phase": "P1", "input_by": "system"}];
  const dummyItems = [{"id": 1, "name": "エスプレッソマシン JURA", "category": "家電", "amount": 280000, "date": "2025-01-15", "status": "active", "memo": "メイン機"}, {"id": 2, "name": "コーヒーグラインダー", "category": "家電", "amount": 45000, "date": "2025-02-01", "status": "active", "memo": ""}, {"id": 3, "name": "ユニフォーム(スタッフ用)", "category": "衣類", "amount": 32000, "date": "2025-03-10", "status": "active", "memo": ""}, {"id": 4, "name": "テーブル×4脚", "category": "家具", "amount": 120000, "date": "2025-04-20", "status": "active", "memo": ""}, {"id": 5, "name": "POSレジ", "category": "家電", "amount": 89000, "date": "2025-05-05", "status": "active", "memo": ""}, {"id": 6, "name": "古いコーヒーミル", "category": "家電", "amount": 15000, "date": "2024-03-01", "status": "discard", "memo": "新機種に入れ替えたので断捨離候補"}];

  const suzukiKey = Object.keys(accounts).find(function(k) {
    return accounts[k].name && accounts[k].name.includes('鈴木');
  });

  if (!suzukiKey) { showToast('鈴木花子のアカウントが見つかりません'); return; }

  const a = accounts[suzukiKey];
  a.journals = dummyJournals;
  a.purchase_items = dummyItems;
  a.bank_balance = 2800000;
  a.members = [
    { id: 1, name: '花子', role: 'admin', created_at: '2025-01-01' },
    { id: 2, name: '田中(ﾊﾟｰﾄ)', role: 'member', created_at: '2025-01-01' },
  ];

  save(suzukiKey);
  if (currentAcct === suzukiKey) {
    renderDashboard();
  }
  showToast(' 2025年1〜12月 ダミーデータ読込完了（' + dummyJournals.length + '件）');
}


// ══════════════════════════════════════════════════════════════
// A級実装
// A-1: 画像圧縮（Canvas API）
// A-2: 独立の術
// A-3: 仕訳帳ソート・ページング・デバウンス検索の接続
// A-4: 月次締め・試算表のメニュー接続
// ══════════════════════════════════════════════════════════════

// ── A-1: 画像圧縮 ──
function compressImage(file, maxWidth, quality, callback) {
  maxWidth = maxWidth || 800;
  quality = quality || 0.6;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(function(blob) {
        callback(blob, canvas.toDataURL('image/jpeg', quality));
      }, 'image/jpeg', quality);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// サムネイル生成（一覧表示用・小さめ）
function generateThumbnail(file, callback) {
  compressImage(file, 200, 0.5, callback);
}

// ── A-2: 独立の術 ──
function renderDokuritsu() {
  const a = accounts[currentAcct];
  if (!a) return;
  const el = document.getElementById('main-content');
  if (!el) return;

  const journals = a.journals || [];
  const total = journals.length;
  const autoClassified = journals.filter(function(j){ return j.phase === 'P1' || j.category; }).length;
  const needsReview = journals.filter(function(j){ return j.status === 'unconfirmed' || j.alert; }).length;
  const autoRate = total ? Math.round(autoClassified / total * 100) : 0;
  const isLocked = (a.locked_months || []).length > 0;

  // STEP達成判定
  const step1done = autoRate >= 80;
  const step2done = step1done && needsReview <= 5 && isLocked;
  const step3done = step2done && (a.tax_calculated);
  const step4done = step3done && (a.etax_filed);
  const step5done = step4done && (a.advisor_free);
  const currentStep = step5done ? 5 : step4done ? 4 : step3done ? 3 : step2done ? 2 : step1done ? 1 : 0;

  // 顧問料計算
  const advisorFee = a.advisor_monthly_fee || 30000;
  const annualFee = advisorFee * 12;
  const saving1 = Math.round(annualFee * 0.33);
  const saving2 = Math.round(annualFee * 0.27);
  const newMonthly = Math.round((annualFee - saving1 - saving2) / 12 / 1000) * 1000;
  const totalSaving = saving1 + saving2;

  const steps = [
    { num:1, label:'記帳代行から解放', desc:'自動記帳により記帳代行が不要になりました', done: step1done },
    { num:2, label:'月次確認から解放', desc:'月次レポートを自動生成。要確認は' + needsReview + '件のみ', done: step2done },
    { num:3, label:'消費税申告から解放', desc:'消費税の自動計算と申告書生成', done: step3done },
    { num:4, label:'確定申告から解放', desc:'e-Tax直接送信で申告を完結', done: step4done },
    { num:5, label:'顧問契約から完全解放', desc:'必要な時だけスポット依頼。顧問契約不要', done: step5done },
  ];

  const stepsHtml = steps.map(function(s) {
    const isCurrent = s.num === currentStep + 1 && !s.done;
    const cls = s.done ? 'done' : isCurrent ? 'current' : 'pending';
    return '<div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);background:' + (s.done ? 'var(--green-bg)' : isCurrent ? 'var(--yellow-bg,rgba(170,119,0,0.06))' : 'var(--bg)') + '">'
      + '<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--sans);font-size:11px;font-weight:700;flex-shrink:0;margin-top:1px;background:' + (s.done ? 'var(--green)' : isCurrent ? 'var(--yellow,#8b6914)' : 'var(--bg3)') + ';color:' + (s.done||isCurrent ? '#fff' : 'var(--text3)') + '">' + s.num + '</div>'
      + '<div style="flex:1"><div style="font-size:13px;font-weight:700;margin-bottom:2px">' + s.label + '</div>'
      + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">' + s.desc + '</div></div>'
      + '<div style="font-family:var(--sans);font-size:9px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap;align-self:center;background:' + (s.done ? 'var(--green-bg)' : isCurrent ? 'var(--yellow-bg,rgba(170,119,0,0.06))' : 'var(--bg3)') + ';color:' + (s.done ? 'var(--green)' : isCurrent ? 'var(--yellow,#8b6914)' : 'var(--text3)') + '">' + (s.done ? '完了' : isCurrent ? '進行中' : '未達成') + '</div>'
      + '</div>';
  }).join('');

  const complianceItems = [
    { label: '電子帳簿保存法', ok: true },
    { label: 'インボイス制度', ok: true },
    { label: '青色申告65万円控除', ok: true },
    { label: '証憑7年間保存', ok: true },
    { label: 'e-Tax直接送信', ok: false },
    { label: '消費税自動計算', ok: true },
  ];

  const complianceHtml = complianceItems.map(function(c) {
    return '<div style="background:' + (c.ok ? 'var(--green-bg)' : 'var(--bg3)') + ';border:1px solid ' + (c.ok ? 'rgba(26,92,53,0.2)' : 'var(--border)') + ';border-radius:10px;padding:12px;display:flex;align-items:flex-start;gap:8px">'
      + '<div style="width:8px;height:8px;border-radius:50%;background:' + (c.ok ? 'var(--green)' : 'var(--text3)') + ';margin-top:3px;flex-shrink:0"></div>'
      + '<div><div style="font-family:var(--sans);font-size:10px;font-weight:700;color:var(--text2)">' + c.label + '</div>'
      + '<div style="font-family:var(--sans);font-size:9px;color:' + (c.ok ? 'var(--green)' : 'var(--text3)') + '">' + (c.ok ? '対応済み' : '準備中') + '</div></div>'
      + '</div>';
  }).join('');

  el.innerHTML =
    // ヒーローカード
    '<div style="background:var(--text);color:#fff;border-radius:var(--radius);padding:20px;margin-bottom:14px">'
    + '<div style="font-family:var(--sans);font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.5);margin-bottom:6px">INDEPENDENCE LEVEL</div>'
    + '<div style="font-size:22px;font-weight:900;margin-bottom:4px;letter-spacing:-0.5px">STEP ' + currentStep + ' 達成中</div>'
    + '<div style="font-family:var(--sans);font-size:11px;color:rgba(255,255,255,0.6);line-height:1.6;margin-bottom:16px">帳場の自走率を上げて、税理士費用を削減しましょう</div>'
    + '<div style="display:flex;gap:20px">'
    + '<div style="text-align:center"><div style="font-size:24px;font-weight:900">' + autoRate + '<span style="font-size:14px">%</span></div><div style="font-family:var(--sans);font-size:9px;color:rgba(255,255,255,0.5)">自動分類率</div></div>'
    + '<div style="text-align:center"><div style="font-size:24px;font-weight:900">' + needsReview + '</div><div style="font-family:var(--sans);font-size:9px;color:rgba(255,255,255,0.5)">要確認件数</div></div>'
    + '<div style="text-align:center"><div style="font-size:24px;font-weight:900">' + Math.round(totalSaving/10000) + '<span style="font-size:14px">万</span></div><div style="font-family:var(--sans);font-size:9px;color:rgba(255,255,255,0.5)">年間節約見込</div></div>'
    + '</div></div>'

    // ロードマップ
    + '<div style="font-family:var(--sans);font-size:9px;font-weight:700;letter-spacing:2px;color:var(--text3);margin-bottom:8px">独立ロードマップ</div>'
    + '<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:14px">' + stepsHtml + '</div>'

    // 月次レポート
    + '<div style="font-family:var(--sans);font-size:9px;font-weight:700;letter-spacing:2px;color:var(--text3);margin-bottom:8px">今月の帳場レポート</div>'
    + '<div class="card" style="margin-bottom:14px">'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--border);margin:-14px -16px 14px">'
    + '<div style="padding:12px;text-align:center;border-right:1px solid var(--border)"><div style="font-size:20px;font-weight:900;color:var(--green)">' + total + '</div><div style="font-family:var(--sans);font-size:9px;color:var(--text3)">仕訳件数</div></div>'
    + '<div style="padding:12px;text-align:center;border-right:1px solid var(--border)"><div style="font-size:20px;font-weight:900;color:' + (needsReview > 0 ? 'var(--yellow,#8b6914)' : 'var(--green)') + '">' + needsReview + '</div><div style="font-family:var(--sans);font-size:9px;color:var(--text3)">要確認</div></div>'
    + '<div style="padding:12px;text-align:center"><div style="font-size:20px;font-weight:900;color:var(--green)">' + autoRate + '%</div><div style="font-family:var(--sans);font-size:9px;color:var(--text3)">自動分類率</div></div>'
    + '</div>'
    + renderReportRow('月次締め', isLocked ? '完了' : '未実施', isLocked)
    + renderReportRow('freee差異', '0件', true)
    + renderReportRow('消費税集計', '自動計算済み', true)
    + renderReportRow('税理士確認工数', '約1時間（推定）', false)
    + '</div>'

    // 顧問料シミュレーター
    + '<div style="font-family:var(--sans);font-size:9px;font-weight:700;letter-spacing:2px;color:var(--text3);margin-bottom:8px">顧問料シミュレーター</div>'
    + '<div class="card" style="margin-bottom:14px">'
    + '<div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:8px">現在の月額顧問料</div>'
    + '<input type="number" id="advisor-fee-input" value="' + advisorFee + '" class="form-inp" style="font-size:18px;font-weight:700;text-align:center;margin-bottom:12px">'
    + '<button onclick="updateAdvisorFee()" style="width:100%;padding:8px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);font-family:var(--sans);font-size:11px;cursor:pointer;margin-bottom:12px">計算する</button>'
    + '<div id="advisor-calc">' + renderAdvisorCalc(advisorFee) + '</div>'
    + '</div>'

    // 法的準拠
    + '<div style="font-family:var(--sans);font-size:9px;font-weight:700;letter-spacing:2px;color:var(--text3);margin-bottom:8px">法的準拠状況</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">' + complianceHtml + '</div>'

    // アクションボタン
    + '<button onclick="generateTaxReportPackage()" style="width:100%;padding:14px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px">税理士への引き渡しパッケージを生成</button>'
    + '<button id="taxmode-btn2" style="width:100%;padding:12px;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font);font-size:12px;cursor:pointer">税理士モードのURLを発行する</button>';
  const taxmodeBtn = document.getElementById('taxmode-btn');
  if (taxmodeBtn) taxmodeBtn.onclick = function() { showToast('税理士モードURL: 準備中です'); };
}

function renderReportRow(label, val, ok) {
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-family:var(--sans);font-size:11px">'
    + '<span style="color:var(--text3)">' + label + '</span>'
    + '<span style="font-weight:700;color:' + (ok ? 'var(--green)' : 'var(--yellow,#8b6914)') + '">' + val + '</span>'
    + '</div>';
}

function renderAdvisorCalc(monthly) {
  const annual = monthly * 12;
  const s1 = Math.round(annual * 0.33);
  const s2 = Math.round(annual * 0.27);
  const newM = Math.max(5000, Math.round((annual - s1 - s2) / 12 / 1000) * 1000);
  const saved = s1 + s2;
  return '<div style="font-family:var(--sans);font-size:11px">'
    + '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text3)">現在の顧問料（年間）</span><span style="font-weight:700;color:var(--red)">' + annual.toLocaleString() + '円</span></div>'
    + '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text3)">記帳代行なし削減</span><span style="font-weight:700">-' + s1.toLocaleString() + '円</span></div>'
    + '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text3)">月次確認のみ削減</span><span style="font-weight:700">-' + s2.toLocaleString() + '円</span></div>'
    + '<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text3)">適正月額</span><span style="font-weight:700;color:var(--text2)">月 ' + newM.toLocaleString() + '円</span></div>'
    + '<div style="margin-top:12px;background:var(--green-bg);border:1px solid rgba(26,92,53,0.15);border-radius:10px;padding:14px;text-align:center">'
    + '<div style="font-family:var(--sans);font-size:10px;color:var(--green);margin-bottom:4px">年間節約見込み額</div>'
    + '<div style="font-size:28px;font-weight:900;color:var(--green)">' + saved.toLocaleString() + '円</div>'
    + '</div></div>';
}

function updateAdvisorFee() {
  const monthly = parseInt(document.getElementById('advisor-fee-input').value) || 30000;
  const a = accounts[currentAcct];
  if (a) { a.advisor_monthly_fee = monthly; save(currentAcct); }
  document.getElementById('advisor-calc').innerHTML = renderAdvisorCalc(monthly);
}

function generateTaxReportPackage() {
  const a = accounts[currentAcct];
  if (!a) return;
  const journals = a.journals || [];
  const rows = [['日付','種別','勘定科目','摘要','金額','税率','入力者']];
  journals.forEach(function(j) {
    rows.push([j.date, j.type==='income'?'収入':'支出', j.category||'', j.description||'', j.amount||0, j.tax_rate||0, j.input_by||'']);
  });
  const csv = rows.map(function(r){ return r.join(","); }).join("\n");
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a2 = document.createElement('a');
  a2.href = url;
  a2.download = '帳場レポート_' + new Date().toISOString().slice(0,7) + '.csv';
  a2.click();
  URL.revokeObjectURL(url);
  showToast('税理士向けレポートをダウンロードしました');
}

// ── A-3: 仕訳帳ソート・ページング・デバウンス検索 ──
let journalPage = 1;
let journalSortKey = 'date';
let journalSortDir = 'desc';
let journalMemberFilter = '';

const debouncedJournalSearch = typeof debounce === 'function'
  ? debounce(function(val) { journalPage = 1; renderJournal && renderJournal(val); }, 300)
  : function(val) { renderJournal && renderJournal(val); };

function setJournalSort(key) {
  if (journalSortKey === key) {
    journalSortDir = journalSortDir === 'desc' ? 'asc' : 'desc';
  } else {
    journalSortKey = key;
    journalSortDir = 'desc';
  }
  journalPage = 1;
  renderJournal && renderJournal();
}

function getFilteredJournals(a, searchWord) {
  let journals = a.journals || [];
  if (searchWord) {
    const w = searchWord.toLowerCase();
    journals = journals.filter(function(j) {
      return (j.description||'').toLowerCase().includes(w)
        || (j.category||'').toLowerCase().includes(w)
        || (j.date||'').includes(w);
    });
  }
  if (journalMemberFilter) {
    journals = filterJournalsByMember(journals, journalMemberFilter);
  }
  return sortJournals(journals, journalSortKey, journalSortDir);
}


// ══════════════════════════════════════════════════════════════
// 銀行口座管理（複数口座対応・現金管理のみも可）
// ══════════════════════════════════════════════════════════════

function getBankAccounts() {
  const a = accounts[currentAcct];
  return (a && a.bank_accounts) || [];
}

function getTotalBankBalance() {
  const accs = getBankAccounts();
  // 口座なし → bank_balance（現金）を使用
  if (!accs.length) return (accounts[currentAcct] && accounts[currentAcct].bank_balance) || 0;
  return accs.reduce(function(s, acc) { return s + (acc.balance || 0); }, 0);
}

function saveBankAccount(bankAcc) {
  const a = accounts[currentAcct];
  if (!a.bank_accounts) a.bank_accounts = [];
  const idx = a.bank_accounts.findIndex(function(b) { return b.id === bankAcc.id; });
  if (idx >= 0) a.bank_accounts[idx] = bankAcc;
  else { bankAcc.id = Date.now(); a.bank_accounts.push(bankAcc); }
  a.bank_balance = getTotalBankBalance();
  save(currentAcct);
}

function deleteBankAccount(id) {
  const a = accounts[currentAcct];
  if (!a.bank_accounts) return;
  a.bank_accounts = a.bank_accounts.filter(function(b) { return b.id !== id; });
  a.bank_balance = getTotalBankBalance();
  save(currentAcct);
  showBankAccountsModal(false);
}

function showBankAccountsModal(isFirstTime) {
  const accList = getBankAccounts();
  const total = getTotalBankBalance();
  const a = accounts[currentAcct];

  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  if (!isFirstTime) bg.onclick = function(e) { if(e.target===bg) bg.remove(); };

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '400px';

  const BANKS = ['三菱UFJ銀行','三井住友銀行','みずほ銀行','りそな銀行',
    '楽天銀行','PayPay銀行','GMOあおぞらネット銀行','ゆうちょ銀行',
    '地方銀行','信用金庫','その他'];
  const TYPES = ['普通','当座','定期'];
  const today = new Date().toISOString().slice(0,10);

  // ── 口座一覧 ──
  let listHtml = '';
  if (accList.length) {
    listHtml += '<div style="margin-bottom:14px">';
    accList.forEach(function(acc) {
      const masked = acc.number
        ? acc.number.slice(-4).padStart(acc.number.length, '*')
        : '—';
      listHtml += '<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--border)">'
        + '<div style="flex:1">'
        + '<div style="font-size:13px;font-weight:600">' + acc.name + '</div>'
        + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3)">'
        + acc.type + ' · ' + masked + ' · ' + (acc.balance_date||today) + '現在</div>'
        + '</div>'
        + '<div style="text-align:right">'
        + '<div style="font-size:14px;font-weight:900">' + (acc.balance||0).toLocaleString() + '円</div>'
        + '<button data-id="' + acc.id + '" class="bank-del-btn" style="font-family:var(--sans);font-size:9px;color:var(--red);background:none;border:none;cursor:pointer;margin-top:2px">削除</button>'
        + '</div></div>';
    });
    listHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0">'
      + '<span style="font-weight:700">合計残高</span>'
      + '<span style="font-size:18px;font-weight:900">' + total.toLocaleString() + '円</span>'
      + '</div></div>';
  }

  // ── 口座なし（現金のみ）モード ──
  const noBankHtml = '<div style="margin-bottom:12px">'
    + '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-family:var(--sans);font-size:12px;padding:10px;background:var(--bg3);border-radius:8px">'
    + '<input type="checkbox" id="cash-only-mode" ' + (!accList.length && a.cash_only ? 'checked' : '') + ' style="width:16px;height:16px">'
    + '<span>銀行口座を使わず現金のみで管理する</span>'
    + '</label>'
    + '<div id="cash-balance-row" style="margin-top:8px;display:' + (!accList.length && a.cash_only ? 'block' : 'none') + '">'
    + '<div class="form-row"><label class="form-label">手元現金残高</label>'
    + '<input id="cash-balance-input" class="form-inp" type="number" placeholder="0" value="' + (a.bank_balance||0) + '" style="font-size:16px;font-weight:700;text-align:right"></div>'
    + '<div class="form-row"><label class="form-label">確認日</label>'
    + '<input id="cash-balance-date" class="form-inp" type="date" value="' + (a.bank_balance_date||today) + '"></div>'
    + '<button id="cash-save-btn" style="width:100%;padding:10px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer">保存する</button>'
    + '</div></div>';

  // ── 口座追加フォーム ──
  const addFormHtml = '<div id="bank-add-form" style="display:' + (a.cash_only && !accList.length ? 'none' : 'block') + '">'
    + '<div style="font-family:var(--sans);font-size:10px;font-weight:700;color:var(--text3);letter-spacing:1px;margin-bottom:10px">'
    + (accList.length ? '口座を追加' : 'まず口座を追加する') + '</div>'
    + '<div class="form-row"><label class="form-label">銀行名</label>'
    + '<select id="bank-name" class="form-select">' + BANKS.map(function(b){ return '<option>'+b+'</option>'; }).join('') + '</select></div>'
    + '<div class="form-row"><label class="form-label">種別</label>'
    + '<select id="bank-type" class="form-select">' + TYPES.map(function(t){ return '<option>'+t+'</option>'; }).join('') + '</select></div>'
    + '<div class="form-row"><label class="form-label">口座番号（任意）</label>'
    + '<input id="bank-number" class="form-inp" placeholder="1234567" maxlength="8" style="font-family:var(--sans)"></div>'
    + '<div class="form-row"><label class="form-label">残高</label>'
    + '<input id="bank-balance-input" class="form-inp" type="number" placeholder="0" style="font-size:16px;font-weight:700;text-align:right"></div>'
    + '<div class="form-row"><label class="form-label">残高確認日</label>'
    + '<input id="bank-balance-date" class="form-inp" type="date" value="' + today + '"></div>'
    + '<button id="bank-add-btn" style="width:100%;padding:12px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer">追加する</button>'
    + '</div>';

  const headerHtml = isFirstTime
    ? '<div class="card-title" style="margin-bottom:4px">残高を登録しましょう</div>'
    + '<div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:14px;line-height:1.7">銀行口座でも現金のみでも管理できます。複数口座は全て登録すると合計で資金繰りを計算します。</div>'
    : '<div class="modal-title">残高・口座の管理</div>';

  const skipHtml = isFirstTime
    ? '<button id="bank-skip-btn" style="width:100%;padding:10px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--sans);font-size:11px;cursor:pointer;margin-top:8px">後で設定する</button>'
    : '';

  modal.innerHTML = headerHtml + noBankHtml + listHtml + addFormHtml + skipHtml;
  bg.appendChild(modal);
  document.getElementById('app').appendChild(bg);

  // イベント設定
  const cashOnlyChk = document.getElementById('cash-only-mode');
  const cashBalanceRow = document.getElementById('cash-balance-row');
  const bankAddForm = document.getElementById('bank-add-form');

  if (cashOnlyChk) {
    cashOnlyChk.onchange = function() {
      const isCashOnly = cashOnlyChk.checked;
      cashBalanceRow.style.display = isCashOnly ? 'block' : 'none';
      bankAddForm.style.display = isCashOnly ? 'none' : 'block';
      const a2 = accounts[currentAcct];
      a2.cash_only = isCashOnly;
      save(currentAcct);
    };
  }

  const cashSaveBtn = document.getElementById('cash-save-btn');
  if (cashSaveBtn) {
    cashSaveBtn.onclick = function() {
      const bal = parseInt(document.getElementById('cash-balance-input').value) || 0;
      const dt = document.getElementById('cash-balance-date').value || today;
      const a2 = accounts[currentAcct];
      a2.bank_balance = bal;
      a2.bank_balance_date = dt;
      a2.cash_only = true;
      save(currentAcct);
      bg.remove();
      showToast('現金残高を ' + bal.toLocaleString() + '円 に設定しました');
      if (typeof renderCashflow === 'function') renderCashflow();
    };
  }

  const bankAddBtn = document.getElementById('bank-add-btn');
  if (bankAddBtn) {
    bankAddBtn.onclick = function() {
      const name = document.getElementById('bank-name').value;
      const type = document.getElementById('bank-type').value;
      const number = document.getElementById('bank-number').value.trim();
      const balance = parseInt(document.getElementById('bank-balance-input').value) || 0;
      const balDate = document.getElementById('bank-balance-date').value || today;
      if (!balance && balance !== 0) { showToast('残高を入力してください'); return; }
      saveBankAccount({ name: name, type: type, number: number, balance: balance, balance_date: balDate });
      bg.remove();
      showToast(name + ' ' + type + '口座を登録しました（' + balance.toLocaleString() + '円）');
      if (typeof renderCashflow === 'function') renderCashflow();
    };
  }

  modal.querySelectorAll('.bank-del-btn').forEach(function(btn) {
    btn.onclick = function() {
      if (confirm('この口座を削除しますか？')) {
        deleteBankAccount(parseInt(btn.dataset.id));
        bg.remove();
        if (typeof renderCashflow === 'function') renderCashflow();
      }
    };
  });

  const skipBtn = document.getElementById('bank-skip-btn');
  if (skipBtn) skipBtn.onclick = function() { bg.remove(); };
}

// editBankBalance → showBankAccountsModalに統合
function editBankBalance() {
  showBankAccountsModal(false);
}

// 資金繰り画面を開いた時に残高未設定なら初回設定を促す
function checkBankSetupOnOpen() {
  const a = accounts[currentAcct];
  if (!a) return;
  const total = getTotalBankBalance();
  if (!total && !a.bank_accounts) {
    setTimeout(function() { showBankAccountsModal(true); }, 400);
  }
}


// ══════════════════════════════════════════════════════════════
// 家計モード
// ══════════════════════════════════════════════════════════════

const KAKEIBO_CATS = [
  { key: 'food',      label: '食費',     color: '#e67e22' },
  { key: 'daily',     label: '日用品',   color: '#27ae60' },
  { key: 'medical',   label: '医療',     color: '#e74c3c' },
  { key: 'transport', label: '交通',     color: '#2980b9' },
  { key: 'enjoy',     label: '娯楽',     color: '#9b59b6' },
  { key: 'education', label: '教育',     color: '#16a085' },
  { key: 'beauty',    label: '美容',     color: '#c0392b' },
  { key: 'eating',    label: '外食',     color: '#d35400' },
  { key: 'fashion',   label: 'ファッション', color: '#8e44ad' },
  { key: 'housing',   label: '住居',     color: '#7f8c8d' },
  { key: 'utility',   label: '光熱費',   color: '#f39c12' },
  { key: 'comms',     label: '通信費',   color: '#1abc9c' },
  { key: 'income',    label: '収入',     color: '#2ecc71' },
  { key: 'other',     label: 'その他',   color: '#95a5a6' },
];

function getKakeiboMode() {
  try { return sessionStorage.getItem('ninja_mode') === 'kakeibo'; } catch(e) { return false; }
}

function setKakeiboMode(isKakeibo) {
  try { sessionStorage.setItem('ninja_mode', isKakeibo ? 'kakeibo' : 'business'); } catch(e) {}
  renderModeToggle();
  if (isKakeibo) {
    switchTab('kakeibo_home');
  } else {
    switchTab('dashboard');
  }
}

function getKakeiboData() {
  const a = accounts[currentAcct];
  if (!a.kakeibo) a.kakeibo = { entries: [], budget: {}, members: [] };
  return a.kakeibo;
}

function saveKakeiboData() {
  save(currentAcct);
}

// モード切替ボタンをトップバーに描画
function renderModeToggle() {
  const el = document.getElementById('mode-toggle');
  if (!el) return;
  const isKakeibo = getKakeiboMode();
  el.innerHTML =
    '<div style="display:flex;background:var(--bg3);border-radius:99px;padding:2px;gap:2px">'
    + '<button id="mode-biz-btn" style="padding:4px 12px;border:none;border-radius:99px;font-family:var(--sans);font-size:10px;font-weight:700;cursor:pointer;background:' + (!isKakeibo ? 'var(--text)' : 'transparent') + ';color:' + (!isKakeibo ? '#fff' : 'var(--text3)') + ';transition:.2s">事業</button>'
    + '<button id="mode-kakeibo-btn" style="padding:4px 12px;border:none;border-radius:99px;font-family:var(--sans);font-size:10px;font-weight:700;cursor:pointer;background:' + (isKakeibo ? 'var(--text)' : 'transparent') + ';color:' + (isKakeibo ? '#fff' : 'var(--text3)') + ';transition:.2s">家計</button>'
    + '</div>';
  document.getElementById('mode-biz-btn').onclick = function() { if (getKakeiboMode()) setKakeiboMode(false); };
  document.getElementById('mode-kakeibo-btn').onclick = function() { if (!getKakeiboMode()) setKakeiboMode(true); };
}

// ── 家計ホーム ──
function renderKakeiboHome() {
  const el = document.getElementById('main-content');
  if (!el) return;
  const kd = getKakeiboData();
  const entries = kd.entries || [];
  const now = new Date();
  const thisMonth = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');

  const thisMonthEntries = entries.filter(function(e) { return (e.date||'').startsWith(thisMonth); });
  const income = thisMonthEntries.filter(function(e){ return e.type==='income'; }).reduce(function(s,e){ return s+(e.amount||0); }, 0);
  const expense = thisMonthEntries.filter(function(e){ return e.type==='expense'; }).reduce(function(s,e){ return s+(e.amount||0); }, 0);
  const balance = income - expense;

  // カテゴリ別集計
  const byCat = {};
  thisMonthEntries.filter(function(e){ return e.type==='expense'; }).forEach(function(e) {
    const cat = e.category || 'other';
    byCat[cat] = (byCat[cat] || 0) + (e.amount || 0);
  });

  // 予算進捗
  const budget = kd.budget || {};

  let html = '';

  // 月次サマリー
  html += '<div style="background:var(--text);color:#fff;border-radius:var(--radius);padding:18px;margin-bottom:12px">'
    + '<div style="font-family:var(--sans);font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.5);margin-bottom:4px">' + (now.getMonth()+1) + '月の家計</div>'
    + '<div style="display:flex;gap:16px;align-items:flex-end;margin-bottom:12px">'
    + '<div><div style="font-size:24px;font-weight:900;line-height:1">' + (balance >= 0 ? '+' : '') + Math.round(balance/1000) + '<span style="font-size:14px">千円</span></div>'
    + '<div style="font-family:var(--sans);font-size:9px;color:rgba(255,255,255,0.5)">収支</div></div>'
    + '<div style="margin-left:auto;text-align:right">'
    + '<div style="font-family:var(--sans);font-size:11px;color:rgba(255,255,255,0.7)">収入 ' + income.toLocaleString() + '円</div>'
    + '<div style="font-family:var(--sans);font-size:11px;color:rgba(255,255,255,0.7)">支出 ' + expense.toLocaleString() + '円</div>'
    + '</div></div>'
    + '<button id="kakeibo-add-btn" style="width:100%;padding:10px;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:var(--radius-sm);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer">支出・収入を記録する</button>'
    + '</div>';

  // カテゴリ別支出
  const catEntries = Object.entries(byCat).sort(function(a,b){ return b[1]-a[1]; });
  if (catEntries.length) {
    html += '<div class="card" style="margin-bottom:12px">'
      + '<div class="card-title">カテゴリ別支出</div>';
    const maxAmt = catEntries[0][1];
    catEntries.forEach(function(entry) {
      const cat = KAKEIBO_CATS.find(function(c){ return c.key === entry[0]; }) || { label: entry[0], color: '#999' };
      const pct = Math.round(entry[1] / maxAmt * 100);
      const budgetAmt = budget[entry[0]];
      const overBudget = budgetAmt && entry[1] > budgetAmt;
      html += '<div style="margin-bottom:10px">'
        + '<div style="display:flex;justify-content:space-between;font-family:var(--sans);font-size:11px;margin-bottom:3px">'
        + '<span style="font-weight:600;color:' + cat.color + '">' + cat.label + '</span>'
        + '<span style="font-weight:700;color:' + (overBudget ? 'var(--red)' : 'var(--text)') + '">' + entry[1].toLocaleString() + '円'
        + (budgetAmt ? '<span style="color:var(--text3);font-weight:400"> / ' + budgetAmt.toLocaleString() + '円</span>' : '')
        + (overBudget ? ' !' : '') + '</span>'
        + '</div>'
        + '<div style="height:5px;background:var(--bg3);border-radius:99px;overflow:hidden">'
        + '<div style="width:' + Math.min(pct, 100) + '%;height:100%;background:' + cat.color + ';border-radius:99px;' + (overBudget ? 'background:var(--red)' : '') + '"></div>'
        + '</div></div>';
    });
    html += '</div>';
  }

  // 最近の記録
  const recent = entries.slice().reverse().slice(0, 10);
  if (recent.length) {
    html += '<div class="card" style="margin-bottom:12px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
      + '<div class="card-title" style="margin:0">最近の記録</div>'
      + '<button onclick="switchTab(\'kakeibo_list\')" style="font-family:var(--sans);font-size:10px;color:var(--blue);background:none;border:none;cursor:pointer">全て見る</button>'
      + '</div>';
    recent.forEach(function(e) {
      const cat = KAKEIBO_CATS.find(function(c){ return c.key === e.category; }) || { label: e.category || 'その他', color: '#999' };
      html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">'
        + '<div style="width:6px;height:6px;border-radius:50%;background:' + (e.type==='income' ? 'var(--green)' : cat.color) + ';flex-shrink:0"></div>'
        + '<div style="flex:1;min-width:0">'
        + '<div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (e.memo || cat.label) + '</div>'
        + '<div style="font-family:var(--sans);font-size:9px;color:var(--text3)">' + e.date + ' · ' + cat.label + (e.input_by ? ' · ' + e.input_by : '') + '</div>'
        + '</div>'
        + '<div style="font-size:13px;font-weight:700;color:' + (e.type==='income' ? 'var(--green)' : 'var(--text)') + ';white-space:nowrap">'
        + (e.type==='income' ? '+' : '-') + (e.amount||0).toLocaleString() + '円</div>'
        + '</div>';
    });
    html += '</div>';
  } else {
    html += '<div style="text-align:center;padding:32px;font-family:var(--sans);font-size:13px;color:var(--text3)">まだ記録がありません</div>';
  }

  // ショートカット
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<button onclick="switchTab(\'kakeibo_budget\')" style="padding:12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font);font-size:12px;cursor:pointer">予算を設定する</button>'
    + '<button onclick="switchTab(\'kakeibo_graph\')" style="padding:12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font);font-size:12px;cursor:pointer">グラフを見る</button>'
    + '</div>';

  // 事業モード訴求バナーを追加
  html += '<div style="background:var(--text);color:#fff;border-radius:var(--radius);padding:16px;margin-top:12px;cursor:pointer" id="kakeibo-promo-banner">'
    + '<div style="font-family:var(--sans);font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.4);margin-bottom:4px">忍者帳場 事業モード</div>'
    + '<div style="font-size:14px;font-weight:900;margin-bottom:6px;letter-spacing:-0.3px">個人事業主・フリーランスの方へ</div>'
    + '<div style="font-family:var(--sans);font-size:11px;color:rgba(255,255,255,0.7);line-height:1.6;margin-bottom:12px">副業・独立を始めたら、この帳場をそのまま事業用に使えます。レシート撮影・確定申告・資金繰りまで全て対応。</div>'
    + '<div style="font-family:var(--sans);font-size:11px;font-weight:700;color:rgba(255,255,255,0.9)">事業モードを試してみる →</div>'
    + '</div>';

  el.innerHTML = html;

  const promoBanner = document.getElementById('kakeibo-promo-banner');
  if (promoBanner) promoBanner.onclick = function() { setKakeiboMode(false); };

  const addBtn = document.getElementById('kakeibo-add-btn');
  if (addBtn) addBtn.onclick = showKakeiboAddModal;
}

// ── 家計記録追加モーダル ──
function showKakeiboAddModal(prefill) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };
  const modal = document.createElement('div');
  modal.className = 'modal';
  const today = new Date().toISOString().slice(0,10);
  const pf = prefill || {};

  const catOptions = KAKEIBO_CATS.filter(function(c){ return c.key !== 'income'; })
    .map(function(c){ return '<option value="' + c.key + '"' + (pf.category===c.key?' selected':'') + '>' + c.label + '</option>'; }).join('');

  modal.innerHTML = '<div class="modal-title">記録する</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'
    + '<button id="kk-expense-btn" style="padding:10px;border:2px solid var(--text);border-radius:var(--radius);background:var(--text);color:#fff;font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer">支出</button>'
    + '<button id="kk-income-btn" style="padding:10px;border:2px solid var(--border);border-radius:var(--radius);background:var(--bg);color:var(--text2);font-family:var(--font);font-size:13px;cursor:pointer">収入</button>'
    + '</div>'
    + '<div class="form-row"><label class="form-label">金額</label>'
    + '<input id="kk-amount" class="form-inp" type="number" placeholder="0" value="' + (pf.amount||'') + '" style="font-size:20px;font-weight:700;text-align:right"></div>'
    + '<div class="form-row"><label class="form-label">カテゴリ</label>'
    + '<select id="kk-category" class="form-select">' + catOptions + '</select></div>'
    + '<div class="form-row"><label class="form-label">メモ（任意）</label>'
    + '<input id="kk-memo" class="form-inp" placeholder="例：スーパーで食材" value="' + (pf.memo||'') + '"></div>'
    + '<div class="form-row"><label class="form-label">日付</label>'
    + '<input id="kk-date" class="form-inp" type="date" value="' + (pf.date||today) + '"></div>'
    + '<button id="kk-save-btn" style="width:100%;padding:12px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;margin-top:4px">保存する</button>';

  bg.appendChild(modal);
  document.getElementById('app').appendChild(bg);

  let currentType = pf.type || 'expense';
  const expBtn = document.getElementById('kk-expense-btn');
  const incBtn = document.getElementById('kk-income-btn');
  const catSel = document.getElementById('kk-category');

  function setType(t) {
    currentType = t;
    expBtn.style.background = t==='expense' ? 'var(--text)' : 'var(--bg)';
    expBtn.style.color = t==='expense' ? '#fff' : 'var(--text2)';
    expBtn.style.borderColor = t==='expense' ? 'var(--text)' : 'var(--border)';
    incBtn.style.background = t==='income' ? 'var(--green)' : 'var(--bg)';
    incBtn.style.color = t==='income' ? '#fff' : 'var(--text2)';
    incBtn.style.borderColor = t==='income' ? 'var(--green)' : 'var(--border)';
    catSel.style.display = t==='income' ? 'none' : 'block';
  }
  expBtn.onclick = function() { setType('expense'); };
  incBtn.onclick = function() { setType('income'); };
  setType(currentType);

  document.getElementById('kk-save-btn').onclick = function() {
    const amount = parseInt(document.getElementById('kk-amount').value) || 0;
    if (!amount) { showToast('金額を入力してください'); return; }
    const entry = {
      id: Date.now(),
      type: currentType,
      amount: amount,
      category: currentType === 'income' ? 'income' : document.getElementById('kk-category').value,
      memo: document.getElementById('kk-memo').value.trim(),
      date: document.getElementById('kk-date').value || new Date().toISOString().slice(0,10),
      input_by: getCurrentMember() || '',
      created_at: new Date().toISOString(),
    };
    const kd = getKakeiboData();
    kd.entries.push(entry);
    saveKakeiboData();
    bg.remove();
    showToast((currentType==='income'?'収入':'支出') + 'を記録しました: ' + amount.toLocaleString() + '円');
    if (currentTab === 'kakeibo_home') renderKakeiboHome();
    else if (currentTab === 'kakeibo_list') renderKakeiboList();
  };
}

// ── 家計一覧 ──
function renderKakeiboList() {
  const el = document.getElementById('main-content');
  if (!el) return;
  const kd = getKakeiboData();
  const entries = (kd.entries || []).slice().reverse();

  let html = '<div style="display:flex;gap:8px;margin-bottom:12px">'
    + '<button id="kk-list-add-btn" style="flex:1;padding:10px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer">記録する</button>'
    + '</div>';

  if (!entries.length) {
    html += '<div style="text-align:center;padding:40px;font-family:var(--sans);font-size:13px;color:var(--text3)">まだ記録がありません</div>';
  } else {
    // 日付でグループ化
    const byDate = {};
    entries.forEach(function(e) {
      const d = e.date || '';
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(e);
    });

    Object.keys(byDate).sort().reverse().forEach(function(date) {
      const dayEntries = byDate[date];
      const dayTotal = dayEntries.reduce(function(s,e){ return s + (e.type==='expense' ? -(e.amount||0) : (e.amount||0)); }, 0);
      html += '<div style="font-family:var(--sans);font-size:10px;font-weight:700;color:var(--text3);padding:10px 0 4px;display:flex;justify-content:space-between">'
        + '<span>' + date + '</span>'
        + '<span style="color:' + (dayTotal>=0?'var(--green)':'var(--red)') + '">' + (dayTotal>=0?'+':'') + dayTotal.toLocaleString() + '円</span>'
        + '</div>';
      dayEntries.forEach(function(e) {
        const cat = KAKEIBO_CATS.find(function(c){ return c.key === e.category; }) || { label: e.category || 'その他', color: '#999' };
        html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">'
          + '<div style="width:8px;height:8px;border-radius:50%;background:' + (e.type==='income'?'var(--green)':cat.color) + ';flex-shrink:0"></div>'
          + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + (e.memo || cat.label) + '</div>'
          + '<div style="font-family:var(--sans);font-size:9px;color:var(--text3)">' + cat.label + (e.input_by ? ' · ' + e.input_by : '') + '</div>'
          + '</div>'
          + '<div style="font-size:14px;font-weight:700;color:' + (e.type==='income'?'var(--green)':'var(--text)') + ';white-space:nowrap">'
          + (e.type==='income'?'+':'-') + (e.amount||0).toLocaleString() + '円</div>'
          + '<button data-eid="' + e.id + '" class="kk-del-btn" style="padding:3px 7px;background:var(--red-bg);color:var(--red);border:none;border-radius:4px;font-size:9px;cursor:pointer;font-family:var(--sans)">削除</button>'
          + '</div>';
      });
    });
  }

  el.innerHTML = html;

  const addBtn = document.getElementById('kk-list-add-btn');
  if (addBtn) addBtn.onclick = showKakeiboAddModal;

  el.querySelectorAll('.kk-del-btn').forEach(function(btn) {
    btn.onclick = function() {
      const kd2 = getKakeiboData();
      kd2.entries = kd2.entries.filter(function(e){ return e.id != btn.dataset.eid; });
      saveKakeiboData();
      renderKakeiboList();
      showToast('削除しました');
    };
  });
}

// ── 予算設定 ──
function renderKakeiboBudget() {
  const el = document.getElementById('main-content');
  if (!el) return;
  const kd = getKakeiboData();
  const budget = kd.budget || {};

  let html = '<div class="card"><div class="card-title">月間予算を設定</div>'
    + '<div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:14px">カテゴリごとに月の予算を設定できます</div>';

  KAKEIBO_CATS.filter(function(c){ return c.key !== 'income'; }).forEach(function(cat) {
    html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">'
      + '<div style="width:10px;height:10px;border-radius:50%;background:' + cat.color + ';flex-shrink:0"></div>'
      + '<span style="flex:1;font-size:13px;font-weight:600">' + cat.label + '</span>'
      + '<input data-cat="' + cat.key + '" class="kk-budget-input" type="number" placeholder="未設定" value="' + (budget[cat.key]||'') + '" style="width:100px;text-align:right;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-family:var(--sans);font-size:12px;background:var(--bg)">'
      + '</div>';
  });

  html += '<button id="kk-budget-save-btn" style="width:100%;padding:12px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;margin-top:14px">予算を保存する</button>'
    + '</div>';

  el.innerHTML = html;

  document.getElementById('kk-budget-save-btn').onclick = function() {
    const kd2 = getKakeiboData();
    kd2.budget = {};
    el.querySelectorAll('.kk-budget-input').forEach(function(inp) {
      const val = parseInt(inp.value);
      if (val > 0) kd2.budget[inp.dataset.cat] = val;
    });
    saveKakeiboData();
    showToast('予算を保存しました');
  };
}

// ── グラフ ──
function renderKakeiboGraph() {
  const el = document.getElementById('main-content');
  if (!el) return;
  const kd = getKakeiboData();
  const entries = kd.entries || [];
  const now = new Date();

  // 直近6ヶ月のデータ
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const ym = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    const label = (d.getMonth()+1) + '月';
    const income = entries.filter(function(e){ return e.type==='income' && (e.date||'').startsWith(ym); }).reduce(function(s,e){ return s+(e.amount||0); },0);
    const expense = entries.filter(function(e){ return e.type==='expense' && (e.date||'').startsWith(ym); }).reduce(function(s,e){ return s+(e.amount||0); },0);
    months.push({ ym, label, income, expense, balance: income-expense });
  }

  // 今月カテゴリ別円グラフデータ
  const thisMonth = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  const catData = {};
  entries.filter(function(e){ return e.type==='expense' && (e.date||'').startsWith(thisMonth); }).forEach(function(e) {
    catData[e.category||'other'] = (catData[e.category||'other']||0) + (e.amount||0);
  });

  let html = '<div class="card" style="margin-bottom:12px">'
    + '<div class="card-title">月別収支（直近6ヶ月）</div>'
    + '<canvas id="kk-monthly-canvas" width="600" height="180" style="width:100%;height:160px;display:block"></canvas>'
    + '</div>';

  html += '<div class="card"><div class="card-title">今月の支出内訳</div>'
    + '<canvas id="kk-cat-canvas" width="300" height="200" style="width:100%;height:180px;display:block;margin-bottom:10px"></canvas>';

  // 凡例
  Object.entries(catData).sort(function(a,b){ return b[1]-a[1]; }).slice(0,6).forEach(function(entry) {
    const cat = KAKEIBO_CATS.find(function(c){ return c.key===entry[0]; }) || { label: entry[0], color: '#999' };
    html += '<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-family:var(--sans);font-size:11px">'
      + '<div style="width:10px;height:10px;border-radius:50%;background:' + cat.color + ';flex-shrink:0"></div>'
      + '<span style="flex:1">' + cat.label + '</span>'
      + '<span style="font-weight:700">' + entry[1].toLocaleString() + '円</span>'
      + '</div>';
  });
  html += '</div>';

  el.innerHTML = html;

  // 月別棒グラフ
  setTimeout(function() {
    const canvas = document.getElementById('kk-monthly-canvas');
    if (!canvas) return;
    drawMonthlyChart('kk-monthly-canvas', months);

    // 円グラフ
    const canvas2 = document.getElementById('kk-cat-canvas');
    if (!canvas2 || !Object.keys(catData).length) return;
    const ctx2 = canvas2.getContext('2d');
    const W = canvas2.width, H = canvas2.height;
    const cx = W/2, cy = H/2, r = Math.min(W,H)/2 - 20;
    const total = Object.values(catData).reduce(function(s,v){ return s+v; }, 0);
    let angle = -Math.PI/2;
    ctx2.clearRect(0,0,W,H);
    Object.entries(catData).forEach(function(entry) {
      const cat = KAKEIBO_CATS.find(function(c){ return c.key===entry[0]; }) || { color: '#999' };
      const slice = (entry[1]/total) * Math.PI * 2;
      ctx2.fillStyle = cat.color;
      ctx2.beginPath();
      ctx2.moveTo(cx, cy);
      ctx2.arc(cx, cy, r, angle, angle+slice);
      ctx2.closePath();
      ctx2.fill();
      angle += slice;
    });
    // 中央に合計
    ctx2.fillStyle = 'var(--text)';
    ctx2.font = 'bold 14px sans-serif';
    ctx2.textAlign = 'center';
    ctx2.fillText(Math.round(total/1000) + '千円', cx, cy+5);
  }, 100);
}


// ══════════════════════════════════════════════════════════════
// トライアル・サインアップ・オンボーディング・招待制
// ══════════════════════════════════════════════════════════════

// ── トライアル期間管理 ──
const TRIAL_DAYS = 14;

function getTrialInfo(email) {
  try {
    const key = 'ninja_trial_' + (email || '');
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
    return null;
  } catch(e) { return null; }
}

function startTrial(email) {
  try {
    const key = 'ninja_trial_' + email;
    const info = {
      email: email,
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      plan: 'trial',
    };
    localStorage.setItem(key, JSON.stringify(info));
    return info;
  } catch(e) { return null; }
}


function isTrialActive(email) {
  const daysLeft = getTrialDaysLeft(email);
  return daysLeft > 0;
}

function renderTrialBanner() {
  const el = document.getElementById('trial-banner');
  if (!el) return;
  const email = sessionStorage.getItem('login_email') || '';
  if (!email || email === 'demo@ninja-choba.jp' || email === 'asianchampions@yahoo.co.jp') {
    el.style.display = 'none';
    return;
  }
  const daysLeft = getTrialDaysLeft(email);
  if (daysLeft <= 0) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  el.innerHTML = '<div style="background:var(--gold-bg);border-bottom:1px solid rgba(139,101,8,0.2);padding:8px 16px;display:flex;align-items:center;justify-content:space-between;font-family:var(--sans);font-size:11px">'
    + '<span style="color:var(--gold);font-weight:700">トライアル期間中 — 残り' + daysLeft + '日（全機能無料）</span>'
    + '<button onclick="showUpgradeModal()" style="padding:4px 12px;background:var(--gold);color:#fff;border:none;border-radius:99px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--sans)">プランを選ぶ</button>'
    + '</div>';
}

// ── サインアップ画面 ──
function showSignupScreen() { /* HTMLに直接記述済み */ }

function validateInviteCode(code) {
  if (!code) return true; // 招待コードなしでも登録可（βフェーズ）
  return VALID_INVITE_CODES.includes(code.toUpperCase().trim());
}

// ── サインアップ処理 ──
async function handleSignup() {
  const name = (document.getElementById('signup-name').value || '').trim();
  const email = (document.getElementById('signup-email').value || '').trim().toLowerCase();
  const pw = document.getElementById('signup-pw').value || '';
  const pw2 = document.getElementById('signup-pw2').value || '';
  const invite = (document.getElementById('signup-invite').value || '').trim();
  const errorEl = document.getElementById('signup-error');

  const showError = function(msg) {
    errorEl.style.display = 'block';
    errorEl.textContent = msg;
  };

  errorEl.style.display = 'none';

  if (!name) return showError('お名前を入力してください');
  if (!email || !email.includes('@')) return showError('正しいメールアドレスを入力してください');
  if (pw.length < 8) return showError('パスワードは8文字以上で入力してください');
  if (pw !== pw2) return showError('パスワードが一致しません');
  if (!validateInviteCode(invite)) return showError('招待コードが正しくありません');

  // 既存ユーザーチェック
  try {
    const existingUsers = JSON.parse(localStorage.getItem('ninja_users') || '{}');
    if (existingUsers[email]) return showError('このメールアドレスは既に登録されています');

    // パスワードをシンプルにハッシュ化（本番はSupabase Auth使用）
    const pwHash = await hashPassword(pw, email);

    existingUsers[email] = {
      name: name,
      email: email,
      pw_hash: pwHash,
      created_at: new Date().toISOString(),
      invite_code: invite || null,
      onboarding_done: false,
    };
    localStorage.setItem('ninja_users', JSON.stringify(existingUsers));

    // トライアル開始
    startTrial(email);

    // 自動ログイン
    sessionStorage.setItem('ninja_choba_auth', '1');
    sessionStorage.setItem('login_email', email);
    sessionStorage.setItem('login_name', name);

    // オンボーディングへ
    showOnboarding(name, email);

  } catch(e) {
    showError('登録に失敗しました。もう一度お試しください。');
  }
}

// ── パスワードリセット ──
function showPasswordReset() {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '360px';
  modal.innerHTML = '<div class="modal-title">パスワードをリセット</div>'
    + '<div style="font-family:var(--sans);font-size:12px;color:var(--text3);margin-bottom:14px;line-height:1.6">登録したメールアドレスを入力してください。リセット手順をお送りします。</div>'
    + '<input id="reset-email" class="form-inp" type="email" placeholder="メールアドレス" style="margin-bottom:12px">'
    + '<button id="reset-send-btn" style="width:100%;padding:12px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer">送信する</button>'
    + '<div id="reset-msg" style="margin-top:10px;font-family:var(--sans);font-size:11px;color:var(--green);display:none">送信しました。メールをご確認ください。</div>';
  bg.appendChild(modal);
  document.body.appendChild(bg);
  document.getElementById('reset-send-btn').onclick = function() {
    const email = document.getElementById('reset-email').value.trim();
    if (!email) { showToast('メールアドレスを入力してください'); return; }
    // Supabase Auth実装後にリセットメール送信
    document.getElementById('reset-msg').style.display = 'block';
    setTimeout(function() { bg.remove(); }, 2000);
  };
}

// ── オンボーディング ──
function showOnboarding(name, email) {
  // pw-screenをオンボーディング画面に切り替え
  const pwScreen = document.getElementById('pw-screen');
  if (!pwScreen) return;

  const BUSINESS_TYPES = ['カフェ・飲食店','小売・物販','IT・Web・デザイン','美容・サロン',
    'コンサルタント','フリーランス（その他）','不動産','建設・工事','医療・健康','教育・講師','その他'];

  pwScreen.innerHTML = '<div style="text-align:left;padding:32px 24px;background:#ffffff;border:none;border-radius:16px;width:420px;max-width:92vw">'
    + '<div style="font-size:18px;font-weight:900;margin-bottom:4px">' + name + ' さん、ようこそ</div>'
    + '<div style="font-family:var(--sans);font-size:12px;color:var(--text3);margin-bottom:24px">事業情報を入力して帳場を始めましょう</div>'

    // ステップインジケーター
    + '<div style="display:flex;gap:4px;margin-bottom:24px">'
    + '<div style="flex:1;height:3px;background:var(--text);border-radius:99px"></div>'
    + '<div style="flex:1;height:3px;background:var(--border);border-radius:99px"></div>'
    + '<div style="flex:1;height:3px;background:var(--border);border-radius:99px"></div>'
    + '</div>'

    + '<div class="form-row"><label class="form-label">屋号・事業名</label>'
    + '<input id="ob-bizname" class="form-inp" placeholder="例：山田デザイン事務所"></div>'

    + '<div class="form-row"><label class="form-label">業種</label>'
    + '<select id="ob-biztype" class="form-select">'
    + BUSINESS_TYPES.map(function(t){ return '<option>' + t + '</option>'; }).join('')
    + '</select></div>'

    + '<div class="form-row"><label class="form-label">開業年月（任意）</label>'
    + '<input id="ob-startdate" class="form-inp" type="month" placeholder="2024-04"></div>'

    + '<button id="ob-next-btn" style="width:100%;padding:13px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:14px;font-weight:700;cursor:pointer;margin-top:8px">次へ</button>'
    + '<button id="ob-skip-btn" style="width:100%;padding:10px;background:transparent;border:none;font-family:var(--sans);font-size:12px;color:var(--text3);cursor:pointer;margin-top:4px">後で設定する</button>'
    + '</div>';

  const obSkipBtn = document.getElementById('ob-skip-btn');
  if (obSkipBtn) obSkipBtn.onclick = function() {
    showOnboarding2(name, email, name + 'の事業', 'フリーランス（その他）', '');
  };
  document.getElementById('ob-next-btn').onclick = function() {
    const bizname = document.getElementById('ob-bizname').value.trim() || name + 'の事業';
    const biztype = document.getElementById('ob-biztype').value;
    const startdate = document.getElementById('ob-startdate').value;
    showOnboarding2(name, email, bizname, biztype, startdate);
  };
}

function showOnboarding2(name, email, bizname, biztype, startdate) {
  const pwScreen = document.getElementById('pw-screen');
  if (!pwScreen) return;

  pwScreen.innerHTML = '<div style="text-align:left;padding:32px 24px;background:#ffffff;border:none;border-radius:16px;width:420px;max-width:92vw">'
    + '<div style="font-size:18px;font-weight:900;margin-bottom:4px">銀行残高を設定しましょう</div>'
    + '<div style="font-family:var(--sans);font-size:12px;color:var(--text3);margin-bottom:24px">資金繰り予測の精度が上がります（後でも設定できます）</div>'

    + '<div style="display:flex;gap:4px;margin-bottom:24px">'
    + '<div style="flex:1;height:3px;background:var(--text);border-radius:99px"></div>'
    + '<div style="flex:1;height:3px;background:var(--text);border-radius:99px"></div>'
    + '<div style="flex:1;height:3px;background:var(--border);border-radius:99px"></div>'
    + '</div>'

    + '<div class="form-row"><label class="form-label">現在の事業用残高（合計）</label>'
    + '<input id="ob-balance" class="form-inp" type="number" placeholder="0" style="font-size:20px;font-weight:700;text-align:right"></div>'

    + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3);margin-bottom:16px">銀行口座・現金など事業で使うお金の合計を入力してください</div>'

    + '<button id="ob2-next-btn" style="width:100%;padding:13px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:14px;font-weight:700;cursor:pointer;margin-bottom:8px">次へ</button>'
    + '<button id="ob2-skip-btn" style="width:100%;padding:10px;background:transparent;border:none;font-family:var(--sans);font-size:12px;color:var(--text3);cursor:pointer">後で設定する</button>'
    + '</div>';

  const doNext = function(balance) {
    showOnboarding3(name, email, bizname, biztype, startdate, balance);
  };

  document.getElementById('ob2-next-btn').onclick = function() {
    const balance = parseInt(document.getElementById('ob-balance').value) || 0;
    doNext(balance);
  };
  document.getElementById('ob2-skip-btn').onclick = function() { doNext(0); };
}

function showOnboarding3(name, email, bizname, biztype, startdate, balance) {
  const pwScreen = document.getElementById('pw-screen');
  if (!pwScreen) return;

  pwScreen.innerHTML = '<div style="text-align:center;padding:32px 24px;background:#ffffff;border:none;border-radius:16px;width:420px;max-width:92vw">'
    + '<div style="display:flex;gap:4px;margin-bottom:24px">'
    + '<div style="flex:1;height:3px;background:var(--text);border-radius:99px"></div>'
    + '<div style="flex:1;height:3px;background:var(--text);border-radius:99px"></div>'
    + '<div style="flex:1;height:3px;background:var(--text);border-radius:99px"></div>'
    + '</div>'
    + '<div style="font-size:40px;margin-bottom:16px"></div>'
    + '<div style="font-size:20px;font-weight:900;margin-bottom:8px">帳場の準備ができました</div>'
    + '<div style="font-family:var(--sans);font-size:13px;color:var(--text3);margin-bottom:8px;line-height:1.7">'
    + bizname + ' の帳場を開きます。<br>まずはレシートを撮影してみましょう。'
    + '</div>'
    + '<div style="background:var(--gold-bg);border:1px solid rgba(139,101,8,0.2);border-radius:10px;padding:12px;margin-bottom:24px;font-family:var(--sans);font-size:11px;color:var(--gold);font-weight:700">'
    + '14日間トライアル開始 — 全機能無料でお使いいただけます'
    + '</div>'
    + '<button id="ob3-start-btn" style="width:100%;padding:14px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:14px;font-weight:700;cursor:pointer">帳場を開く</button>'
    + '</div>';

  document.getElementById('ob3-start-btn').onclick = function() {
    // アカウントを初期化
    completeOnboarding(email, bizname, biztype, startdate, balance);
  };
}

function completeOnboarding(email, bizname, biztype, startdate, balance) {
  // アカウントデータを初期化
  const acctKey = 'ninja_acct_' + email.replace(/[^a-z0-9]/g,'_');
  if (!accounts[acctKey]) {
    accounts[acctKey] = {
      name: bizname,
      type: biztype,
      role: 'admin',
      started: startdate || '',
      bank_balance: balance,
      journals: [],
      members: [],
    };
  }
  currentAcct = acctKey;

  // ユーザー情報を更新
  try {
    const users = JSON.parse(localStorage.getItem('ninja_users') || '{}');
    if (users[email]) {
      users[email].onboarding_done = true;
      users[email].account_key = acctKey;
      localStorage.setItem('ninja_users', JSON.stringify(users));
    }
  } catch(e) {}

  save(acctKey);

  // アプリを起動
  document.getElementById('pw-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  const bnav = document.getElementById('bottom-nav-bar');
  if (bnav) bnav.style.display = 'flex';
  renderModeToggle();
  
// ══════════════════════════════════════════════════════════════
// 門前・忍び入る構造
// ══════════════════════════════════════════════════════════════

// ── 門前/忍び入るモード管理 ──


// ── 未整理BOX（門前）レシート管理 ──


// ── 門前画面メイン ──


// ── 撮影/アップロード処理 ──


// ── 続きはありますか？ ──


// ── 同一レシートに画像追加 ──


// ── 未整理レシート詳細 ──


// ── 未整理レシートをOCR処理 ──


// ── 忍び入るへ切替 ──


// ── 忍び入る内に「門前へ戻る」ボタン ──


// ── 門前へ切替 ──


// ── ログアウト確認 ──



// ══════════════════════════════════════════════════════════════
// 未設定項目アラートシステム
// ══════════════════════════════════════════════════════════════




// プロフィール編集モーダル


// ダッシュボード表示時にアラートチェック（ログイン後30秒後・以降は間隔管理）



// ══════════════════════════════════════════════════════════════
// 確定申告プレビュー（令和7年分・2025年分）
// ※参考値として表示。正式提出は国税庁の確定申告書等作成コーナーを使用すること
// ══════════════════════════════════════════════════════════════

// ── 税額計算定数（令和7年分） ──
const TAX_BRACKETS = [
  { limit: 1950000,   rate: 0.05, deduct: 0 },
  { limit: 3300000,   rate: 0.10, deduct: 97500 },
  { limit: 6950000,   rate: 0.20, deduct: 427500 },
  { limit: 9000000,   rate: 0.23, deduct: 636000 },
  { limit: 18000000,  rate: 0.33, deduct: 1536000 },
  { limit: 40000000,  rate: 0.40, deduct: 2796000 },
  { limit: Infinity,  rate: 0.45, deduct: 4796000 },
];
const FUKKO_RATE = 0.021;
const KISO_KOJO = 480000;
const BLUE_KOJO_65 = 650000;
const BLUE_KOJO_10 = 100000;



// ── 確定申告データ取得 ──


// ── 控除情報の取得・保存 ──


// ── 確定申告プレビュー画面 ──


// ── セクション描画ヘルパー ──


// 生命保険料控除計算（新契約）



// ══════════════════════════════════════════════════════════════
// 解決手引システム
// ══════════════════════════════════════════════════════════════

const HELP_GUIDES = {

  kakutei: {
    title: '確定申告書の転記手順',
    subtitle: '忍者帳場の数字を国税庁サイトへ',
    steps: [
      {
        title: '忍者帳場で数字を確認する',
        lead: 'まず転記する数字を手元に揃えます。',
        body: '画面下のメニューから「帳場」→「確定申告プレビュー」を開きます。控除情報（国民健康保険料・国民年金・生命保険料など）を全て入力し、「保存して税額を計算する」ボタンを押します。画面に表示された数字が、国税庁サイトに転記する値です。',
        points: [
          '「(ア) 事業収入」= 確定申告書の事業収入欄',
          '「① 事業所得」= 所得金額欄',
          '「(39) 納める税金」または「(40) 還付」= 申告納税額',
        ],
        caution: '控除情報が未入力のまま計算すると税額が高く出ます。国民健康保険料・国民年金は必ず入力してください。',
        check: '画面の数字をメモまたは印刷しましたか？',
      },
      {
        title: '国税庁のサイトを開く',
        lead: '確定申告書等作成コーナーにアクセスします。',
        body: 'ブラウザで「確定申告書等作成コーナー」と検索するか、https://www.keisan.nta.go.jp と入力します。「作成開始」ボタンを押すと、申告方法の選択画面が表示されます。「e-Tax」または「書面提出」を選んでください。',
        points: [
          'e-Tax：マイナンバーカード or IDパスワード方式でログイン',
          '書面提出：ログイン不要・印刷して郵送または持参',
          'スマホ：マイナポータルアプリからも申告できます',
        ],
        caution: 'スマートフォンのSafari・Chromeどちらでも動作します。Internet Explorerは非対応です。',
        check: '作成コーナーのトップページが表示されましたか？',
      },
      {
        title: '所得の種類を選んで収入を入力する',
        lead: '「事業所得（営業等）」を選択します。',
        body: '所得の種類の選択画面で「事業所得（営業等）」にチェックを入れます。次の画面で「収入金額」に忍者帳場の「(ア) 事業収入」の金額を入力します。「必要経費」は自動計算されないため、忍者帳場の経費合計を手入力します。',
        points: [
          '収入金額 ＝ 忍者帳場「(ア) 事業収入」',
          '必要経費 ＝ 忍者帳場「損益計算書」の経費合計',
          '青色申告特別控除は次の画面で選択します',
        ],
        caution: '副業の給与所得がある場合は「給与所得」も追加で入力が必要です。会社の源泉徴収票を手元に用意してください。',
        check: '事業収入と必要経費を入力しましたか？',
      },
      {
        title: '控除を入力する',
        lead: '忍者帳場のプレビュー画面の数字をそのまま転記します。',
        body: '「所得控除の入力」画面で各控除を入力します。忍者帳場の確定申告プレビューに表示されている「所得から差し引かれる金額」の欄の番号と名称が一致しているので、順番に転記してください。',
        points: [
          '(13) 社会保険料控除 → 国民健康保険＋国民年金の合計',
          '(15) 生命保険料控除 → 忍者帳場が上限計算済みの金額',
          '(17) 医療費控除 → 10万円超の分のみ（忍者帳場が自動計算）',
          '(24) 基礎控除 → 48万円（自動入力される場合あり）',
        ],
        caution: 'ふるさと納税は「寄附金控除」または「ワンストップ特例」のどちらかで申告します。ワンストップ特例を申請済みの場合は確定申告書への記載は不要です。',
        check: '全ての控除を入力しましたか？',
      },
      {
        title: '税額を確認して提出する',
        lead: '忍者帳場のプレビューと税額が一致しているか確認します。',
        body: '入力が完了すると「納める税金」または「還付される税金」が表示されます。忍者帳場のプレビューの金額と照合してください。一致したらe-Taxで送信、または印刷して郵送・持参します。提出期限は原則3月15日です。',
        points: [
          'e-Tax送信：その場で完了・還付が早い（約3週間）',
          '郵送：消印が3月15日まで有効',
          '持参：税務署の窓口または確定申告会場へ',
        ],
        caution: '忍者帳場との金額差が数百円以内であれば端数処理の違いです。数万円以上違う場合は控除の入力漏れや誤りがある可能性があります。',
        check: '提出（送信・郵送・持参）は完了しましたか？',
      },
    ],
  },

  csv_import: {
    title: '銀行CSVの取込手順',
    subtitle: '銀行明細を自動仕訳に変換する',
    steps: [
      {
        title: '取り込む銀行・カードを確認する',
        lead: 'まず忍者帳場が対応しているか確認します。',
        body: '忍者帳場が対応しているのは楽天銀行・三井住友銀行・三菱UFJ銀行・PayPay銀行・アメリカン・エキスプレス・JCBカード・イオン銀行・エポスカードの8社です。その他の銀行でも、一般的なCSV形式であれば取り込める場合があります。',
        points: [
          '対応8社：楽天・三井住友・三菱UFJ・PayPay・アメックス・JCB・イオン・エポス',
          '対応外の銀行：「その他」を選択して試してみてください',
          'ゆうちょ・地方銀行：一般CSVとして取込可能な場合あり',
        ],
        caution: 'プライベートの口座（生活費用）は取り込まないようにしましょう。事業用口座・カードだけを取り込むと仕訳が整理しやすくなります。',
        check: '取り込む口座・カードを決めましたか？',
      },
      {
        title: '銀行サイトでCSVをダウンロードする',
        lead: 'インターネットバンキングにログインして明細を出力します。',
        body: '各銀行のインターネットバンキングにログインし、「入出金明細」「取引履歴」などのメニューを開きます。期間を指定（例：2025年1月1日〜12月31日）して「CSV形式でダウンロード」または「ファイル出力」を選択します。ファイルがダウンロードフォルダに保存されます。',
        points: [
          '楽天銀行：「明細照会」→「CSVダウンロード」',
          '三井住友：「入出金明細」→「ファイルダウンロード」→「CSV」',
          '三菱UFJ：「入出金明細照会」→「明細ダウンロード」',
          'クレジットカード：「利用明細」→「CSVダウンロード」',
        ],
        caution: 'ダウンロードしたCSVファイルをExcelで開いて保存し直すと文字化けする場合があります。ダウンロードしたファイルはそのまま使用してください。',
        check: 'CSVファイルがダウンロードフォルダに保存されましたか？',
      },
      {
        title: '忍者帳場でCSVを取り込む',
        lead: '「自動仕訳」タブからインポートします。',
        body: '忍者帳場のメニューから「自動仕訳」タブを開きます。「CSVインポート」ボタンをタップし、銀行名を選択してダウンロードしたCSVファイルを選択します。取り込み結果が一覧で表示されます。',
        points: [
          '銀行名の選択が重要：楽天のCSVを三菱UFJで読み込もうとするとエラーになります',
          '複数ファイル：月ごとにダウンロードした場合は1ファイルずつ取り込んでください',
          '重複チェック：同じ期間を2回取り込むと重複が発生します（自動検出します）',
        ],
        caution: '取込後に「重複レシート」の警告が出た場合は、同じ明細が2件登録されています。「帳場」→「重複チェック」から削除できます。',
        check: '取り込み結果の一覧が表示されましたか？',
      },
      {
        title: '仕訳の内容を確認・修正する',
        lead: 'AIの判定が正しいか確認します。',
        body: '取り込んだ明細はAIが自動で勘定科目を判定します。「要確認」タブに振り分けられた仕訳を1件ずつ確認し、科目が違う場合はタップして修正してください。修正した内容は学習データとして保存され、次回以降の同じ取引先は自動的に正しく分類されます。',
        points: [
          '確認が必要なもの：家賃・水道光熱費・通信費など定期的な支払い',
          '事業と関係ない支出：プライベートの支出が混入していたら削除',
          '科目の修正：タップ→「科目を変更」→正しい科目を選択',
        ],
        caution: '「プライベート」カテゴリに分類された仕訳は損益計算書に含まれません。事業用の支出が誤ってプライベートになっていないか確認してください。',
        check: '要確認タブの仕訳を全て確認しましたか？',
      },
      {
        title: '月次締めをして完了する',
        lead: '取り込みが完了したら月を締めます。',
        body: '仕訳の確認が全て終わったら、「帳場」→「月次締め」から対象月を締めます。締めた月のデータはロックされ、誤って変更・削除されることがなくなります。毎月末に締める習慣をつけると、確定申告時の作業が大幅に楽になります。',
        points: [
          '締めるタイミング：毎月末が理想。遅くとも翌月10日まで',
          '締め解除：管理者権限で解除できます（設定→月次締め）',
          '締め前チェック：試算表で損益が想定と大きく違わないか確認',
        ],
        caution: '締め前に試算表を確認する習慣をつけましょう。「帳場」→「試算表」で当月の収支を確認できます。',
        check: '月次締めを実行しましたか？',
      },
    ],
  },

  norikae: {
    title: '他社ソフトからの乗り換え手順',
    subtitle: '月額費用を節約して忍者帳場へ移行する',
    steps: [
      {
        title: '乗り換えの準備をする',
        lead: '今すぐ解約しなくて大丈夫です。まず並行して使ってみましょう。',
        body: '他社ソフトをすぐに解約する必要はありません。まず忍者帳場を無料で始めて、1〜2ヶ月並行して使ってみてください。忍者帳場の方が使いやすいと感じたら、既存ソフトの更新タイミングで解約するのが最もスムーズです。',
        points: [
          '年払いの場合：契約満了まで使い続け、更新月に解約',
          '月払いの場合：いつでも解約可能なので、乗り換えを確認できたら解約',
          'データのバックアップ：解約前に必ず仕訳データをCSVでエクスポート',
        ],
        caution: '既存ソフトのデータを削除する前に、必ずバックアップを取ってください。解約後はデータにアクセスできなくなる場合があります。',
        check: '既存ソフトのバックアップを取りましたか？',
      },
      {
        title: '既存ソフトから仕訳データをエクスポートする',
        lead: '過去の仕訳データをCSVで取り出します。',
        body: '現在お使いの会計ソフトにログインし、「データのエクスポート」または「仕訳データのダウンロード」を探します。多くのソフトは「設定」「管理」「データ管理」のメニューにあります。CSV形式でダウンロードしてください。',
        points: [
          'エクスポート期間：直近2年分あれば十分です',
          'ファイル形式：CSV形式を選択してください',
          '勘定科目のメモ：使っていた科目名をメモしておくと便利です',
        ],
        caution: '会計ソフトによってCSVの列順が異なります。忍者帳場に取り込む際に列のマッピングが必要な場合があります。不明な場合はサポートまでお問い合わせください。',
        check: '仕訳データのCSVをダウンロードできましたか？',
      },
      {
        title: '銀行・カードの明細を準備する',
        lead: '銀行明細を使うと取り込みが正確になります。',
        body: '事業で使っている銀行口座とクレジットカードの明細CSVをダウンロードします。会計ソフトのエクスポートデータと合わせて使うことで、漏れなく仕訳を引き継げます。銀行CSVのダウンロード方法は「銀行CSVの取込手順」をご参照ください。',
        points: [
          '優先順位：銀行口座 > クレジットカード > その他',
          '期間：今年の1月1日から現在まで取得しておくと安心',
          '保管：ダウンロードしたファイルはフォルダにまとめて保管',
        ],
        caution: 'プライベート用の口座・カードは取り込まないようにしましょう。事業用のみに絞ることで仕訳の整理が楽になります。',
        check: '事業用の銀行・カードの明細を準備しましたか？',
      },
      {
        title: '忍者帳場に取り込んで確認する',
        lead: 'まず直近1ヶ月分だけ試してみましょう。',
        body: '忍者帳場の「自動仕訳」タブから銀行・カードのCSVを取り込みます。AIが自動で勘定科目を判定します。「要確認」タブで内容を確認し、科目が違う場合は修正してください。1ヶ月分で問題なければ、残りの期間も順次取り込んでいきます。',
        points: [
          '最初は1ヶ月分だけ：いきなり全期間を取り込まず、少しずつ確認',
          'AIの学習：修正するたびに精度が上がります',
          '損益の確認：取り込み後に損益計算書を開いて既存ソフトと比較',
        ],
        caution: '取込後の損益が大きく違う場合、未取込の明細がある可能性があります。特に現金払いの取引（領収書）は別途手入力が必要です。',
        check: '直近1ヶ月の仕訳を取り込んで確認できましたか？',
      },
      {
        title: '既存ソフトを解約して完了する',
        lead: '忍者帳場で問題なく使えると確認できたら解約します。',
        body: '1〜2ヶ月使って問題なければ既存ソフトの解約手続きをします。解約前に「全期間のデータバックアップ」を必ず取ってください。解約後、年間の削減コストをシミュレーターで確認しましょう。',
        points: [
          '解約の手順：各ソフトのマイページ→「解約」または「プラン変更」',
          '解約後のデータ：多くのソフトは解約後もしばらくデータを閲覧できます',
          '年間節約額：削減できた費用は本業への投資に回しましょう',
        ],
        caution: '税理士が既存ソフトを使って確認している場合は、事前に税理士へ相談してください。忍者帳場の「税理士モード」で同様のデータを共有できます。',
        check: '既存ソフトの解約が完了しましたか？',
      },
    ],
  },

};


// ── 解決手引を表示 ──
function showHelpGuide(guideKey) {
  var guide = HELP_GUIDES[guideKey];
  if (!guide) return;
  var bg = document.createElement('div');
  bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:flex-end;justify-content:center';
  var panel = document.createElement('div');
  panel.style.cssText = 'background:var(--bg);width:100%;max-width:540px;max-height:92vh;border-radius:20px 20px 0 0;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 -8px 40px rgba(0,0,0,0.3)';
  var currentStep = 0;
  function render() {
    var step = guide.steps[currentStep];
    var total = guide.steps.length;
    var isFirst = currentStep === 0;
    var isLast = currentStep === total - 1;
    panel.innerHTML =
      '<div style="background:var(--text);color:#fff;padding:16px 20px 14px">'
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">'
      + '<div><div style="font-family:var(--sans);font-size:9px;letter-spacing:2px;color:rgba(255,255,255,0.4);margin-bottom:3px">手引之書</div>'
      + '<div style="font-size:14px;font-weight:900">' + guide.title + '</div></div>'
      + '<button id="tebiki-close" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:50%;font-size:14px;cursor:pointer">×</button>'
      + '</div>'
      + '<div style="display:flex;gap:3px;margin-bottom:2px">'
      + guide.steps.map(function(_,i){return '<div style="flex:1;height:2px;border-radius:99px;background:'+(i<currentStep?'rgba(255,255,255,0.8)':i===currentStep?'#fff':'rgba(255,255,255,0.2)')+'"></div>';}).join('')
      + '</div>'
      + '<div style="font-family:var(--sans);font-size:9px;color:rgba(255,255,255,0.4);text-align:right">' + (currentStep+1) + ' / ' + total + '</div>'
      + '</div>'
      + '<div style="overflow-y:auto;flex:1;padding:20px">'
      + '<div style="font-family:var(--sans);font-size:9px;font-weight:700;letter-spacing:2px;color:var(--gold);margin-bottom:6px">第' + ['一','二','三','四','五','六','七','八','九','十'][currentStep] + 'の手引</div>'
      + '<div style="font-size:18px;font-weight:900;letter-spacing:-0.5px;margin-bottom:6px;line-height:1.3">' + step.title + '</div>'
      + '<div style="font-family:var(--sans);font-size:12px;color:var(--gold);font-weight:700;margin-bottom:14px">' + step.lead + '</div>'
      + '<div style="font-family:var(--sans);font-size:13px;color:var(--text2);line-height:1.9;margin-bottom:16px;border-left:3px solid var(--border);padding-left:12px">' + step.body + '</div>'
      + '<div style="background:var(--bg2);border-radius:10px;padding:14px;margin-bottom:12px">'
      + '<div style="font-family:var(--sans);font-size:9px;font-weight:700;letter-spacing:1px;color:var(--text3);margin-bottom:8px">要点</div>'
      + step.points.map(function(p){return '<div style="display:flex;align-items:flex-start;gap:8px;font-family:var(--sans);font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:5px"><div style="width:5px;height:5px;border-radius:50%;background:var(--text);flex-shrink:0;margin-top:6px"></div><span>'+p+'</span></div>';}).join('')
      + '</div>'
      + (step.caution ? '<div style="background:rgba(139,101,8,0.07);border:1px solid rgba(139,101,8,0.2);border-radius:10px;padding:12px 14px;margin-bottom:12px"><div style="font-family:var(--sans);font-size:9px;font-weight:700;letter-spacing:1px;color:var(--gold);margin-bottom:4px">注意</div><div style="font-family:var(--sans);font-size:12px;color:var(--gold);line-height:1.7">' + step.caution + '</div></div>' : '')
      + '<div style="background:var(--bg3);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px">'
      + '<div id="step-check-box" style="width:20px;height:20px;border-radius:5px;border:2px solid var(--border);background:var(--bg);cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center"></div>'
      + '<div style="font-family:var(--sans);font-size:12px;color:var(--text2)">' + step.check + '</div></div>'
      + '</div>'
      + '<div style="padding:12px 20px 20px;display:flex;gap:8px;background:var(--bg);border-top:1px solid var(--border)">'
      + (!isFirst ? '<button id="tebiki-prev" style="flex:1;padding:12px;background:var(--bg3);color:var(--text2);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font);font-size:13px;cursor:pointer">前の手引</button>' : '<div style="flex:1"></div>')
      + (!isLast ? '<button id="tebiki-next" style="flex:2;padding:12px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:14px;font-weight:700;cursor:pointer">次の手引へ</button>'
                 : '<button id="tebiki-done" style="flex:2;padding:12px;background:var(--green);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:14px;font-weight:700;cursor:pointer">巻物を閉じる</button>')
      + '</div>';
    panel.querySelector('#tebiki-close').onclick = function() { bg.remove(); };
    var prevBtn = panel.querySelector('#tebiki-prev');
    if (prevBtn) prevBtn.onclick = function() { currentStep--; render(); panel.querySelector('[style*="overflow-y"]').scrollTop=0; };
    var nextBtn = panel.querySelector('#tebiki-next');
    if (nextBtn) nextBtn.onclick = function() { currentStep++; render(); panel.querySelector('[style*="overflow-y"]').scrollTop=0; };
    var doneBtn = panel.querySelector('#tebiki-done');
    if (doneBtn) doneBtn.onclick = function() { bg.remove(); showToast('手引之書を読み終えました'); };
    var cb = panel.querySelector('#step-check-box');
    if (cb) { var checked=false; cb.onclick = function() { checked=!checked; cb.style.background=checked?'var(--green)':'var(--bg)'; cb.style.borderColor=checked?'var(--green)':'var(--border)'; cb.innerHTML=checked?'<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>':''; }; }
  }
  bg.appendChild(panel);
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };
  document.getElementById('app').appendChild(bg);
  render();
}

// ── 解決手引ボタンを描画 ──
function renderHelpBtn(guideKey, label) {
  label = label || '解決手引';
  var btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:5px 12px;background:var(--bg3);color:var(--text2);border:1px solid var(--border);border-radius:99px;font-family:var(--sans);font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap';
  btn.onclick = function() { showHelpGuide(guideKey); };
  return btn;
}

// ── 解決手引インデックス（一覧表示） ──
function showHelpIndex() {
  var bg = document.createElement('div');
  bg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:flex-end;justify-content:center';
  var panel = document.createElement('div');
  panel.style.cssText = 'background:var(--bg);width:100%;max-width:540px;border-radius:20px 20px 0 0;padding:24px 20px 32px;box-shadow:0 -8px 40px rgba(0,0,0,0.3)';
  var guides = [
    { key:'kakutei',    label:'確定申告書の転記手順',    desc:'国税庁サイトへの転記を5つの手引で解説',   steps:5 },
    { key:'csv_import', label:'銀行CSVの取込手順',       desc:'銀行明細を自動仕訳に変換する5つの手引', steps:5 },
    { key:'norikae',    label:'他社ソフトからの乗り換え', desc:'月額費用を節約して移行する5つの手引',   steps:5 },
  ];
  panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
    + '<div><div style="font-family:var(--sans);font-size:9px;letter-spacing:2px;color:var(--text3);margin-bottom:3px">手引之書</div>'
    + '<div style="font-size:18px;font-weight:900;letter-spacing:-0.5px">解決手引</div></div>'
    + '<button id="help-idx-close" style="background:var(--bg3);border:none;width:28px;height:28px;border-radius:50%;font-size:14px;cursor:pointer">×</button>'
    + '</div>'
    + '<div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:20px">困ったときはこちらをご覧ください</div>'
    + guides.map(function(g) {
        return '<div class="help-idx-item" data-key="' + g.key + '" style="display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--border);cursor:pointer">'
          + '<div style="flex:1"><div style="font-size:14px;font-weight:700;margin-bottom:3px">' + g.label + '</div>'
          + '<div style="font-family:var(--sans);font-size:11px;color:var(--text3)">' + g.desc + '</div></div>'
          + '<div style="font-family:var(--sans);font-size:10px;color:var(--text3);white-space:nowrap;text-align:right">' + g.steps + 'つの手引<br><span style="color:var(--text)">→</span></div>'
          + '</div>';
      }).join('');
  bg.appendChild(panel);
  bg.onclick = function(e) { if(e.target===bg) bg.remove(); };
  document.getElementById('app').appendChild(bg);
  panel.querySelector('#help-idx-close').onclick = function() { bg.remove(); };
  panel.querySelectorAll('.help-idx-item').forEach(function(item) {
    item.onclick = function() { bg.remove(); showHelpGuide(item.dataset.key); };
  });
}

// ── 同一レシート判定 ──
function isSameReceipt(r1, r2) {
  if (!r1 || !r2) return false;
  var t1 = new Date(r1.captured_at || r1.saved_at || 0).getTime();
  var t2 = new Date(r2.captured_at || r2.saved_at || 0).getTime();
  var timeDiff = Math.abs(t1 - t2);
  var sameTime = timeDiff < 5 * 60 * 1000;
  var sameVendor = r1.vendor && r2.vendor && r1.vendor === r2.vendor;
  var sameAmount = r1.amount && r2.amount && r1.amount === r2.amount;
  return sameTime && (sameVendor || sameAmount);
}

// 誤結合確認ダイアログ
function showSeparateReceiptConfirm(onSeparate, onKeep) {
  var bg = document.createElement('div');
  bg.className = 'modal-bg';
  var modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '320px';
  modal.innerHTML = '<div style="text-align:center;padding:8px 0">'
    + '<div style="font-size:16px;font-weight:900;margin-bottom:8px">別のレシートですか？</div>'
    + '<div style="font-family:var(--sans);font-size:12px;color:var(--text3);margin-bottom:20px;line-height:1.6">前の撮影と同じレシートとして結合されています。別のレシートの場合は分けて保存します。</div>'
    + '<div style="display:flex;gap:8px">'
    + '<button id="sep-yes" style="flex:1;padding:11px;background:var(--bg3);color:var(--text2);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font);font-size:12px;cursor:pointer">別のレシート</button>'
    + '<button id="sep-no" style="flex:1;padding:11px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer">同じレシート</button>'
    + '</div></div>';
  bg.appendChild(modal);
  document.getElementById('app').appendChild(bg);
  document.getElementById('sep-yes').onclick = function() { bg.remove(); if(onSeparate) onSeparate(); };
  document.getElementById('sep-no').onclick = function() { bg.remove(); if(onKeep) onKeep(); };
}


// ══════════════════════════════════════════════════════════════
// 他社ソフトからのデータ移行ツール
// freee / 弥生 / マネーフォワード CSV → 忍者帳場
// ══════════════════════════════════════════════════════════════

// 各社CSVの列定義


// 科目名マッピング（他社→忍者帳場）



// CSVパース（Shift-JIS対応）


// 列を自動マッピング


// CSVを仕訳に変換


// 移行ツールのメイン画面


// 移行プレビュー


// 移行実行


// ── 確定申告プレビュー ──
function renderKakuteiPreview() {
  var el = document.getElementById('main-content');
  if (!el) return;
  if (!currentAcct || !accounts[currentAcct]) { el.innerHTML='<div class="card"><div class="card-title">事業者を選択してください</div></div>'; return; }
  var kd = typeof getKakuteiData==='function' ? getKakuteiData() : null;
  var d = typeof getKakuteiDeductions==='function' ? getKakuteiDeductions() : {};
  var KISO_KOJO=480000,FUKKO_RATE=0.021,BLUE_65=650000,BLUE_10=100000;
  var income=kd?(kd.income||0):0,expense=kd?(kd.expense||0):0;
  var jigyoShotoku=Math.max(0,income-expense);
  var blueKojo=d.aoiro==='65'?BLUE_65:(d.aoiro==='10'?BLUE_10:0);
  var afterBlue=Math.max(0,jigyoShotoku-blueKojo);
  var shakai=(d.shakaihoken_list||[]).reduce(function(s,x){return s+(x.amount||0);},0);
  var ideco=(d.ideco_list||[]).reduce(function(s,x){return s+(x.amount||0);},0);
  var iryo=Math.max(0,(d.iryo_list||[]).reduce(function(s,x){return s+(x.amount||0);},0)-100000);
  var haigusha=d.haigusha||0,fuyou=(d.fuyou_count||0)*380000,genzensen=d.genzensen||0;
  var totalDed=shakai+ideco+iryo+haigusha+fuyou+KISO_KOJO;
  var kazei=Math.max(0,afterBlue-totalDed);
  function calcTax(k){var br=[[1950000,0.05,0],[3300000,0.1,97500],[6950000,0.2,427500],[9000000,0.23,636000],[18000000,0.33,1536000],[40000000,0.4,2796000],[Infinity,0.45,4796000]];for(var i=0;i<br.length;i++)if(k<=br[i][0])return Math.floor(k*br[i][1]-br[i][2]);return 0;}
  var zei=calcTax(kazei),fukko=Math.floor(zei*FUKKO_RATE),totalZei=zei+fukko,nozei=totalZei-genzensen;
  var rows=[['(ア) 事業収入',income],['① 事業所得',afterBlue],['社会保険料控除',shakai],['iDeCo等',ideco],['医療費控除',iryo],['基礎控除',KISO_KOJO],['控除合計',totalDed],['課税所得',kazei],['所得税額',zei],['復興税込合計',totalZei],[(nozei>=0?'納める税金':'還付金'),Math.abs(nozei)]];
  el.innerHTML='<div style="background:rgba(139,101,8,0.07);border:1px solid rgba(139,101,8,0.2);border-radius:var(--radius);padding:10px 14px;margin-bottom:14px;font-family:var(--sans);font-size:10px;color:var(--gold);line-height:1.6">本プレビューは参考値です。正式な申告には国税庁「確定申告書等作成コーナー」をご利用ください。</div>'
    +'<div class="card" style="margin-bottom:12px"><div class="card-title">確定申告書 第一表</div>'
    +rows.map(function(r,i){return'<div style="display:flex;justify-content:space-between;padding:8px 12px;background:'+(i>=rows.length-1?'var(--bg2)':'var(--bg)')+';border-bottom:1px solid var(--border)"><span style="font-family:var(--sans);font-size:12px">'+r[0]+'</span><span style="font-weight:'+(i>=rows.length-1?'900':'400')+';font-size:13px">'+r[1].toLocaleString()+'円</span></div>';}).join('')
    +'</div>'
    +'<div class="card"><div class="card-title">控除情報の入力</div>'
    +'<div class="form-row"><label class="form-label">青色申告特別控除</label><select id="kk-aoiro" class="form-select"><option value="none">適用なし</option><option value="10">10万円</option><option value="65"'+(d.aoiro==='65'?' selected':'')+'>65万円</option></select></div>'
    +'<div class="form-row"><label class="form-label">社会保険料合計</label><input id="kk-shakai" type="number" class="form-inp" value="'+shakai+'" style="text-align:right"></div>'
    +'<div class="form-row"><label class="form-label">iDeCo・小規模企業共済</label><input id="kk-ideco" type="number" class="form-inp" value="'+ideco+'" style="text-align:right"></div>'
    +'<div class="form-row"><label class="form-label">医療費合計（実額）</label><input id="kk-iryo" type="number" class="form-inp" value="'+(iryo+100000)+'" style="text-align:right"></div>'
    +'<div class="form-row"><label class="form-label">源泉徴収税額</label><input id="kk-gen" type="number" class="form-inp" value="'+genzensen+'" style="text-align:right"></div>'
    +'<button id="kk-save" style="width:100%;padding:13px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:14px;font-weight:700;cursor:pointer;margin-top:8px">保存して再計算</button></div>';
  document.getElementById('kk-save').onclick=function(){
    var nd={aoiro:document.getElementById('kk-aoiro').value,shakaihoken_list:[{amount:parseInt(document.getElementById('kk-shakai').value)||0}],ideco_list:[{amount:parseInt(document.getElementById('kk-ideco').value)||0}],iryo_list:[{amount:parseInt(document.getElementById('kk-iryo').value)||0}],genzensen:parseInt(document.getElementById('kk-gen').value)||0,haigusha:d.haigusha||0,fuyou_count:d.fuyou_count||0};
    if(typeof saveKakuteiDeductions==='function')saveKakuteiDeductions(nd);
    renderKakuteiPreview();showToast('保存しました');
  };
}

// ── データ移行ツール ──
function renderMigration() {
  var el=document.getElementById('main-content');
  if(!el||!currentAcct||!accounts[currentAcct]){if(el)el.innerHTML='<div class="card"><div class="card-title">事業者を選択してください</div></div>';return;}
  var fmts={freee:'freee会計',yayoi:'弥生会計',mf:'マネーフォワード',generic:'その他（汎用CSV）'};
  var notes={freee:'freeeの「仕訳帳」→「エクスポート」→「CSV」からダウンロードできます。',yayoi:'弥生の「ファイル」→「エクスポート」→「仕訳日記帳」からダウンロードできます。',mf:'マネーフォワードの「会計帳簿」→「仕訳帳」→「エクスポート」からダウンロードできます。',generic:'日付・摘要・金額・科目の列を手動でマッピングします。'};
  el.innerHTML='<div class="card"><div class="card-title">他社ソフトからのデータ移行</div>'
    +'<div style="font-family:var(--sans);font-size:11px;color:var(--text3);margin-bottom:16px;line-height:1.7">現在お使いの会計ソフトのCSVを取り込んで、忍者帳場に仕訳を移行します。</div>'
    +'<div class="form-row"><label class="form-label">移行元ソフト</label><select id="mig-fmt" class="form-select">'
    +Object.keys(fmts).map(function(k){return'<option value="'+k+'">'+fmts[k]+'</option>';}).join('')
    +'</select></div>'
    +'<div id="mig-note" style="font-family:var(--sans);font-size:11px;color:var(--gold);background:rgba(139,101,8,0.07);border:1px solid rgba(139,101,8,0.2);border-radius:8px;padding:10px 12px;margin-bottom:12px;line-height:1.6">'+notes.freee+'</div>'
    +'<div class="form-row"><label class="form-label">CSVファイルを選択</label><input type="file" id="mig-file" accept=".csv,.txt" class="form-inp" style="padding:10px;cursor:pointer"></div>'
    +'<button id="mig-btn" style="width:100%;padding:12px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer">内容を確認する</button>'
    +'</div><div id="mig-result"></div>';
  document.getElementById('mig-fmt').onchange=function(){document.getElementById('mig-note').textContent=notes[this.value]||'';};
  document.getElementById('mig-btn').onclick=function(){
    var file=document.getElementById('mig-file').files[0];
    if(!file){showToast('CSVファイルを選択してください');return;}
    var reader=new FileReader();
    reader.onload=function(e){
      var lines=e.target.result.split(/[\r\n]+/).filter(function(l){return l.trim();});
      if(!lines.length){showToast('データが見つかりませんでした');return;}
      var headers=lines[0].split(',').map(function(h){return h.replace(/^"|"$/g,'').trim();});
      var rows=lines.slice(1).map(function(l){var cols=l.split(',');var row={};cols.forEach(function(c,i){if(i<headers.length)row[headers[i]]=c.replace(/^"|"$/g,'').trim();});return row;});
      var dateKey=headers.find(function(h){return h.indexOf('日付')>=0||h.indexOf('date')>=0;})||headers[0];
      var descKey=headers.find(function(h){return h.indexOf('摘要')>=0||h.indexOf('内容')>=0;})||headers[1]||'';
      var amtKey=headers.find(function(h){return h.indexOf('金額')>=0;})||'';
      var catKey=headers.find(function(h){return h.indexOf('科目')>=0;})||'';
      var journals=rows.filter(function(r){return r[dateKey];}).map(function(r,i){
        var amt=parseInt((r[amtKey]||'0').replace(/[^0-9-]/g,''))||0;
        return{id:Date.now()+i,date:(r[dateKey]||'').replace(/\//g,'-'),type:amt>=0?'income':'expense',amount:Math.abs(amt),category:r[catKey]||'未分類',description:r[descKey]||'取込データ',status:'unconfirmed',source:'migration'};
      }).filter(function(j){return j.amount>0;});
      var el2=document.getElementById('mig-result');
      el2.innerHTML='<div class="card"><div class="card-title">'+journals.length+'件が見つかりました</div>'
        +journals.slice(0,5).map(function(j){return'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-family:var(--sans);font-size:11px"><span>'+j.date+'</span><span style="flex:1;padding:0 8px">'+j.description+'</span><span style="font-weight:700">'+j.amount.toLocaleString()+'円</span></div>';}).join('')
        +(journals.length>5?'<div style="font-family:var(--sans);font-size:10px;color:var(--text3);padding:8px 0">他 '+(journals.length-5)+' 件...</div>':'')
        +'<button id="mig-import" style="width:100%;padding:12px;background:var(--text);color:#fff;border:none;border-radius:var(--radius);font-family:var(--font);font-size:13px;font-weight:700;cursor:pointer;margin-top:12px">'+journals.length+'件を取り込む</button>'
        +'</div>';
      document.getElementById('mig-import').onclick=function(){
        var a=accounts[currentAcct];if(!a.journals)a.journals=[];
        journals.forEach(function(j){a.journals.push(j);});
        save(currentAcct);showToast(journals.length+'件を取り込みました');
        el2.innerHTML='';setTimeout(function(){switchTab('review');},500);
      };
    };
    reader.readAsText(file,'UTF-8');
  };
}

// ── EY監査法人 会計基準参照 ──
const EY_BASE_URL = 'https://www.ey.com/ja_jp/assurance/accounting-standards';

// 会計基準の参考情報（EYガイドラインベース）
const ACCOUNTING_STANDARDS = {
  '売上高':       { category: '売上', type: '収益', standard: 'IFRS15/ASC606 売上認識基準' },
  '外注費':       { category: '費用', type: '課税仕入', standard: '独立企業間取引基準' },
  '地代家賃':     { category: '費用', type: '課税仕入', standard: 'IAS17/IFRS16 リース基準' },
  '減価償却費':   { category: '費用', type: '不課税', standard: 'IAS16 有形固定資産基準' },
  '交際費':       { category: '費用', type: '課税仕入', standard: '法人税法第37条' },
  '旅費交通費':   { category: '費用', type: '課税仕入', standard: '実費精算原則' },
  '通信費':       { category: '費用', type: '課税仕入', standard: '発生主義会計原則' },
  '消耗品費':     { category: '費用', type: '課税仕入', standard: '重要性の原則（5万円基準）' },
  '広告宣伝費':   { category: '費用', type: '課税仕入', standard: '費用収益対応原則' },
  '水道光熱費':   { category: '費用', type: '課税仕入', standard: '発生主義会計原則' },
  '損害保険料':   { category: '費用', type: '非課税', standard: '保険料・共済掛金処理基準' },
  '支払報酬料':   { category: '費用', type: '課税仕入', standard: '報酬・給与区分基準' },
  '支払利息':     { category: '費用', type: '非課税', standard: 'IAS23 借入コスト基準' },
  '雑費':         { category: '費用', type: '課税仕入', standard: '重要性の原則' },
};
}

function getAccountingStandard(category) {
  return ACCOUNTING_STANDARDS[category] || null;
}

function showAccountingStandardInfo(category) {
  const std = getAccountingStandard(category);
  if (!std) return;
  showToast(category + ': ' + std.standard);
}

// ── SHA-256ハッシュ（パスワード保護） ──
async function hashPassword(pw, email) {
  var salt = email + 'ninja2026_v7_salt_' + email.length;
  var raw = pw + ':' + salt;
  var msgBuffer = new TextEncoder().encode(raw);
  var hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
}

// 後方互換: 旧btoaハッシュの確認
function legacyHash(pw, email) {
  try { return btoa(pw + email + 'ninja2026salt'); } catch(e) { return ''; }
}

// パスワードの検証（SHA-256 + 後方互換）
async function verifyPassword(pw, email, storedHash) {
  // 新形式（SHA-256）
  var newHash = await hashPassword(pw, email);
  if (newHash === storedHash) return true;
  // 旧形式（btoa）後方互換
  if (legacyHash(pw, email) === storedHash) return true;
  return false;
}

// ── トークン保護（難読化） ──
function protectToken(token) {
  if (!token) return '';
  try {
    return btoa(encodeURIComponent(token).split('').reverse().join(''));
  } catch(e) { return token; }
}
function restoreToken(protected_token) {
  if (!protected_token) return '';
  try {
    return decodeURIComponent(atob(protected_token).split('').reverse().join(''));
  } catch(e) { return protected_token; }
}
// ── ログアウト ──
function signOut() {
  try {
    var key = typeof PW_KEY !== 'undefined' ? PW_KEY : 'ninja_choba_auth';
    sessionStorage.removeItem(key);
    sessionStorage.removeItem('login_email');
    sessionStorage.removeItem('login_name');
    if (typeof SB !== 'undefined' && SB.client) SB.client.auth.signOut().catch(function(){});
    accounts = {};
    currentAcct = null;
  } catch(e) {}
  var ap = document.getElementById('app');
  var ps = document.getElementById('pw-screen');
  var bn = document.getElementById('mobile-nav');
  if (ap) ap.style.display = 'none';
  if (bn) bn.style.display = 'none';
  if (ps) {
    ps.style.display = 'flex';
    var e1 = document.getElementById('login-email-input');
    var e2 = document.getElementById('login-pw-input');
    var e3 = document.getElementById('pw-error');
    if (e1) e1.value = '';
    if (e2) e2.value = '';
    if (e3) e3.style.display = 'none';
    if (typeof switchAuthTab === 'function') switchAuthTab('login');
  }
}

// ── ログインボタン用ラッパー（async対応） ──
function doCheckPassword() {
  if (typeof checkPassword === 'function') {
    Promise.resolve(checkPassword()).catch(function() {
      var e = document.getElementById('pw-error');
      if (e) { e.style.display = 'block'; e.textContent = 'ログインエラーが発生しました'; }
    });
  }
}
function doDemoLogin() {
  if (typeof quickDemoLogin === 'function') Promise.resolve(quickDemoLogin()).catch(function(){});
}
function doHandleSignup() {
  if (typeof handleSignup === 'function') {
    Promise.resolve(handleSignup()).catch(function() {
      var e = document.getElementById('signup-error');
      if (e) { e.style.display = 'block'; e.textContent = '登録エラーが発生しました'; }
    });
  }
}

// ── 初期化 ──
loadAccounts();
checkTaxSchedule();

// ── ログインフォームのイベント設定 ──
(function setupLoginEvents() {
  function trySetup() {
    var loginBtn = document.getElementById('login-submit-btn');
    var demoBtn = document.getElementById('demo-submit-btn');
    var signupBtn = document.getElementById('signup-submit-btn');
    var emailInput = document.getElementById('login-email-input');
    var pwInput = document.getElementById('login-pw-input');

    if (loginBtn) loginBtn.onclick = function() { doCheckPassword(); };
    if (demoBtn) demoBtn.onclick = function() { doDemoLogin(); };
    if (signupBtn) signupBtn.onclick = function() { doHandleSignup(); };
    if (emailInput) emailInput.onkeydown = function(e) { if(e.key==='Enter') doCheckPassword(); };
    if (pwInput) pwInput.onkeydown = function(e) { if(e.key==='Enter') doCheckPassword(); };
    var tabLogin = document.getElementById('tab-login');
    var tabSignup = document.getElementById('tab-signup');
    if (tabLogin) tabLogin.onclick = function() { if(typeof switchAuthTab==='function') switchAuthTab('login'); };
    if (tabSignup) tabSignup.onclick = function() { if(typeof switchAuthTab==='function') switchAuthTab('signup'); };
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trySetup);
  } else {
    trySetup();
  }
})();

window.addEventListener('orientationchange', function() {
  var ps = document.getElementById('pw-screen');
  if (ps && ps.style.display !== 'none') {
    setTimeout(function() { ps.style.alignItems = 'center'; ps.scrollTop = 0; }, 100);
  }
});

window.addEventListener('load', function() {
  if (typeof checkPWAShortcut === 'function' && currentAcct) checkPWAShortcut();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      console.log('[PWA] SW登録完了:', reg.scope);
    }).catch(function(err) {
      console.log('[PWA] SW登録失敗:', err);
    });
  }
});

// ── パスワード認証 ──

function quickDemoLogin() {
  var e = document.getElementById('login-email-input');
  var p = document.getElementById('login-pw-input');
  if (e) e.value = 'demo@ninja-choba.jp';
  if (p) p.value = 'demo2025';
  checkPassword();
}

async function checkPassword() {
  var emailEl = document.getElementById('login-email-input');
  var pwEl    = document.getElementById('login-pw-input');
  var errorEl = document.getElementById('pw-error');
  if (!emailEl || !pwEl) return;
  var email = emailEl.value.trim().toLowerCase();
  var pw    = pwEl.value;

  function doLogin() {
    try { sessionStorage.setItem(PW_KEY,'1'); sessionStorage.setItem('login_email',email); } catch(e){}
    var ps = document.getElementById('pw-screen');
    var ap = document.getElementById('app');
    var bn = document.getElementById('mobile-nav');
    if (ps) ps.style.display = 'none';
    if (ap) ap.style.display = 'flex';
    if (bn) bn.style.display = 'flex';
    if (errorEl) errorEl.style.display = 'none';
    if (typeof renderModeToggle==='function') renderModeToggle();
    if (typeof renderTrialBanner==='function') renderTrialBanner();
    Promise.resolve(typeof loadAccounts==='function' ? loadAccounts() : null).then(function() {
      if (!currentAcct && typeof accounts !== 'undefined') {
        var keys = Object.keys(accounts);
        if (keys.length > 0 && typeof selectAccount === 'function') {
          selectAccount(keys[0]); return;
        }
      }
      var mode = typeof getViewMode==='function' ? getViewMode() : 'monzen';
      if (typeof switchTab==='function') switchTab(mode==='shinobi'?'dashboard':'monzen');
      if (email==='demo@ninja-choba.jp' && typeof loadSuzukiDummyData==='function') {
        setTimeout(loadSuzukiDummyData, 500);
      }
    }).catch(function() {
      if (typeof switchTab==='function') switchTab('monzen');
    });
  }

  function showError(msg) {
    if (errorEl) { errorEl.style.display='block'; errorEl.textContent=msg; }
  }

  try {
    var users = JSON.parse(localStorage.getItem('ninja_users')||'{}');
    if (users[email]) {
      var verified = await verifyPassword(pw, email, users[email].pw_hash);
      if (verified) {
        try { sessionStorage.setItem('login_name', users[email].name||''); } catch(e){}
        doLogin(); return;
      } else { showError('パスワードが正しくありません'); return; }
    }
  } catch(e){}

  var ALLOWED = {'asianchampions@yahoo.co.jp': APP_PASSWORD, 'demo@ninja-choba.jp': 'demo2025'};
  if (ALLOWED[email] && ALLOWED[email]===pw) { doLogin(); }
  else { showError('メールアドレスまたはパスワードが正しくありません'); }
}

function switchAuthTab(tab) {
  var lf=document.getElementById('login-form');
  var sf=document.getElementById('signup-form');
  var tl=document.getElementById('tab-login');
  var ts=document.getElementById('tab-signup');
  if (!lf||!sf) return;
  if (tab==='login') {
    lf.style.display='block'; sf.style.display='none';
    if(tl){tl.style.background='var(--text)';tl.style.color='#fff';}
    if(ts){ts.style.background='transparent';ts.style.color='var(--text3)';}
  } else {
    lf.style.display='none'; sf.style.display='block';
    if(ts){ts.style.background='var(--text)';ts.style.color='#fff';}
    if(tl){tl.style.background='transparent';tl.style.color='var(--text3)';}
  }
}

// セッション確認
(function(){
  try {
    if (sessionStorage.getItem('ninja_choba_auth')==='1') {
      var ps=document.getElementById('pw-screen');
      var ap=document.getElementById('app');
      var bn=document.getElementById('mobile-nav');
      if(ps) ps.style.display='none';
      if(ap) ap.style.display='flex';
      if(bn) bn.style.display='flex';
    }
  } catch(e){}
})();
