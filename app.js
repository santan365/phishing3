// CSEC3100 Phishing Awareness Trainer v0.4 — scenarios fetched from GitHub
const app = document.getElementById('app');

const SCENARIOS_URL = 'https://raw.githubusercontent.com/santan365/phishing-trainer/main/scenarios.json';

// State
let scenarioBank    = [];
let scenarios       = [];
let idx             = 0, score = 0, attempts = 0, streak = 0, bestStreak = 0;
let activeCategory  = 'all';
let reviewMode      = false;
let missedThisSession = [];

// localStorage
const HISTORY_KEY = 'phishing_history_v1';
const SESSION_KEY = 'phishing_last_v1';

function loadHistory()   { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {}; } catch(_){ return {}; } }
function saveHistory(h)  { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch(_){} }
function saveLastSession(){ try { localStorage.setItem(SESSION_KEY, JSON.stringify({ score, attempts, date: new Date().toLocaleDateString('en-GB') })); } catch(_){} }
function loadLastSession(){ try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch(_){ return null; } }

function recordAttempt(id, correct) {
  const h = loadHistory();
  if (!h[id]) h[id] = { correct: 0, attempts: 0 };
  h[id].attempts++;
  if (correct) h[id].correct++;
  saveHistory(h);
}

function getWeakAreas() {
  const h = loadHistory();
  return scenarioBank.filter(s => { const r = h[s.id]; return r && r.attempts > 0 && (r.correct / r.attempts) < 0.6; });
}

// Helpers
function onActivate(el, fn) {
  if (!el) return;
  el.addEventListener('click', fn);
  el.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' '){e.preventDefault();fn();} });
}
function sortByDifficulty(arr) {
  return [1,2,3].map(d => arr.filter(s=>s.difficulty===d).sort(()=>Math.random()-0.5)).flat();
}
function filterScenarios(cat) { return cat==='all' ? [...scenarioBank] : scenarioBank.filter(s=>s.category===cat); }
function difficultyBadge(level) {
  const map = {1:['Easy','badge--easy'],2:['Medium','badge--medium'],3:['Hard','badge--hard']};
  const [label,cls] = map[level]||['Medium','badge--medium'];
  return `<span class="badge ${cls}">${label}</span>`;
}
function progressBar() {
  const pct = scenarios.length ? (idx/scenarios.length)*100 : 0;
  return `<div class="progress-wrap"><div class="progress-fill" style="width:${pct}%"></div></div>`;
}
function streakBadge() { return streak>=2 ? `<span class="streak-badge">${streak} streak</span>` : ''; }
function typeLabel(t) { return t==='email'?'Email':t==='sms'?'SMS':t==='vishing'?'Vishing':t.toUpperCase(); }

// Boot — fetch scenarios then show home
async function init() {
  app.innerHTML = `<section class="card home-card"><p class="muted">Loading scenarios...</p></section>`;
  try {
    const res = await fetch(SCENARIOS_URL);
    if (!res.ok) throw new Error('fetch failed');
    scenarioBank = await res.json();
  } catch(_) {
    app.innerHTML = `<section class="card home-card">
      <h2>Could not load scenarios</h2>
      <p class="muted">Check your internet connection and refresh the page.</p>
    </section>`;
    return;
  }
  viewHome();
}

// Views
function viewHome() {
  const last = loadLastSession();
  const weak = getWeakAreas();
  const cats = [
    {id:'all',    label:'All',     count:scenarioBank.length},
    {id:'email',  label:'Email',   count:scenarioBank.filter(s=>s.category==='email').length},
    {id:'sms',    label:'SMS',     count:scenarioBank.filter(s=>s.category==='sms').length},
    {id:'vishing',label:'Vishing', count:scenarioBank.filter(s=>s.category==='vishing').length},
  ];
  app.innerHTML = `
    <section class="card home-card" aria-labelledby="home-title">
      <h2 id="home-title">Phishing Awareness Trainer</h2>
      <p class="home-subtitle">Can you tell a scam from the real thing? Work through realistic scenarios and sharpen your instincts.</p>
      ${last ? `<p class="last-session">Last session: <strong>${last.score}/${last.attempts}</strong> correct &middot; ${last.date}</p>` : ''}
      ${weak.length ? `<div class="weak-areas"><p class="weak-areas__heading">Areas to practise</p><ul>${weak.map(s=>`<li>${s.sender} &middot; <span class="muted">${typeLabel(s.type)}</span></li>`).join('')}</ul></div>` : ''}
      <div class="cat-filter" role="group" aria-label="Filter by scenario type">
        ${cats.map(c=>`<button class="cat-btn ${activeCategory===c.id?'cat-btn--active':''}" data-cat="${c.id}" aria-pressed="${activeCategory===c.id}">${c.label} <span class="cat-count">${c.count}</span></button>`).join('')}
      </div>
      <div class="btn-row home-btns">
        <button id="startBtn" class="btn btn-primary">Start Training</button>
      </div>
      <p class="muted">${scenarioBank.length} scenarios &middot; Easy to Hard &middot; No data stored externally</p>
    </section>`;
  document.querySelectorAll('.cat-btn').forEach(btn => onActivate(btn, ()=>{ activeCategory=btn.dataset.cat; viewHome(); }));
  const sb = document.getElementById('startBtn');
  onActivate(sb, start); sb.focus();
}

