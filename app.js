// ============================================================
// CSEC3100 Phishing Awareness Trainer v0.4
// Pure client-side SPA — no backend, no framework
// Scenarios are fetched from GitHub on load (see SCENARIOS_URL)
// Session data is stored in localStorage (see HISTORY_KEY / SESSION_KEY)
// ============================================================

// Grab the main container div from index.html — all views are injected here
const app = document.getElementById('app');

// URL of the scenarios JSON file hosted on GitHub
// To add/edit scenarios, update this file on GitHub — no code change needed
const SCENARIOS_URL = 'https://raw.githubusercontent.com/santan365/phishing-trainer/main/scenarios.json';

// ============================================================
// SESSION STATE
// These variables track what is happening in the current session
// They all reset when start() is called
// ============================================================
let scenarioBank      = [];   // Full list of scenarios fetched from GitHub
let scenarios         = [];   // Active list for the current session (filtered + sorted)
let idx               = 0;    // Index of the current scenario being shown
let score             = 0;    // Number of correct answers this session
let attempts          = 0;    // Total answers submitted this session (includes retries)
let streak            = 0;    // Current consecutive correct answers
let bestStreak        = 0;    // Highest streak reached this session
let activeCategory    = 'all';// Category filter selected on the home screen
let reviewMode        = false; // True when user is replaying missed scenarios
let missedThisSession = [];   // IDs of scenarios the user got wrong this session

// ============================================================
// LOCALSTORAGE KEYS
// Two separate keys are used to keep data organised
// ============================================================
const HISTORY_KEY = 'phishing_history_v1'; // Per-scenario accuracy across all sessions
const SESSION_KEY = 'phishing_last_v1';    // Most recent session score and date

// ============================================================
// LOCALSTORAGE FUNCTIONS
// All wrapped in try/catch so the app doesn't crash if
// localStorage is unavailable (e.g. private browsing mode)
// ============================================================

// Read the full per-scenario history object from localStorage
// Returns an empty object if nothing is stored yet
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {}; }
  catch(_){ return {}; }
}

// Write the updated history object back to localStorage
function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }
  catch(_){}
}

// Record the result of one scenario attempt
// Each scenario ID maps to { correct: N, attempts: N }
function recordAttempt(id, correct) {
  const h = loadHistory();
  if (!h[id]) h[id] = { correct: 0, attempts: 0 }; // First time seeing this scenario
  h[id].attempts++;
  if (correct) h[id].correct++;
  saveHistory(h);
}

// Save the current session's final score and date
// This is shown on the home screen as "Last session: X/Y"
function saveLastSession() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      score, attempts, date: new Date().toLocaleDateString('en-GB')
    }));
  } catch(_){}
}

// Load the last session summary for display on the home screen
function loadLastSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch(_){ return null; }
}

// Return scenarios where the user's historical accuracy is below 60%
// These are shown in the "Areas to practise" panel
function getWeakAreas() {
  const h = loadHistory();
  return scenarioBank.filter(s => {
    const r = h[s.id];
    return r && r.attempts > 0 && (r.correct / r.attempts) < 0.6;
  });
}

// ============================================================
// HELPER FUNCTIONS
// Small utilities used throughout the app
// ============================================================

// Attach both click and keyboard (Enter/Space) listeners to a button
// This makes all buttons accessible for keyboard-only users (NFR2)
function onActivate(el, fn) {
  if (!el) return;
  el.addEventListener('click', fn);
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
  });
}

// Sort scenarios by difficulty: Easy first, then Medium, then Hard
// Within each difficulty group, scenarios are shuffled randomly
// This ensures sessions always progress from simpler to harder attacks
function sortByDifficulty(arr) {
  return [1, 2, 3]
    .map(d => arr.filter(s => s.difficulty === d).sort(() => Math.random() - 0.5))
    .flat();
}

// Filter the full scenario bank by category
// 'all' returns everything; 'email', 'sms', or 'vishing' returns that subset
function filterScenarios(cat) {
  return cat === 'all' ? [...scenarioBank] : scenarioBank.filter(s => s.category === cat);
}

