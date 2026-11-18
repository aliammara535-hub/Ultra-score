/**
 * Ultra Score / Football World - Main Application Orchestrator
 * Bootstraps Firebase, CacheManager, API layers, routing, and UI events.
 */

const App = {
  async init() {
    console.log('[Ultra Score] Initializing Football World platform...');

    // 1. Initialize Firebase Realtime Database
    this.initFirebase();

    // 2. Populate Competition selectors & menu
    this.initCompetitionSelectors();

    // 3. Initialize modules
    Competitions.init();
    LiveMatches.init();
    Fixtures.init();

    // 4. Setup Global Event Listeners & Router
    this.setupEventListeners();
    this.handleRoute();

    console.log('[Ultra Score] Football World ready.');
  },

  /**
   * Initialize Firebase and wire status indicators
   */
  initFirebase() {
    const statusPill = document.getElementById('firebase-status-badge');

    FirebaseConfig.onConnectionChange((connected, details) => {
      if (!statusPill) return;

      if (connected) {
        statusPill.innerHTML = '<span class="status-dot dot-online"></span> Firebase: Synced';
        statusPill.className = 'status-pill status-firebase-online';
        statusPill.title = 'Firebase Realtime Database connected and active';
      } else {
        statusPill.innerHTML = '<span class="status-dot dot-cached"></span> Data Feed: Active';
        statusPill.className = 'status-pill status-firebase-standby';
        statusPill.title = 'Operating via secure direct football API cache';
      }
    });

    // Try starting Firebase
    FirebaseConfig.init();
  },

  /**
   * Populate competition dropdowns across the homepage
   */
  initCompetitionSelectors() {
    const select = document.getElementById('fixture-competition-select');
    if (!select) return;

    let html = `<option value="all">All Competitions (Global)</option>`;

    // European top 5
    html += `<optgroup label="European Top Five Leagues">`;
    ApiConfig.COMPETITIONS.filter(c => c.category === 'top-five').forEach(c => {
      html += `<option value="${c.id}">${c.displayName}</option>`;
    });
    html += `</optgroup>`;

    // Continental & International
    html += `<optgroup label="Continental & International">`;
    ApiConfig.COMPETITIONS.filter(c => c.category === 'continental' || c.category === 'international').forEach(c => {
      html += `<option value="${c.id}">${c.displayName}</option>`;
    });
    html += `</optgroup>`;

    // Other domestic
    html += `<optgroup label="Other Domestic Leagues">`;
    ApiConfig.COMPETITIONS.filter(c => c.category === 'other-domestic').forEach(c => {
      html += `<option value="${c.id}">${c.displayName}</option>`;
    });
    html += `</optgroup>`;

    select.innerHTML = html;
  },

  /**
   * Router handling hash navigation (#match/league/id, #competition/id)
   */
  handleRoute() {
    const hash = window.location.hash;
    if (!hash) return;

    if (hash.startsWith('#match/')) {
      const parts = hash.replace('#match/', '').split('/');
      if (parts.length >= 2) {
        MatchDetails.open(parts[0], parts[1]);
      }
    } else if (hash.startsWith('#competition/')) {
      const compId = hash.replace('#competition/', '');
      if (compId) {
        Competitions.open(compId);
      }
    }
  },

  /**
   * Setup UI interactions
   */
  setupEventListeners() {
    // Hash change routing
    window.addEventListener('hashchange', () => this.handleRoute());

    // Competitions menu button toggle
    const menuBtn = document.getElementById('competitions-menu-btn');
    const dropdown = document.getElementById('competitions-dropdown');

    if (menuBtn && dropdown) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !menuBtn.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });
    }

    // Refresh live matches button
    const refreshLiveBtn = document.getElementById('btn-refresh-live');
    if (refreshLiveBtn) {
      refreshLiveBtn.addEventListener('click', () => {
        LiveMatches.fetchAndRender(true);
      });
    }

    // Settings modal toggle
    const settingsBtn = document.getElementById('btn-open-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openSettingsModal());
    }
  },

  /**
   * Open Settings modal to customize Firebase or inspect API Sync status
   */
  openSettingsModal() {
    let modal = document.getElementById('settings-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'settings-modal';
      modal.className = 'team-modal-overlay';
      document.body.appendChild(modal);
    }

    const currentConfig = FirebaseConfig.getConfig();

    modal.classList.add('active');
    document.body.classList.add('modal-open');

    modal.innerHTML = `
      <div class="team-modal-card settings-card" style="max-width: 620px;">
        <button class="team-modal-close" onclick="App.closeSettingsModal()">✕</button>

        <div class="settings-header">
          <h2 style="color: var(--color-white); font-size: 1.35rem; margin-bottom: 0.35rem;">Connect to Firebase</h2>
          <p style="color: var(--color-muted-gray); font-size: 0.85rem;">Connect your Firebase Realtime Database for live match persistence &amp; synchronization.</p>
        </div>

        <div class="settings-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1.25rem;">
          <!-- Quick Paste Snippet Area -->
          <div class="form-group" style="display: flex; flex-direction: column; gap: 0.4rem;">
            <label style="font-size: 0.8rem; font-weight: 700; color: var(--color-green-primary);">Quick Paste: Firebase SDK Snippet</label>
            <textarea id="cfg-rawSnippet" rows="3" style="width: 100%; background: #0c1410; border: 1px solid var(--color-card-border); border-radius: var(--radius-md); padding: 0.6rem; color: #fff; font-family: monospace; font-size: 0.8rem; resize: vertical;" placeholder='Paste from Firebase Console (e.g. const firebaseConfig = { apiKey: "...", databaseURL: "..." };)'></textarea>
            <button type="button" class="btn btn-secondary" style="align-self: flex-start; padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="App.autoFillSnippet()">Auto-Fill Fields</button>
          </div>

          <div style="border-top: 1px solid var(--color-card-border); padding-top: 0.75rem;"></div>

          <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--color-white);">Realtime Database URL <span style="color: var(--color-green-primary);">*</span></label>
            <input type="text" id="cfg-databaseURL" class="form-input" style="width: 100%; background: #0c1410; border: 1px solid var(--color-card-border); border-radius: var(--radius-md); padding: 0.55rem 0.8rem; color: #fff; font-size: 0.85rem;" value="${currentConfig.databaseURL || ''}" placeholder="https://your-project-default-rtdb.firebaseio.com" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
              <label style="font-size: 0.8rem; font-weight: 600; color: var(--color-white);">Project ID <span style="color: var(--color-green-primary);">*</span></label>
              <input type="text" id="cfg-projectId" class="form-input" style="width: 100%; background: #0c1410; border: 1px solid var(--color-card-border); border-radius: var(--radius-md); padding: 0.55rem 0.8rem; color: #fff; font-size: 0.85rem;" value="${currentConfig.projectId || ''}" placeholder="my-football-app" />
            </div>

            <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
              <label style="font-size: 0.8rem; font-weight: 600; color: var(--color-white);">API Key</label>
              <input type="text" id="cfg-apiKey" class="form-input" style="width: 100%; background: #0c1410; border: 1px solid var(--color-card-border); border-radius: var(--radius-md); padding: 0.55rem 0.8rem; color: #fff; font-size: 0.85rem;" value="${currentConfig.apiKey || ''}" placeholder="AIzaSy..." />
            </div>
          </div>

          <div class="form-group" style="display: flex; flex-direction: column; gap: 0.35rem;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--color-white);">Auth Domain</label>
            <input type="text" id="cfg-authDomain" class="form-input" style="width: 100%; background: #0c1410; border: 1px solid var(--color-card-border); border-radius: var(--radius-md); padding: 0.55rem 0.8rem; color: #fff; font-size: 0.85rem;" value="${currentConfig.authDomain || ''}" placeholder="my-football-app.firebaseapp.com" />
          </div>
        </div>

        <div class="settings-actions" style="display: flex; align-items: center; justify-content: space-between; margin-top: 1.5rem; gap: 0.75rem;">
          <button class="btn btn-subtle" style="font-size: 0.8rem;" onclick="App.resetDefaultFirebase()">Reset to Default</button>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary" onclick="App.closeSettingsModal()">Cancel</button>
            <button class="btn btn-primary" onclick="App.saveSettings()">Save &amp; Connect</button>
          </div>
        </div>
      </div>
    `;
  },

  autoFillSnippet() {
    const raw = document.getElementById('cfg-rawSnippet')?.value.trim();
    if (!raw) return;

    const parsed = FirebaseConfig.parseConfigInput(raw);
    if (parsed) {
      if (parsed.databaseURL) document.getElementById('cfg-databaseURL').value = parsed.databaseURL;
      if (parsed.projectId) document.getElementById('cfg-projectId').value = parsed.projectId;
      if (parsed.apiKey) document.getElementById('cfg-apiKey').value = parsed.apiKey;
      if (parsed.authDomain) document.getElementById('cfg-authDomain').value = parsed.authDomain;
      Utils.showToast('Firebase configuration fields auto-filled!', 'success');
    } else {
      Utils.showToast('Could not parse snippet. Please check format.', 'error');
    }
  },

  resetDefaultFirebase() {
    localStorage.removeItem(FirebaseConfig.STORAGE_KEY);
    Utils.showToast('Reset to default configuration.', 'info');
    setTimeout(() => window.location.reload(), 800);
  },

  closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('active');
    document.body.classList.remove('modal-open');
  },

  saveSettings() {
    let dbUrl = document.getElementById('cfg-databaseURL')?.value.trim();
    const projId = document.getElementById('cfg-projectId')?.value.trim();
    const apiKey = document.getElementById('cfg-apiKey')?.value.trim();
    const authDomain = document.getElementById('cfg-authDomain')?.value.trim();

    if (!dbUrl && projId) {
      dbUrl = `https://${projId}-default-rtdb.firebaseio.com`;
    }

    if (dbUrl && projId) {
      const customConfig = {
        databaseURL: dbUrl,
        projectId: projId,
        apiKey: apiKey || 'AIzaSyDemo',
        authDomain: authDomain || `${projId}.firebaseapp.com`
      };
      FirebaseConfig.saveConfig(customConfig);
      Utils.showToast('Firebase settings saved. Connecting...', 'success');
      setTimeout(() => window.location.reload(), 800);
    } else {
      Utils.showToast('Please provide at least Database URL and Project ID.', 'error');
    }
  }
};

window.App = App;

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