function viewScenario() {
  if (idx >= scenarios.length) { viewSummary(); return; }
  const s = scenarios[idx];
  let msg = '';
  if (s.type === 'email') {
    msg = `<div class="message-frame email-frame">
      <div class="email-header">
        <div class="email-avatar">${s.sender.charAt(0)}</div>
        <div class="email-meta">
          <span class="email-sender">${s.sender}</span>
          <span class="email-address muted">&lt;${s.senderEmail}&gt;</span>
        </div>
        <span class="email-time muted">${s.timestamp}</span>
      </div>
      <div class="email-subject"><strong>${s.subject||''}</strong></div>
      <div class="email-body"><p>${s.body}</p>${s.displayLink?`<p class="inert-link">[Link] ${s.displayLink}</p>`:''}</div>
    </div>`;
  } else if (s.type === 'sms') {
    msg = `<div class="message-frame sms-frame">
      <div class="sms-header">
        <div class="sms-avatar">SMS</div>
        <div class="sms-meta"><span class="sms-sender">${s.sender}</span><span class="muted">${s.number}</span></div>
        <span class="muted">${s.timestamp}</span>
      </div>
      <div class="sms-bubble"><p>${s.body}</p>${s.displayLink?`<span class="inert-link">[Link] ${s.displayLink}</span>`:''}</div>
    </div>`;
  } else {
    msg = `<div class="message-frame vishing-frame">
      <div class="vishing-header">
        <div class="vishing-icon-box">CALL</div>
        <div class="vishing-meta"><span class="vishing-sender">${s.sender}</span><span class="muted">${s.number} &middot; ${s.timestamp}</span></div>
        <span class="call-badge">Incoming Call</span>
      </div>
      <div class="call-transcript">
        ${s.transcript.map(l=>`<div class="call-line call-line--${l.role}"><span class="call-role">${l.role==='caller'?'Caller':'You'}</span><p>${l.text}</p></div>`).join('')}
      </div>
      ${s.displayLink?`<p class="inert-link" style="margin:12px 16px 16px">[Link] ${s.displayLink}</p>`:''}
    </div>`;
  }
  app.innerHTML = `
    <section class="card" aria-labelledby="scenario-title">
      ${progressBar()}
      <div class="scenario-meta">
        <h2 id="scenario-title" class="scenario-label">${typeLabel(s.type)} &middot; ${idx+1} of ${scenarios.length}${reviewMode?' <span class="review-tag">Review</span>':''}</h2>
        <div style="display:flex;gap:8px;align-items:center">${streakBadge()}${difficultyBadge(s.difficulty)}</div>
      </div>
      ${msg}
      <p class="decision-prompt">Is this message legitimate or suspicious?</p>
      <div class="btn-row decision-row">
        <button id="proceedBtn" class="btn btn-proceed">Proceed</button>
        <button id="reportBtn"  class="btn btn-report">Report</button>
      </div>
      <button id="homeBtn" class="btn btn-ghost home-link">Home</button>
      <p class="muted score-inline">Score: ${score}/${attempts}${bestStreak>1?` &middot; Best streak: ${bestStreak}`:''}</p>
    </section>`;
  onActivate(document.getElementById('proceedBtn'), ()=>choose('PROCEED'));
  onActivate(document.getElementById('reportBtn'),  ()=>choose('REPORT'));
  onActivate(document.getElementById('homeBtn'), viewHome);
  document.getElementById('proceedBtn').focus();
}