// Return a coloured difficulty badge based on the scenario's difficulty number
// 1 = Easy (green), 2 = Medium (yellow), 3 = Hard (red)
function difficultyBadge(level) {
  const map = { 1: ['Easy','badge--easy'], 2: ['Medium','badge--medium'], 3: ['Hard','badge--hard'] };
  const [label, cls] = map[level] || ['Medium', 'badge--medium'];
  return `<span class="badge ${cls}">${label}</span>`;
}

// Return a progress bar showing how far through the session the user is
// The fill width is calculated as (current index / total scenarios) * 100%
function progressBar() {
  const pct = scenarios.length ? (idx / scenarios.length) * 100 : 0;
  return `<div class="progress-wrap"><div class="progress-fill" style="width:${pct}%"></div></div>`;
}

// Return a streak badge if the user has 2+ consecutive correct answers
// Only shown when streak >= 2 to avoid cluttering the UI for single correct answers
function streakBadge() {
  return streak >= 2 ? `<span class="streak-badge">${streak} streak</span>` : '';
}

// Convert the internal type string to a readable display label
function typeLabel(t) {
  return t === 'email' ? 'Email' : t === 'sms' ? 'SMS' : t === 'vishing' ? 'Vishing' : t.toUpperCase();
}

// ============================================================
// INIT — runs once on page load
// Fetches scenarios from GitHub, then shows the home screen
// If the fetch fails, shows an error message instead of crashing
// ============================================================
async function init() {
  // Show a loading message while the fetch is in progress
  app.innerHTML = `<section class="card home-card"><p class="muted">Loading scenarios...</p></section>`;
  try {
    const res = await fetch(SCENARIOS_URL);
    if (!res.ok) throw new Error('fetch failed');
    scenarioBank = await res.json(); // Populate the scenario bank from GitHub
  } catch(_) {
    // If the fetch fails (no internet, wrong URL, etc.) show a friendly error
    app.innerHTML = `<section class="card home-card">
      <h2>Could not load scenarios</h2>
      <p class="muted">Check your internet connection and refresh the page.</p>
    </section>`;
    return;
  }
  viewHome(); // Fetch succeeded — show the home screen
}

// ============================================================
// VIEW: HOME SCREEN
// Shows the welcome message, last session badge, weak areas,
// category filter buttons, and the Start Training button
// ============================================================
function viewHome() {
  const last = loadLastSession();  // Previous session data for the badge
  const weak = getWeakAreas();     // Scenarios the user historically struggles with

  // Build category filter button data
  const cats = [
    { id: 'all',     label: 'All',     count: scenarioBank.length },
    { id: 'email',   label: 'Email',   count: scenarioBank.filter(s => s.category === 'email').length },
    { id: 'sms',     label: 'SMS',     count: scenarioBank.filter(s => s.category === 'sms').length },
    { id: 'vishing', label: 'Vishing', count: scenarioBank.filter(s => s.category === 'vishing').length },
  ];

  // Inject the home screen HTML into the app container
  app.innerHTML = `
    <section class="card home-card" aria-labelledby="home-title">
      <h2 id="home-title">Phishing Awareness Trainer</h2>
      <p class="home-subtitle">Can you tell a scam from the real thing? Work through realistic scenarios and sharpen your instincts.</p>

      ${last ? `<p class="last-session">Last session: <strong>${last.score}/${last.attempts}</strong> correct &middot; ${last.date}</p>` : ''}

      ${weak.length ? `
        <div class="weak-areas">
          <p class="weak-areas__heading">Areas to practise</p>
          <ul>${weak.map(s => `<li>${s.sender} &middot; <span class="muted">${typeLabel(s.type)}</span></li>`).join('')}</ul>
        </div>` : ''}

      <div class="cat-filter" role="group" aria-label="Filter by scenario type">
        ${cats.map(c => `
          <button class="cat-btn ${activeCategory === c.id ? 'cat-btn--active' : ''}"
                  data-cat="${c.id}" aria-pressed="${activeCategory === c.id}">
            ${c.label} <span class="cat-count">${c.count}</span>
          </button>`).join('')}
      </div>

      <div class="btn-row home-btns">
        <button id="startBtn" class="btn btn-primary">Start Training</button>
      </div>
      <p class="muted">${scenarioBank.length} scenarios &middot; Easy to Hard &middot; No data stored externally</p>
    </section>`;

  // Attach click handlers to each category filter button
  // When clicked, update activeCategory and re-render the home screen
  document.querySelectorAll('.cat-btn').forEach(btn => {
    onActivate(btn, () => { activeCategory = btn.dataset.cat; viewHome(); });
  });

  const sb = document.getElementById('startBtn');
  onActivate(sb, start);
  sb.focus(); // Auto-focus so keyboard users can press Enter straight away
}

