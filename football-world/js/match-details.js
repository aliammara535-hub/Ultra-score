/**
 * Ultra Score / Football World - Match Details Page Controller
 * Controls the dedicated Match Center modal, scoreboard header,
 * tab navigation (Match Details, Lineups, Statistics), and live polling.
 */

const MatchDetails = {
  modalId: 'match-details-modal',
  currentLeagueId: null,
  currentMatchId: null,
  activeTab: 'details', // 'details', 'lineups', 'statistics'
  currentDetailsData: null,
  liveTimer: null,

  /**
   * Open dedicated match details page
   */
  async open(leagueId, matchId) {
    this.currentLeagueId = leagueId;
    this.currentMatchId = matchId;
    this.activeTab = 'details';

    const modal = document.getElementById(this.modalId);
    if (!modal) return;

    modal.classList.add('modal-active');
    document.body.classList.add('modal-open');

    // Update URL hash
    window.location.hash = `match/${leagueId}/${matchId}`;

    // Render loading shell
    this.renderLoading();

    // Fetch match data
    await this.loadData();

    // Start live poller if match is active
    this.checkAndStartLivePoller();
  },

  /**
   * Close details modal
   */
  close() {
    this.stopLivePoller();
    const modal = document.getElementById(this.modalId);
    if (modal) {
      modal.classList.remove('modal-active');
    }
    document.body.classList.remove('modal-open');

    // Reset hash if it was pointing to match
    if (window.location.hash.startsWith('#match/')) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  },

  /**
   * Fetch match details from API
   */
  async loadData(forceRefresh = false) {
    if (!this.currentLeagueId || !this.currentMatchId) return;

    try {
      const data = await ApiService.fetchMatchDetails(this.currentLeagueId, this.currentMatchId, forceRefresh);
      if (!data) {
        this.renderError('Unable to load match information from football API.');
        return;
      }
      this.currentDetailsData = data;
      this.renderComplete();
    } catch (e) {
      this.renderError(e.message);
    }
  },

  /**
   * Polling for active live matches
   */
  checkAndStartLivePoller() {
    this.stopLivePoller();
    if (this.currentDetailsData?.header?.status?.isLive) {
      this.liveTimer = setInterval(() => {
        this.loadData(true);
      }, ApiConfig.INTERVALS.LIVE_POLL);
    }
  },

  stopLivePoller() {
    if (this.liveTimer) {
      clearInterval(this.liveTimer);
      this.liveTimer = null;
    }
  },

  /**
   * Switch active tab
   */
  setTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('.match-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    const bodyEl = document.getElementById('match-modal-tab-content');
    if (!bodyEl || !this.currentDetailsData) return;

    const data = this.currentDetailsData;
    const homeTeam = data.header.homeTeam;
    const awayTeam = data.header.awayTeam;

    if (tabName === 'details') {
      bodyEl.innerHTML = this.renderTabDetails(data);
    } else if (tabName === 'lineups') {
      bodyEl.innerHTML = Lineups.renderLineups(data.lineups, homeTeam, awayTeam);
    } else if (tabName === 'statistics') {
      bodyEl.innerHTML = Statistics.renderStatistics(data.statistics, homeTeam, awayTeam);
    }
  },

  /**
   * Render loading state inside modal
   */
  renderLoading() {
    const modalContent = document.getElementById('match-modal-container');
    if (!modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-loading-wrapper">
        <div class="spinner"></div>
        <p>Loading real match details, statistics & lineups...</p>
      </div>
    `;
  },

  /**
   * Render error state
   */
  renderError(msg) {
    const modalContent = document.getElementById('match-modal-container');
    if (!modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-error-wrapper">
        <div class="error-icon">⚠️</div>
        <h3>Failed to Load Match Details</h3>
        <p>${msg}</p>
        <button class="btn btn-secondary" onclick="MatchDetails.loadData(true)">Retry</button>
        <button class="btn btn-subtle" onclick="MatchDetails.close()">Close</button>
      </div>
    `;
  },

  /**
   * Render complete modal with scoreboard header, tabs, and current tab body
   */
  renderComplete() {
    const modalContent = document.getElementById('match-modal-container');
    if (!modalContent || !this.currentDetailsData) return;

    const data = this.currentDetailsData;
    const h = data.header;
    const homeTeam = h.homeTeam;
    const awayTeam = h.awayTeam;
    const status = h.status;

    let scoreDisplay = '';
    if (status.isScheduled) {
      scoreDisplay = `<div class="modal-kickoff-time">${Utils.formatLocalTime(h.date)}</div>`;
    } else {
      scoreDisplay = `
        <div class="modal-scoreboard-score ${status.isLive ? 'score-pulse' : ''}">
          <span>${homeTeam.score}</span>
          <span class="score-dash">-</span>
          <span>${awayTeam.score}</span>
        </div>
      `;
    }

    modalContent.innerHTML = `
      <!-- Modal Header / Scoreboard -->
      <div class="modal-match-header">
        <button class="modal-close-btn" onclick="MatchDetails.close()" title="Close (Esc)">✕</button>

        <div class="modal-comp-bar">
          <img src="${h.competitionLogo}" alt="${h.competitionName}" class="modal-comp-logo" onerror="Utils.handleImageError(this, 'comp')"/>
          <span class="modal-comp-name">${h.competitionName}</span>
          <span class="modal-date-tag">${Utils.formatLocalDate(h.date)}</span>
        </div>

        <div class="modal-teams-scoreboard">
          <!-- Home Team -->
          <div class="modal-team-side home-side">
            <img src="${homeTeam.logo}" alt="${homeTeam.displayName}" class="modal-team-logo" onerror="Utils.handleImageError(this, 'team', '${homeTeam.displayName}')"/>
            <h2 class="modal-team-title">${homeTeam.displayName}</h2>
          </div>

          <!-- Score & Status Center -->
          <div class="modal-score-center">
            ${scoreDisplay}
            <span class="status-pill ${status.badgeClass || 'status-scheduled'}">
              ${status.isLive ? '<span class="pulse-dot-small"></span>' : ''}
              ${status.label}
            </span>
          </div>

          <!-- Away Team -->
          <div class="modal-team-side away-side">
            <img src="${awayTeam.logo}" alt="${awayTeam.displayName}" class="modal-team-logo" onerror="Utils.handleImageError(this, 'team', '${awayTeam.displayName}')"/>
            <h2 class="modal-team-title">${awayTeam.displayName}</h2>
          </div>
        </div>

        <!-- Meta info pill row (stadium, referee, broadcast) -->
        <div class="modal-meta-strip">
          <span class="meta-tag">🏟 ${h.venue}${h.venueCity ? `, ${h.venueCity}` : ''}</span>
          <span class="meta-tag">👨‍⚖️ Referee: ${h.officials || 'Official'}</span>
          ${h.broadcasts ? `<span class="meta-tag meta-broadcast">📺 ${h.broadcasts}</span>` : ''}
          ${h.attendance ? `<span class="meta-tag">👥 Attendance: ${Number(h.attendance).toLocaleString()}</span>` : ''}
        </div>

        <!-- Modal Tabs -->
        <div class="match-tabs-nav">
          <button class="match-tab-btn ${this.activeTab === 'details' ? 'active' : ''}" data-tab="details" onclick="MatchDetails.setTab('details')">
            Match Details & Timeline
          </button>
          <button class="match-tab-btn ${this.activeTab === 'lineups' ? 'active' : ''}" data-tab="lineups" onclick="MatchDetails.setTab('lineups')">
            Lineups & Formations
          </button>
          <button class="match-tab-btn ${this.activeTab === 'statistics' ? 'active' : ''}" data-tab="statistics" onclick="MatchDetails.setTab('statistics')">
            Match Statistics
          </button>
        </div>
      </div>

      <!-- Tab Content Area -->
      <div class="modal-tab-body" id="match-modal-tab-content">
        ${this.renderTabDetails(data)}
      </div>
    `;
  },

  /**
   * Render Tab 1: Match Details & Timeline
   */
  renderTabDetails(data) {
    const h = data.header;
    const homeTeam = h.homeTeam;
    const awayTeam = h.awayTeam;

    return `
      <div class="tab-details-view">
        <!-- Quick Match Info Summary -->
        <div class="details-info-grid">
          <div class="info-card">
            <span class="info-label">Competition</span>
            <span class="info-val">${h.competitionName}</span>
          </div>
          <div class="info-card">
            <span class="info-label">Kickoff Time</span>
            <span class="info-val">${Utils.formatLocalTime(h.date)} (Local Time)</span>
          </div>
          <div class="info-card">
            <span class="info-label">Stadium / Venue</span>
            <span class="info-val">${h.venue}</span>
          </div>
          <div class="info-card">
            <span class="info-label">Match Referee</span>
            <span class="info-val">${h.officials || 'Official'}</span>
          </div>
          ${h.broadcasts ? `
            <div class="info-card info-card-full">
              <span class="info-label">Verified Broadcast</span>
              <span class="info-val">📺 ${h.broadcasts}</span>
            </div>
          ` : ''}
        </div>

        <!-- Timeline Section -->
        <div class="match-timeline-section">
          <h4 class="section-heading">Match Events Timeline</h4>
          ${MatchEvents.renderTimeline(data.events, homeTeam.id, awayTeam.id)}
        </div>
      </div>
    `;
  }
};

window.MatchDetails = MatchDetails;

// Global Escape key listener to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    MatchDetails.close();
  }
});
