/**
 * Ultra Score / Football World - Live Matches Module
 * Handles polling, rendering, and real-time state management for active football matches.
 */

const LiveMatches = {
  containerId: 'live-matches-container',
  badgeId: 'live-count-badge',
  timer: null,
  isRefreshing: false,

  /**
   * Initialize live tracker
   */
  init() {
    this.fetchAndRender(false);
    this.startAutoRefresh();
  },

  /**
   * Start recurring polling
   */
  startAutoRefresh() {
    this.stopAutoRefresh();
    this.timer = setInterval(() => {
      this.fetchAndRender(true);
    }, ApiConfig.INTERVALS.LIVE_POLL);
  },

  /**
   * Stop recurring polling
   */
  stopAutoRefresh() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  /**
   * Fetch live matches from API and render
   */
  async fetchAndRender(forceRefresh = false) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    if (this.isRefreshing) return;
    this.isRefreshing = true;

    const refreshBtn = document.getElementById('btn-refresh-live');
    if (refreshBtn) refreshBtn.classList.add('rotating');

    try {
      const liveMatches = await ApiService.fetchLiveMatches(forceRefresh);
      this.render(liveMatches);
      this.updateLiveBadge(liveMatches.length);
    } catch (e) {
      console.warn('[LiveMatches] Error fetching live matches:', e.message);
    } finally {
      this.isRefreshing = false;
      if (refreshBtn) {
        setTimeout(() => refreshBtn.classList.remove('rotating'), 600);
      }
    }
  },

  /**
   * Render live match cards
   */
  render(matches = []) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    if (!matches || matches.length === 0) {
      container.innerHTML = Utils.createEmptyStateHtml({
        title: 'No Live Matches In Play',
        message: 'There are currently no live football matches in progress. Browse today\'s upcoming fixtures or historical results below.',
        icon: 'live',
        actionBtn: {
          text: 'View Today\'s Fixtures',
          onClick: 'Fixtures.scrollToTodaysMatches()'
        }
      });
      return;
    }

    // Group live matches by competition
    const grouped = {};
    matches.forEach(m => {
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

    let html = `<div class="live-groups-grid">`;

    Object.values(grouped).forEach(group => {
      html += `
        <div class="competition-group live-group">
          <div class="group-header">
            <div class="group-title">
              <img src="${group.competitionLogo}" alt="${group.competitionName}" class="comp-icon" onerror="Utils.handleImageError(this, 'comp', '${group.competitionName}')"/>
              <span class="group-name">${group.competitionName}</span>
            </div>
            <span class="live-pulse-badge">
              <span class="pulse-dot"></span> LIVE
            </span>
          </div>

          <div class="matches-grid">
            ${group.matches.map(m => this.createLiveMatchCardHtml(m)).join('')}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  },

  /**
   * HTML for single live match card
   */
  createLiveMatchCardHtml(match) {
    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    const status = match.status;

    return `
      <div class="match-card live-card" onclick="MatchDetails.open('${match.leagueId}', '${match.id}')">
        <div class="match-card-header">
          <span class="card-comp-name">${match.competitionName}</span>
          <span class="status-pill status-live">
            <span class="pulse-dot-small"></span>
            ${status.label || 'LIVE'}
          </span>
        </div>

        <div class="match-teams-layout">
          <div class="team-row home-row">
            <div class="team-identity">
              <img src="${homeTeam.logo}" alt="${homeTeam.displayName}" class="team-badge" onerror="Utils.handleImageError(this, 'team', '${homeTeam.displayName}')"/>
              <span class="team-name" title="${homeTeam.displayName}">${homeTeam.displayName}</span>
            </div>
            <span class="team-score live-score-num">${homeTeam.score}</span>
          </div>

          <div class="team-row away-row">
            <div class="team-identity">
              <img src="${awayTeam.logo}" alt="${awayTeam.displayName}" class="team-badge" onerror="Utils.handleImageError(this, 'team', '${awayTeam.displayName}')"/>
              <span class="team-name" title="${awayTeam.displayName}">${awayTeam.displayName}</span>
            </div>
            <span class="team-score live-score-num">${awayTeam.score}</span>
          </div>
        </div>

        <div class="match-card-footer">
          <span class="venue-info">${match.venue ? `📍 ${match.venue}` : ''}</span>
          <span class="action-link">View Match Center →</span>
        </div>
      </div>
    `;
  },

  /**
   * Update header live count badge
   */
  updateLiveBadge(count) {
    const badge = document.getElementById(this.badgeId);
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-flex';
    } else {
      badge.textContent = '0';
      badge.style.display = 'none';
    }
  }
};

window.LiveMatches = LiveMatches;