// ============================================================
// VIEW: SCENARIO SCREEN
// Renders the current scenario as an email, SMS, or vishing frame
// Shows difficulty badge, progress bar, streak, and decision buttons
// ============================================================
function viewScenario() {
  // If we've gone past the last scenario, show the summary instead
  if (idx >= scenarios.length) { viewSummary(); return; }

  const s = scenarios[idx]; // Current scenario object
  let msg = '';              // HTML for the message frame — built differently per type

  // EMAIL — rendered with a sender avatar, address, subject line, and body
  if (s.type === 'email') {
    msg = `
      <div class="message-frame email-frame">
        <div class="email-header">
          <div class="email-avatar">${s.sender.charAt(0)}</div>
          <div class="email-meta">
            <span class="email-sender">${s.sender}</span>
            <span class="email-address muted">&lt;${s.senderEmail}&gt;</span>
          </div>
          <span class="email-time muted">${s.timestamp}</span>
        </div>
        <div class="email-subject"><strong>${s.subject || ''}</strong></div>
        <div class="email-body">
          <p>${s.body}</p>
          ${s.displayLink ? `<p class="inert-link">[Link] ${s.displayLink}</p>` : ''}
        </div>
      </div>`;

  // SMS — rendered as a chat bubble with sender name and number in a header strip
  } else if (s.type === 'sms') {
    msg = `
      <div class="message-frame sms-frame">
        <div class="sms-header">
          <div class="sms-avatar">SMS</div>
          <div class="sms-meta">
            <span class="sms-sender">${s.sender}</span>
            <span class="muted">${s.number}</span>
          </div>
          <span class="muted">${s.timestamp}</span>
        </div>
        <div class="sms-bubble">
          <p>${s.body}</p>
          ${s.displayLink ? `<span class="inert-link">[Link] ${s.displayLink}</span>` : ''}
        </div>
      </div>`;

  // VISHING — rendered as a call transcript with alternating caller/user speech bubbles
  // Each line in s.transcript has a role ('caller' or 'you') and text
  } else if (s.type === 'vishing') {
    msg = `
      <div class="message-frame vishing-frame">
        <div class="vishing-header">
          <div class="vishing-icon-box">CALL</div>
          <div class="vishing-meta">
            <span class="vishing-sender">${s.sender}</span>
            <span class="muted">${s.number} &middot; ${s.timestamp}</span>
          </div>
          <span class="call-badge">Incoming Call</span>
        </div>
        <div class="call-transcript">
          ${s.transcript.map(l => `
            <div class="call-line call-line--${l.role}">
              <span class="call-role">${l.role === 'caller' ? 'Caller' : 'You'}</span>
              <p>${l.text}</p>
            </div>`).join('')}
        </div>
        ${s.displayLink ? `<p class="inert-link" style="margin:12px 16px 16px">[Link] ${s.displayLink}</p>` : ''}
      </div>`;
  }

  // Inject the full scenario screen HTML
  app.innerHTML = `
    <section class="card" aria-labelledby="scenario-title">
      ${progressBar()}
      <div class="scenario-meta">
        <h2 id="scenario-title" class="scenario-label">
          ${typeLabel(s.type)} &middot; ${idx + 1} of ${scenarios.length}
          ${reviewMode ? '<span class="review-tag">Review</span>' : ''}
        </h2>
        <div style="display:flex;gap:8px;align-items:center">
          ${streakBadge()}
          ${difficultyBadge(s.difficulty)}
        </div>
      </div>
      ${msg}
      <p class="decision-prompt">Is this message legitimate or suspicious?</p>
      <div class="btn-row decision-row">
        <button id="proceedBtn" class="btn btn-proceed">Proceed</button>
        <button id="reportBtn"  class="btn btn-report">Report</button>
      </div>
      <button id="homeBtn" class="btn btn-ghost home-link">Home</button>
      <p class="muted score-inline">Score: ${score}/${attempts}${bestStreak > 1 ? ` &middot; Best streak: ${bestStreak}` : ''}</p>
    </section>`;

  // Wire up the decision buttons — each calls choose() with the user's action
  onActivate(document.getElementById('proceedBtn'), () => choose('PROCEED'));
  onActivate(document.getElementById('reportBtn'),  () => choose('REPORT'));
  onActivate(document.getElementById('homeBtn'), viewHome);
  document.getElementById('proceedBtn').focus();
}

