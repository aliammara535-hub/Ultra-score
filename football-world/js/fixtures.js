/**
 * Ultra Score / Football World - Fixtures & Match Explorer Module
 * Handles today's matches, historical date navigation, upcoming fixtures,
 * finished results, and multi-criteria filtering.
 */

const Fixtures = {
  containerId: 'fixtures-container',
  datePickerId: 'fixture-date-picker',
  activeFilter: 'all',          // 'all', 'live', 'finished', 'upcoming'
  activeCompetition: 'all',      // 'all' or competition ID
  searchTerm: '',
  selectedDate: new Date(),
  cachedMatches: [],
  isLoading: false,

  /**
   * Initialize module
   */
  init() {
    this.selectedDate = new Date();
    this.renderDateStrip();
    this.loadMatchesForDate(this.selectedDate);
    this.setupListeners();
  },

  /**
   * Setup UI listeners for search & filters
   */
  setupListeners() {
    const searchInput = document.getElementById('match-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        this.searchTerm = e.target.value.trim().toLowerCase();
        this.applyFilterAndRender();
      }, 250));
    }

    const compSelect = document.getElementById('fixture-competition-select');
    if (compSelect) {
      compSelect.addEventListener('change', (e) => {
        this.activeCompetition = e.target.value;
        this.applyFilterAndRender();
      });
    }

    const datePicker = document.getElementById(this.datePickerId);
    if (datePicker) {
      datePicker.value = Utils.toInputDateString(this.selectedDate);
      datePicker.addEventListener('change', (e) => {
        if (e.target.value) {
          const parts = e.target.value.split('-');
          const newDate = new Date(parts[0], parts[1] - 1, parts[2]);
          this.setDate(newDate);
        }
      });
    }

    // React to user favorites changes
    window.addEventListener('favoritesUpdated', () => {
      if (this.activeFilter === 'favorites') {
        this.applyFilterAndRender();
      }
    });
  },

  /**
   * Build horizontal quick date navigation strip
   */
  renderDateStrip() {
    const stripContainer = document.getElementById('date-nav-strip');
    if (!stripContainer) return;

    const base = new Date(this.selectedDate);
    const days = [-3, -2, -1, 0, 1, 2, 3];

    let html = `<div class="date-strip-track">`;

    days.forEach(offset => {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);

      const isSelected = offset === 0;
      const isToday = Utils.toApiDateString(d) === Utils.toApiDateString(new Date());

      const dayLabel = Utils.getRelativeDayLabel(d);
      const dateLabel = d.toLocaleDateString(navigator.language || 'en-US', {
        month: 'short',
        day: 'numeric'
      });

      html += `
        <button class="date-strip-btn ${isSelected ? 'active' : ''} ${isToday ? 'is-today' : ''}" 
          onclick="Fixtures.setDate(new Date('${d.toISOString()}'))">
          <span class="day-rel">${dayLabel}</span>
          <span class="day-num">${dateLabel}</span>
        </button>
      `;
    });

    html += `</div>`;
    stripContainer.innerHTML = html;
  },

  /**
   * Set active date and reload
   */
  setDate(newDate) {
    this.selectedDate = new Date(newDate);
    const datePicker = document.getElementById(this.datePickerId);
    if (datePicker) {
      datePicker.value = Utils.toInputDateString(this.selectedDate);
    }
    this.renderDateStrip();
    this.loadMatchesForDate(this.selectedDate);
  },

  /**
   * Change sub-filter (all, live, finished, upcoming)
   */
  setFilter(filterType) {
    this.activeFilter = filterType;

    // Update tab UI
    document.querySelectorAll('.filter-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filterType);
    });

    this.applyFilterAndRender();
  },

  /**
   * Load real matches from API for selected date
   */
  async loadMatchesForDate(dateObj, forceRefresh = false) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    this.isLoading = true;
    container.innerHTML = `
      <div class="loading-state-card">
        <div class="spinner"></div>
        <p>Loading real football fixtures for ${Utils.formatLocalDate(dateObj.toISOString(), 'short')}...</p>
      </div>
    `;

    try {
      const matches = await ApiService.fetchMatchesByDate(dateObj, forceRefresh);
      this.cachedMatches = matches || [];
      this.applyFilterAndRender();
    } catch (e) {
      console.warn('[Fixtures] Error fetching matches:', e.message);
      container.innerHTML = Utils.createEmptyStateHtml({
        title: 'Unable to Load Matches',
        message: 'Could not connect to football data service. Please check your connection and retry.',
        icon: 'alert',
        actionBtn: {
          text: 'Retry',
          onClick: 'Fixtures.loadMatchesForDate(Fixtures.selectedDate, true)'
        }
      });
    } finally {
      this.isLoading = false;
    }
  },

  /**
   * Filter loaded matches and render groups
   */
  applyFilterAndRender() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    let filtered = [...this.cachedMatches];

    // Filter by competition
    if (this.activeCompetition !== 'all') {
      filtered = filtered.filter(m => m.leagueId === this.activeCompetition || m.competitionId === this.activeCompetition);
    }

    // Filter by status tab
    if (this.activeFilter === 'live') {
      filtered = filtered.filter(m => m.status.isLive);
    } else if (this.activeFilter === 'finished') {
      filtered = filtered.filter(m => m.status.isFinished);
    } else if (this.activeFilter === 'upcoming') {
      filtered = filtered.filter(m => !m.status.isFinished && !m.status.isLive);
    } else if (this.activeFilter === 'favorites') {
      filtered = filtered.filter(m => {
        const homeFav = window.Favorites?.isTeamFavorite(m.homeTeam?.id);
        const awayFav = window.Favorites?.isTeamFavorite(m.awayTeam?.id);
        const compFav = window.Favorites?.isCompFavorite(m.leagueId) || window.Favorites?.isCompFavorite(m.competitionId);
        return homeFav || awayFav || compFav;
      });
    }

    // Filter by search query
    if (this.searchTerm) {
      filtered = filtered.filter(m => {
        const home = m.homeTeam?.displayName?.toLowerCase() || '';
        const away = m.awayTeam?.displayName?.toLowerCase() || '';
        const comp = m.competitionName?.toLowerCase() || '';
        return home.includes(this.searchTerm) || away.includes(this.searchTerm) || comp.includes(this.searchTerm);
      });
    }

    // Empty state
    if (filtered.length === 0) {
      if (this.activeFilter === 'favorites') {
        container.innerHTML = Utils.createEmptyStateHtml({
          title: 'No Favorite Matches Scheduled',
          message: 'None of your favorited clubs or competitions have matches scheduled on this date. Star your favorite clubs to track them here anytime.',
          icon: 'live',
          actionBtn: {
            text: 'Browse All Matches',
            onClick: "Fixtures.setFilter('all')"
          }
        });
        return;
      }

      let emptyMsg = `No matches found for ${Utils.formatLocalDate(this.selectedDate.toISOString(), 'short')}`;
      if (this.activeFilter !== 'all') {
        emptyMsg += ` matching '${this.activeFilter}' status`;
      }
      if (this.searchTerm) {
        emptyMsg += ` matching "${this.searchTerm}"`;
      }

      container.innerHTML = Utils.createEmptyStateHtml({
        title: 'No Matches Scheduled',
        message: `${emptyMsg}. Try selecting another date on the calendar or checking a different competition.`,
        icon: 'calendar',
        actionBtn: {
          text: 'View Next Fixtures',
          onClick: 'Fixtures.navigateNextDay()'
        }
      });
      return;
    }

    // Group by competition
    const grouped = {};
    filtered.forEach(m => {
      const key = m.competitionName || 'Other Matches';
      if (!grouped[key]) {
        grouped[key] = {
          competitionName: m.competitionName,
          competitionLogo: m.competitionLogo,
          leagueId: m.leagueId,
          matches: []
        };
      }
      grouped[key].matches.push(m);
    });

    let html = `<div class="fixtures-accordion">`;

    Object.values(grouped).forEach(group => {
      html += `
        <div class="competition-group">
          <div class="group-header">
            <div class="group-title" onclick="Competitions.open('${group.leagueId}')" style="cursor: pointer;" title="View ${group.competitionName} Standings">
              <img src="${group.competitionLogo}" alt="${group.competitionName}" class="comp-icon" onerror="Utils.handleImageError(this, 'comp', '${group.competitionName}')"/>
              <span class="group-name">${group.competitionName}</span>
              <span class="group-count">(${group.matches.length})</span>
            </div>
            <button class="btn-subtle-link" onclick="Competitions.open('${group.leagueId}')">
              Standings & Stats →
            </button>
          </div>

          <div class="matches-grid">
            ${group.matches.map(m => this.createFixtureCardHtml(m)).join('')}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  },

  /**
   * HTML for match card in fixtures view
   */
  createFixtureCardHtml(match) {
    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    const status = match.status;

    let centerContentHtml = '';

    if (status.isLive) {
      centerContentHtml = `
        <div class="score-center live-score-center">
          <span class="score-display">${homeTeam.score} - ${awayTeam.score}</span>
          <span class="status-pill status-live">
            <span class="pulse-dot-small"></span>
            ${status.label}
          </span>
        </div>
      `;
    } else if (status.isFinished) {
      centerContentHtml = `
        <div class="score-center finished-score-center">
          <span class="score-display">${homeTeam.score} - ${awayTeam.score}</span>
          <span class="status-pill status-finished">${status.label || 'FT'}</span>
        </div>
      `;
    } else {
      centerContentHtml = `
        <div class="score-center scheduled-center">
          <span class="kickoff-time">${Utils.formatLocalTime(match.date)}</span>
          <span class="status-pill status-scheduled">Scheduled</span>
        </div>
      `;
    }

    return `
      <div class="match-card ${status.isLive ? 'live-border' : ''}" onclick="MatchDetails.open('${match.leagueId}', '${match.id}')">
        <div class="match-card-header">
          <span class="card-time-utc">${Utils.formatLocalDate(match.date, 'short')}</span>
          <span class="venue-pill">${match.venue ? `📍 ${match.venue}` : ''}</span>
        </div>

        <div class="fixture-match-body">
          <!-- Home Team -->
          <div class="team-block home-block" onclick="event.stopPropagation(); Teams.open('${homeTeam.id}', '${Utils.escapeHtml(homeTeam.displayName)}', '${match.leagueId}')" style="cursor: pointer;" title="View Club Profile &amp; Squad">
            <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
              <img src="${homeTeam.logo}" alt="${homeTeam.displayName}" class="team-badge-lg" onerror="Utils.handleImageError(this, 'team', '${homeTeam.displayName}')"/>
              <button class="team-fav-btn ${window.Favorites?.isTeamFavorite(homeTeam.id) ? 'active' : ''}" onclick="event.stopPropagation(); Favorites.toggleTeam({ id: '${homeTeam.id}', displayName: '${Utils.escapeHtml(homeTeam.displayName)}', logo: '${homeTeam.logo}' }); this.classList.toggle('active');" title="Favorite ${Utils.escapeHtml(homeTeam.displayName)}">★</button>
            </div>
            <span class="team-title ${status.isFinished && homeTeam.score > awayTeam.score ? 'winner' : ''}">${homeTeam.displayName}</span>
          </div>

          <!-- Score / Time Center -->
          ${centerContentHtml}

          <!-- Away Team -->
          <div class="team-block away-block" onclick="event.stopPropagation(); Teams.open('${awayTeam.id}', '${Utils.escapeHtml(awayTeam.displayName)}', '${match.leagueId}')" style="cursor: pointer;" title="View Club Profile &amp; Squad">
            <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
              <img src="${awayTeam.logo}" alt="${awayTeam.displayName}" class="team-badge-lg" onerror="Utils.handleImageError(this, 'team', '${awayTeam.displayName}')"/>
              <button class="team-fav-btn ${window.Favorites?.isTeamFavorite(awayTeam.id) ? 'active' : ''}" onclick="event.stopPropagation(); Favorites.toggleTeam({ id: '${awayTeam.id}', displayName: '${Utils.escapeHtml(awayTeam.displayName)}', logo: '${awayTeam.logo}' }); this.classList.toggle('active');" title="Favorite ${Utils.escapeHtml(awayTeam.displayName)}">★</button>
            </div>
            <span class="team-title ${status.isFinished && awayTeam.score > homeTeam.score ? 'winner' : ''}">${awayTeam.displayName}</span>
          </div>
        </div>

        <div class="match-card-footer">
          <span class="footer-note">${match.broadcast ? `📺 ${match.broadcast}` : 'Match Center'}</span>
          <span class="view-details-tag">Details & Stats →</span>
        </div>
      </div>
    `;
  },

  navigateNextDay() {
    const next = new Date(this.selectedDate);
    next.setDate(next.getDate() + 1);
    this.setDate(next);
  },

  scrollToTodaysMatches() {
    this.setDate(new Date());
    const el = document.getElementById('fixtures-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
};

window.Fixtures = Fixtures;