function viewFeedback(correct, s) {
  const isLast = idx >= scenarios.length;
  app.innerHTML = `
    <section class="card" aria-labelledby="feedback-title">
      ${progressBar()}
      <div class="feedback-result ${correct?'feedback-correct':'feedback-wrong'}">
        <span class="feedback-label">${correct?'Correct':'Incorrect'}</span>
        <span>${correct?'Good call.':'That was risky.'}</span>
        ${streakBadge()}
      </div>
      <div class="feedback-block">
        <p class="feedback-block__heading">Red flags to spot:</p>
        <ul class="cue-list">${s.cues.map(c=>`<li>${c}</li>`).join('')}</ul>
      </div>
      <div class="feedback-block explanation-block"><p>${s.explanation}</p></div>
      <div class="btn-row">
        ${isLast?`<button id="finishBtn" class="btn btn-primary">View Summary</button>`:`<button id="nextBtn" class="btn btn-primary">Next Scenario</button>`}
        <button id="retryBtn" class="btn">Retry</button>
        <button id="homeBtn"  class="btn btn-ghost">Home</button>
      </div>
      <p class="muted score-inline">Score: ${score}/${attempts}</p>
    </section>`;
  if (isLast) { const fb=document.getElementById('finishBtn'); onActivate(fb,viewSummary); fb&&fb.focus(); }
  else        { const nb=document.getElementById('nextBtn');   onActivate(nb,viewScenario); nb&&nb.focus(); }
  onActivate(document.getElementById('retryBtn'), ()=>{
    idx=Math.max(0,idx-1); attempts=Math.max(0,attempts-1);
    if(correct){score=Math.max(0,score-1);streak=Math.max(0,streak-1);}
    viewScenario();
  });
  onActivate(document.getElementById('homeBtn'), viewHome);
}

function viewSummary() {
  saveLastSession(); reviewMode = false;
  const pct = attempts===0?0:Math.round((score/attempts)*100);
  const weak = getWeakAreas();
  const stats = [{label:'Final Score',value:`${score}/${attempts}`},{label:'Correct',value:score},{label:'Accuracy',value:`${pct}%`},{label:'Best Streak',value:bestStreak}];
  app.innerHTML = `
    <section class="card" aria-labelledby="summary-title">
      <h2 id="summary-title">Session Summary</h2>
      <div class="summary-stats">${stats.map(s=>`<div class="summary-stat"><span class="summary-stat__value">${s.value}</span><span class="summary-stat__label">${s.label}</span></div>`).join('')}</div>
      <div class="summary-message"><p>${getMotivationalMessage(score,attempts)}</p></div>
      ${weak.length?`<div class="weak-areas"><p class="weak-areas__heading">Weak areas (all sessions)</p><ul>${weak.map(s=>`<li>${s.sender} &middot; <span class="muted">${typeLabel(s.type)}</span></li>`).join('')}</ul></div>`:''}
      <div class="btn-row">
        <button id="tryAgainBtn" class="btn btn-primary">Try Again</button>
        ${missedThisSession.length?`<button id="reviewBtn" class="btn btn-review">Review ${missedThisSession.length} Missed</button>`:''}
        <button id="homeBtn" class="btn">Home</button>
      </div>
    </section>`;
  onActivate(document.getElementById('tryAgainBtn'), start);
  onActivate(document.getElementById('homeBtn'), viewHome);
  if (missedThisSession.length) onActivate(document.getElementById('reviewBtn'), startReview);
  document.getElementById('tryAgainBtn').focus();
}

function getMotivationalMessage(score, total) {
  const pct = total===0?0:score/total;
  if (pct===1)   return "Outstanding — you spotted every red flag. You are well-prepared against phishing attacks.";
  if (pct>=0.75) return "Good work — you caught most threats. Review the ones you missed to sharpen your instincts.";
  if (pct>=0.5)  return "A solid start — but attackers rely on hesitation. Keep practising to build faster, more confident judgement.";
  return "Phishing attacks can fool anyone. Study the cues in the feedback and try again — it gets easier with practice.";
}

function start() {
  reviewMode=false; missedThisSession=[];
  scenarios=sortByDifficulty(filterScenarios(activeCategory));
  idx=0;score=0;attempts=0;streak=0;bestStreak=0;
  viewScenario();
}
function startReview() {
  reviewMode=true;
  scenarios=sortByDifficulty(scenarioBank.filter(s=>missedThisSession.includes(s.id)));
  missedThisSession=[];
  idx=0;score=0;attempts=0;streak=0;bestStreak=0;
  viewScenario();
}
function choose(choice) {
  const s=scenarios[idx], correct=(choice===s.correctAction);
  attempts++;
  if(correct){score++;streak++;if(streak>bestStreak)bestStreak=streak;}
  else{streak=0;if(!missedThisSession.includes(s.id))missedThisSession.push(s.id);}
  idx++;
  recordAttempt(s.id,correct);
  viewFeedback(correct,s);
}

init();