// ============================================================
// VIEW: FEEDBACK SCREEN
// Shows whether the user was correct, lists the red flag cues,
// and provides an explanation of the correct decision
// Also shows Next Scenario / View Summary / Retry / Home buttons
// ============================================================
function viewFeedback(correct, s) {
  // If all scenarios are done, show View Summary instead of Next Scenario
  const isLast = idx >= scenarios.length;

  app.innerHTML = `
    <section class="card" aria-labelledby="feedback-title">
      ${progressBar()}

      <!-- Result banner — green if correct, red if wrong -->
      <div class="feedback-result ${correct ? 'feedback-correct' : 'feedback-wrong'}">
        <span class="feedback-label">${correct ? 'Correct' : 'Incorrect'}</span>
        <span>${correct ? 'Good call.' : 'That was risky.'}</span>
        ${streakBadge()}
      </div>

      <!-- Cues panel — bullet list of red flags from the scenario object -->
      <div class="feedback-block">
        <p class="feedback-block__heading">Red flags to spot:</p>
        <ul class="cue-list">${s.cues.map(c => `<li>${c}</li>`).join('')}</ul>
      </div>

      <!-- Explanation — full sentence explanation from the scenario object -->
      <div class="feedback-block explanation-block">
        <p>${s.explanation}</p>
      </div>

      <div class="btn-row">
        ${isLast
          ? `<button id="finishBtn" class="btn btn-primary">View Summary</button>`
          : `<button id="nextBtn"   class="btn btn-primary">Next Scenario</button>`}
        <button id="retryBtn" class="btn">Retry</button>
        <button id="homeBtn"  class="btn btn-ghost">Home</button>
      </div>
      <p class="muted score-inline">Score: ${score}/${attempts}</p>
    </section>`;

  // Wire up navigation buttons
  if (isLast) {
    const fb = document.getElementById('finishBtn');
    onActivate(fb, viewSummary); fb && fb.focus();
  } else {
    const nb = document.getElementById('nextBtn');
    onActivate(nb, viewScenario); nb && nb.focus();
  }

  // Retry — undo the last answer so the user can try the same scenario again
  // Reverses the score, attempt count, and streak if the previous answer was correct
  onActivate(document.getElementById('retryBtn'), () => {
    idx = Math.max(0, idx - 1);
    attempts = Math.max(0, attempts - 1);
    if (correct) { score = Math.max(0, score - 1); streak = Math.max(0, streak - 1); }
    viewScenario();
  });

  onActivate(document.getElementById('homeBtn'), viewHome);
}

