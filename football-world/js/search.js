/**
 * Ultra Score / Football World - Global Search Module
 * Instant multi-entity search across Teams, Competitions, Players, and Matches
 * based on authentic live data feeds.
 */

const GlobalSearch = {
  containerId: 'global-search-results',
  isOpen: false,

  init() {
    this.setupListeners();
  },

  setupListeners() {
    const input = document.getElementById('global-search-input');
    const dropdown = document.getElementById(this.containerId);

    if (input) {
      input.addEventListener('input', Utils.debounce((e) => {
        this.performSearch(e.target.value.trim());
      }, 200));

      input.addEventListener('focus', () => {
        if (input.value.trim().length > 1) {
          this.performSearch(input.value.trim());
        }
      });

      // Keyboard shortcut: '/' to focus search
      document.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== input && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          e.preventDefault();
          input.focus();
        }
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
      const searchBox = document.getElementById('global-search-wrapper');
      if (searchBox && !searchBox.contains(e.target)) {
        this.close();
      }
    });
  },

  performSearch(query) {
    const dropdown = document.getElementById(this.containerId);
    if (!dropdown) return;

    if (!query || query.length < 2) {
      this.close();
      return;
    }

    const q = query.toLowerCase();

    // 1. Search Competitions
    const compMatches = ApiConfig.COMPETITIONS.filter(c => {
      return c.name.toLowerCase().includes(q) ||
             c.displayName.toLowerCase().includes(q) ||
             c.country.toLowerCase().includes(q);
    });

    // 2. Search Teams from loaded scoreboard & standings caches
    const teamMap = new Map();
    // Gather from cached fixtures
    if (window.Fixtures && Array.isArray(Fixtures.cachedMatches)) {
      Fixtures.cachedMatches.forEach(m => {
        if (m.homeTeam && m.homeTeam.displayName?.toLowerCase().includes(q)) {
          teamMap.set(String(m.homeTeam.id), { id: m.homeTeam.id, name: m.homeTeam.displayName, logo: m.homeTeam.logo, leagueId: m.leagueId });
        }
        if (m.awayTeam && m.awayTeam.displayName?.toLowerCase().includes(q)) {
          teamMap.set(String(m.awayTeam.id), { id: m.awayTeam.id, name: m.awayTeam.displayName, logo: m.awayTeam.logo, leagueId: m.leagueId });
        }
      });
    }

    // 3. Search Matches
    const matchResults = [];
    if (window.Fixtures && Array.isArray(Fixtures.cachedMatches)) {
      Fixtures.cachedMatches.forEach(m => {
        const home = m.homeTeam?.displayName?.toLowerCase() || '';
        const away = m.awayTeam?.displayName?.toLowerCase() || '';
        if (home.includes(q) || away.includes(q)) {
          matchResults.push(m);
        }
      });
    }

    // Render results
    const teamResults = Array.from(teamMap.values()).slice(0, 6);
    const topMatches = matchResults.slice(0, 4);

    if (compMatches.length === 0 && teamResults.length === 0 && topMatches.length === 0) {
      dropdown.innerHTML = `
        <div class="search-empty-state">
          <span>No clubs, competitions, or matches found matching "<strong>${Utils.escapeHtml(query)}</strong>"</span>
        </div>
      `;
      this.open();
      return;
    }

    let html = `<div class="search-results-list">`;

    // Section: Competitions
    if (compMatches.length > 0) {
      html += `
        <div class="search-category-header">🏆 Competitions (${compMatches.length})</div>
        <div class="search-items-group">
          ${compMatches.map(c => `
            <div class="search-result-row" onclick="GlobalSearch.selectComp('${c.id}')">
              <img src="${c.logo}" alt="${c.name}" class="search-res-img" onerror="Utils.handleImageError(this, 'comp', '${c.name}')"/>
              <div class="search-res-info">
                <span class="search-res-title">${c.displayName}</span>
                <span class="search-res-sub">${c.flag || ''} ${c.country} • ${c.category}</span>
              </div>
              <span class="search-res-action">View Table →</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Section: Teams
    if (teamResults.length > 0) {
      html += `
        <div class="search-category-header">🛡 Clubs &amp; Teams (${teamResults.length})</div>
        <div class="search-items-group">
          ${teamResults.map(t => `
            <div class="search-result-row" onclick="GlobalSearch.selectTeam('${t.id}', '${t.name}')">
              <img src="${t.logo}" alt="${t.name}" class="search-res-img" onerror="Utils.handleImageError(this, 'team', '${t.name}')"/>
              <div class="search-res-info">
                <span class="search-res-title">${t.name}</span>
                <span class="search-res-sub">Football Club</span>
              </div>
              <button class="search-fav-btn" onclick="event.stopPropagation(); Favorites.toggleTeam({ id: '${t.id}', name: '${t.name}', logo: '${t.logo}' });" title="Toggle Favorite">
                ${Favorites.isTeamFavorite(t.id) ? '★' : '☆'}
              </button>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Section: Matches
    if (topMatches.length > 0) {
      html += `
        <div class="search-category-header">⚽ Matches (${topMatches.length})</div>
        <div class="search-items-group">
          ${topMatches.map(m => `
            <div class="search-result-row match-res-row" onclick="GlobalSearch.selectMatch('${m.leagueId}', '${m.id}')">
              <span class="search-match-teams">${m.homeTeam.displayName} <strong>vs</strong> ${m.awayTeam.displayName}</span>
              <span class="search-match-status ${m.status.isLive ? 'live' : ''}">${m.status.label}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    html += `</div>`;
    dropdown.innerHTML = html;
    this.open();
  },

  selectComp(id) {
    this.close();
    Competitions.open(id);
  },

  selectTeam(id, name) {
    this.close();
    Teams.open(id, name);
  },

  selectMatch(leagueId, id) {
    this.close();
    MatchDetails.open(leagueId, id);
  },

  open() {
    const dropdown = document.getElementById(this.containerId);
    if (dropdown) {
      dropdown.style.display = 'block';
      this.isOpen = true;
    }
  },

  close() {
    const dropdown = document.getElementById(this.containerId);
    if (dropdown) {
      dropdown.style.display = 'none';
      this.isOpen = false;
    }
  }
};

window.GlobalSearch = GlobalSearch;
