/**
 * Ultra Score / Football World - Competitions Module
 * Manages the Competitions Menu, Dedicated Competition Pages,
 * Standings, League Matches, and Computed Authentic League Statistics.
 */

const Competitions = {
  currentCompetitionId: null,
  activeSubTab: 'standings', // 'standings', 'matches', 'stats'
  cachedCompData: null,
  cachedStandings: null,
  cachedMatches: null,

  /**
   * Initialize competition menu items
   */
  init() {
    this.renderDropdownMenu();
  },

  /**
   * Populate the top-left dropdown navigation menu
   */
  renderDropdownMenu() {
    const container = document.getElementById('competitions-dropdown-list');
    if (!container) return;

    const topFive = ApiConfig.COMPETITIONS.filter(c => c.category === 'top-five');
    const continental = ApiConfig.COMPETITIONS.filter(c => c.category === 'continental');
    const international = ApiConfig.COMPETITIONS.filter(c => c.category === 'international');
    const domestic = ApiConfig.COMPETITIONS.filter(c => c.category === 'other-domestic');

    let html = `
      <div class="menu-category-title">European Top Five Leagues</div>
      <div class="menu-category-items">
        ${topFive.map(c => this._renderMenuItem(c)).join('')}
      </div>

      <div class="menu-category-title">Continental & Cup Competitions</div>
      <div class="menu-category-items">
        ${continental.map(c => this._renderMenuItem(c)).join('')}
      </div>

      <div class="menu-category-title">International Tournaments</div>
      <div class="menu-category-items">
        ${international.map(c => this._renderMenuItem(c)).join('')}
      </div>

      <div class="menu-category-title">Other Domestic Leagues</div>
      <div class="menu-category-items">
        ${domestic.map(c => this._renderMenuItem(c)).join('')}
      </div>
    `;

    container.innerHTML = html;
  },

  _renderMenuItem(comp) {
    return `
      <a href="javascript:void(0)" class="menu-comp-item" onclick="Competitions.open('${comp.id}')">
        <img src="${comp.logo}" alt="${comp.name}" class="menu-comp-icon" onerror="Utils.handleImageError(this, 'comp', '${comp.name}')"/>
        <span class="menu-comp-name">${comp.displayName}</span>
        <span class="menu-comp-flag">${comp.flag || ''}</span>
      </a>
    `;
  },

  /**
   * Open dedicated competition page
   */
  async open(leagueId) {
    this.currentCompetitionId = leagueId;
    this.activeSubTab = 'standings';

    const compPage = document.getElementById('competition-page-view');
    const homeView = document.getElementById('home-page-view');

    if (!compPage || !homeView) return;

    homeView.style.display = 'none';
    compPage.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update URL hash
    window.location.hash = `competition/${leagueId}`;

    const config = ApiConfig.getCompetitionById(leagueId);

    // Render loading shell
    compPage.innerHTML = `
      <div class="comp-page-container">
        <div class="loading-state-card">
          <div class="spinner"></div>
          <p>Loading ${config.displayName} data, standings and matches...</p>
        </div>
      </div>
    `;

    // Fetch standings & matches concurrently
    try {
      const [standings, matches] = await Promise.all([
        ApiService.fetchStandings(leagueId),
        ApiService.fetchScoreboard(leagueId)
      ]);

      this.cachedStandings = standings;
      this.cachedMatches = matches;
      this.renderCompetitionPage();
    } catch (e) {
      console.warn('[Competitions] Error loading competition page:', e.message);
      compPage.innerHTML = `
        <div class="comp-page-container">
          <div class="empty-state-card">
            <h3>Unable to Load ${config.displayName}</h3>
            <p>${e.message}</p>
            <button class="btn btn-secondary" onclick="Competitions.open('${leagueId}')">Retry</button>
            <button class="btn btn-subtle" onclick="Competitions.close()">Back to Homepage</button>
          </div>
        </div>
      `;
    }
  },

  /**
   * Close competition page and return to main home view
   */
  close() {
    const compPage = document.getElementById('competition-page-view');
    const homeView = document.getElementById('home-page-view');

    if (compPage) compPage.style.display = 'none';
    if (homeView) homeView.style.display = 'block';

    if (window.location.hash.startsWith('#competition/')) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  },

  /**
   * Switch tab inside competition page
   */
  setSubTab(tabName) {
    this.activeSubTab = tabName;
    document.querySelectorAll('.comp-subtab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.subtab === tabName);
    });

    const bodyEl = document.getElementById('comp-tab-content-area');
    if (!bodyEl) return;

    if (tabName === 'standings') {
      bodyEl.innerHTML = Standings.renderTable(this.cachedStandings);
    } else if (tabName === 'matches') {
      bodyEl.innerHTML = this._renderCompMatches();
    } else if (tabName === 'stats') {
      bodyEl.innerHTML = this._renderCompLeagueStats();
    }
  },

  /**
   * Render complete Competition Page layout
   */
  renderCompetitionPage() {
    const compPage = document.getElementById('competition-page-view');
    if (!compPage) return;

    const config = ApiConfig.getCompetitionById(this.currentCompetitionId);
    const standings = this.cachedStandings;
    const teamsCount = standings?.table?.length || config.teamsCount || 20;

    const seasonLabel = typeof standings?.season === 'object' 
      ? (standings?.season?.displayName || standings?.season?.year || config.currentSeason)
      : (standings?.season || config.currentSeason);

    compPage.innerHTML = `
      <div class="comp-page-container">
        <!-- Breadcrumb / Back Button -->
        <div class="comp-nav-bar">
          <button class="btn-back-home" onclick="Competitions.close()">
            ← Back to All Competitions
          </button>
        </div>

        <!-- Competition Hero Header (Section 1: Overview) -->
        <div class="comp-hero-card">
          <div class="comp-hero-main">
            <img src="${config.logo}" alt="${config.displayName}" class="comp-hero-logo" onerror="Utils.handleImageError(this, 'comp', '${config.displayName}')"/>
            <div class="comp-hero-titles">
              <span class="comp-country-tag">${config.flag || '⚽'} ${config.country}</span>
              <h1 class="comp-hero-title">${config.displayName}</h1>
              <div class="comp-hero-meta">
                <span class="hero-meta-item">📅 Season: <strong>${seasonLabel}</strong></span>
                <span class="hero-meta-item">🛡 Participating Teams: <strong>${teamsCount}</strong></span>
                ${standings?.table?.[0] ? `<span class="hero-meta-item">🏆 Current Leader: <strong>${standings.table[0].team.name}</strong> (${standings.table[0].points} pts)</span>` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Section Navigation Tabs -->
        <div class="comp-subtabs-nav">
          <button class="comp-subtab-btn ${this.activeSubTab === 'standings' ? 'active' : ''}" data-subtab="standings" onclick="Competitions.setSubTab('standings')">
            Standings Table
          </button>
          <button class="comp-subtab-btn ${this.activeSubTab === 'matches' ? 'active' : ''}" data-subtab="matches" onclick="Competitions.setSubTab('matches')">
            Fixtures & Results
          </button>
          <button class="comp-subtab-btn ${this.activeSubTab === 'stats' ? 'active' : ''}" data-subtab="stats" onclick="Competitions.setSubTab('stats')">
            League Statistics & Leaders
          </button>
        </div>

        <!-- Tab Content -->
        <div class="comp-tab-content-area" id="comp-tab-content-area">
          ${Standings.renderTable(this.cachedStandings)}
        </div>
      </div>
    `;
  },

  /**
   * Section 2: Matches & Fixtures
   */
  _renderCompMatches() {
    const matches = this.cachedMatches || [];
    if (matches.length === 0) {
      return Utils.createEmptyStateHtml({
        title: 'No Matches Scheduled',
        message: 'There are no active or recently completed matches for this competition window.',
        icon: 'calendar'
      });
    }

    return `
      <div class="comp-matches-view">
        <div class="matches-grid">
          ${matches.map(m => Fixtures.createFixtureCardHtml(m)).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Section 4: League Statistics (calculated from real standings table)
   */
  _renderCompLeagueStats() {
    const standings = this.cachedStandings;
    if (!standings || !standings.table || standings.table.length === 0) {
      return Utils.createEmptyStateHtml({
        title: 'League Statistics Unavailable',
        message: 'Statistics require valid standings data from the official data feed.',
        icon: 'trophy'
      });
    }

    const table = [...standings.table];

    // 1. Best Attacking Teams (sorted by goalsFor desc)
    const bestAttack = [...table].sort((a, b) => b.goalsFor - a.goalsFor).slice(0, 5);

    // 2. Best Defensive Teams (sorted by goalsAgainst asc, min 1 played)
    const bestDefense = [...table].filter(t => t.played > 0).sort((a, b) => a.goalsAgainst - b.goalsAgainst).slice(0, 5);

    // 3. Best Goal Difference
    const bestGD = [...table].sort((a, b) => parseInt(b.goalDifference) - parseInt(a.goalDifference)).slice(0, 5);

    return `
      <div class="league-stats-dashboard">
        <h3 class="stats-grid-heading">Authentic Competition Performance Metrics</h3>

        <div class="league-stat-cards-grid">
          <!-- Best Attack Card -->
          <div class="league-stat-card">
            <div class="card-top">
              <span class="card-icon-tag">⚽</span>
              <h4>Best Attacking Clubs</h4>
            </div>
            <div class="stat-ranking-list">
              ${bestAttack.map((t, i) => `
                <div class="stat-rank-row">
                  <span class="rank-num">#${i + 1}</span>
                  <img src="${t.team.logo}" alt="${t.team.name}" class="rank-logo" onerror="Utils.handleImageError(this, 'team', '${t.team.name}')"/>
                  <span class="rank-name">${t.team.name}</span>
                  <span class="rank-metric">${t.goalsFor} Goals</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Best Defense Card -->
          <div class="league-stat-card">
            <div class="card-top">
              <span class="card-icon-tag">🛡</span>
              <h4>Best Defensive Records</h4>
            </div>
            <div class="stat-ranking-list">
              ${bestDefense.map((t, i) => `
                <div class="stat-rank-row">
                  <span class="rank-num">#${i + 1}</span>
                  <img src="${t.team.logo}" alt="${t.team.name}" class="rank-logo" onerror="Utils.handleImageError(this, 'team', '${t.team.name}')"/>
                  <span class="rank-name">${t.team.name}</span>
                  <span class="rank-metric">${t.goalsAgainst} Conceded</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Top Goal Difference Card -->
          <div class="league-stat-card">
            <div class="card-top">
              <span class="card-icon-tag">📈</span>
              <h4>Highest Goal Differences</h4>
            </div>
            <div class="stat-ranking-list">
              ${bestGD.map((t, i) => `
                <div class="stat-rank-row">
                  <span class="rank-num">#${i + 1}</span>
                  <img src="${t.team.logo}" alt="${t.team.name}" class="rank-logo" onerror="Utils.handleImageError(this, 'team', '${t.team.name}')"/>
                  <span class="rank-name">${t.team.name}</span>
                  <span class="rank-metric ${parseInt(t.goalDifference) > 0 ? 'gd-positive' : ''}">${t.goalDifference}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }
};

window.Competitions = Competitions;