// ============================================================
// VIEW: SUMMARY SCREEN
// Shows final score, accuracy, best streak, weak areas,
// and offers Try Again / Review Missed / Home options
// ============================================================
function viewSummary() {
  saveLastSession();  // Persist this session's score to localStorage
  reviewMode = false; // Reset review mode for the next session

  const pct = attempts === 0 ? 0 : Math.round((score / attempts) * 100);
  const weak = getWeakAreas(); // Pull weak areas from the full history

  const stats = [
    { label: 'Final Score', value: `${score}/${attempts}` },
    { label: 'Correct',     value: score },
    { label: 'Accuracy',    value: `${pct}%` },
    { label: 'Best Streak', value: bestStreak },
  ];

  app.innerHTML = `
    <section class="card" aria-labelledby="summary-title">
      <h2 id="summary-title">Session Summary</h2>

      <!-- Stats grid — shows score, correct count, accuracy, best streak -->
      <div class="summary-stats">
        ${stats.map(s => `
          <div class="summary-stat">
            <span class="summary-stat__value">${s.value}</span>
            <span class="summary-stat__label">${s.label}</span>
          </div>`).join('')}
      </div>

      <!-- Motivational message based on score percentage -->
      <div class="summary-message"><p>${getMotivationalMessage(score, attempts)}</p></div>

      <!-- Weak areas panel — only shown if the user has historical weak spots -->
      ${weak.length ? `
        <div class="weak-areas">
          <p class="weak-areas__heading">Weak areas (all sessions)</p>
          <ul>${weak.map(s => `<li>${s.sender} &middot; <span class="muted">${typeLabel(s.type)}</span></li>`).join('')}</ul>
        </div>` : ''}

      <div class="btn-row">
        <button id="tryAgainBtn" class="btn btn-primary">Try Again</button>
        ${missedThisSession.length
          ? `<button id="reviewBtn" class="btn btn-review">Review ${missedThisSession.length} Missed</button>`
          : ''}
        <button id="homeBtn" class="btn">Home</button>
      </div>
    </section>`;

  onActivate(document.getElementById('tryAgainBtn'), start);
  onActivate(document.getElementById('homeBtn'), viewHome);
  if (missedThisSession.length) onActivate(document.getElementById('reviewBtn'), startReview);
  document.getElementById('tryAgainBtn').focus();
}

// ============================================================
// MOTIVATIONAL MESSAGE
// Returns a different message based on the user's accuracy
// Used on the summary screen
// ============================================================
function getMotivationalMessage(score, total) {
  const pct = total === 0 ? 0 : score / total;
  if (pct === 1)   return "Outstanding — you spotted every red flag. You are well-prepared against phishing attacks.";
  if (pct >= 0.75) return "Good work — you caught most threats. Review the ones you missed to sharpen your instincts.";
  if (pct >= 0.5)  return "A solid start — but attackers rely on hesitation. Keep practising to build faster, more confident judgement.";
  return "Phishing attacks can fool anyone. Study the cues in the feedback and try again — it gets easier with practice.";
}

// ============================================================
// FLOW FUNCTIONS
// These control the session lifecycle
// ============================================================

// Start a new session — resets all state variables and loads filtered scenarios
function start() {
  reviewMode = false;
  missedThisSession = [];
  scenarios = sortByDifficulty(filterScenarios(activeCategory)); // Apply filter + sort
  idx = 0; score = 0; attempts = 0; streak = 0; bestStreak = 0;
  viewScenario();
}

// Start a review session — replays only scenarios the user got wrong this session
// missedThisSession contains the IDs of those scenarios
function startReview() {
  reviewMode = true;
  scenarios = sortByDifficulty(scenarioBank.filter(s => missedThisSession.includes(s.id)));
  missedThisSession = []; // Reset so the new review session tracks its own misses
  idx = 0; score = 0; attempts = 0; streak = 0; bestStreak = 0;
  viewScenario();
}

// Called when the user clicks Proceed or Report
// Evaluates the answer, updates all state, records to localStorage, shows feedback
function choose(choice) {
  const s = scenarios[idx];
  const correct = (choice === s.correctAction); // Compare user's choice to the correct answer

  attempts++;

  if (correct) {
    score++;
    streak++;
    if (streak > bestStreak) bestStreak = streak; // Update best streak if beaten
  } else {
    streak = 0; // Reset streak on any wrong answer
    if (!missedThisSession.includes(s.id)) missedThisSession.push(s.id); // Track for review
  }

  idx++; // Advance to the next scenario

  recordAttempt(s.id, correct); // Save result to localStorage history
  viewFeedback(correct, s);     // Show the feedback screen
}

// ============================================================
// BOOT
// Called once when the page loads — fetches scenarios then shows home
// ============================================================
init();
