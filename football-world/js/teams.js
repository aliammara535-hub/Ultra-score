/**
 * Ultra Score / Football World - Teams Module
 * Full Team Profile with Official Crest, Venue, League Position,
 * Squad Roster with Real Photographs, and Next Fixture.
 */

const Teams = {
  modalId: 'team-modal',
  currentLeagueId: 'eng.1',

  async open(teamId, teamName = 'Football Club', leagueId = null) {
    if (!teamId) return;

    let targetLeague = leagueId;
    if (!targetLeague) {
      targetLeague = window.Competitions?.currentCompetitionId || 'eng.1';
    }
    this.currentLeagueId = targetLeague;

    let modal = document.getElementById(this.modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = this.modalId;
      modal.className = 'team-modal-overlay';
      document.body.appendChild(modal);
    }

    modal.classList.add('active');
    document.body.classList.add('modal-open');

    // Loading State
    modal.innerHTML = `
      <div class="team-modal-card team-modal-card-lg">
        <button class="team-modal-close" onclick="Teams.close()">✕</button>
        <div class="loading-state-card">
          <div class="spinner"></div>
          <p>Loading official profile and squad for ${Utils.escapeHtml(teamName)}...</p>
        </div>
      </div>
    `;

    try {
      const [teamData, rosterData] = await Promise.all([
        this.fetchTeamDetails(targetLeague, teamId),
        this.fetchTeamRoster(targetLeague, teamId)
      ]);

      this.renderTeamProfile(modal, teamId, teamName, teamData, rosterData);
      if (window.DatabaseService) {
        DatabaseService.syncTeam(teamId, { name: teamName, details: teamData?.team || null, lastSyncedAt: Date.now() });
      }
    } catch (e) {
      console.warn('[Teams] Error loading team data:', e.message);
      this.renderFallbackProfile(modal, teamId, teamName);
    }
  },

  async fetchTeamDetails(leagueId, teamId) {
    const cacheKey = `team_profile_${leagueId}_${teamId}`;
    const cached = window.appCache?.get(cacheKey);
    if (cached) return cached;

    const url = `${ApiConfig.BASE_URL}/${leagueId}/teams/${teamId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    window.appCache?.set(cacheKey, data, 60 * 60 * 1000); // 1 hour TTL
    return data;
  },

  async fetchTeamRoster(leagueId, teamId) {
    const cacheKey = `team_roster_${leagueId}_${teamId}`;
    const cached = window.appCache?.get(cacheKey);
    if (cached) return cached;

    const url = `${ApiConfig.BASE_URL}/${leagueId}/teams/${teamId}/roster`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    window.appCache?.set(cacheKey, data, 60 * 60 * 1000); // 1 hour TTL
    return data;
  },

  renderTeamProfile(modal, teamId, teamName, teamData, rosterData) {
    const t = teamData?.team || {};
    const displayName = t.displayName || teamName;
    const logo = t.logos?.[0]?.href || Utils.getTeamLogoFallback(displayName);
    const venue = t.franchise?.venue?.fullName || 'Official Stadium';
    const venueCity = t.franchise?.venue?.address?.city || '';
    const standingSummary = t.standingSummary || '';
    const record = t.record?.items?.[0]?.summary || '';
    const isFav = Favorites.isTeamFavorite(teamId);

    const athletes = rosterData?.athletes || [];

    // Group athletes by position
    const goalkeepers = [];
    const defenders = [];
    const midfielders = [];
    const forwards = [];

    athletes.forEach(a => {
      const pos = a.position?.name?.toLowerCase() || '';
      const playerObj = {
        id: a.id,
        name: a.displayName || a.fullName || 'Player',
        jersey: a.jersey || '-',
        position: a.position?.displayName || a.position?.name || 'Player',
        citizenship: a.citizenship || '',
        flag: a.flag?.href || '',
        photo: a.headshot?.href || Utils.getPlayerAvatarFallback(a.displayName),
        stats: a.statistics?.splits?.categories || []
      };

      if (pos.includes('goal')) {
        goalkeepers.push(playerObj);
      } else if (pos.includes('defen')) {
        defenders.push(playerObj);
      } else if (pos.includes('mid')) {
        midfielders.push(playerObj);
      } else {
        forwards.push(playerObj);
      }
    });

    modal.innerHTML = `
      <div class="team-modal-card team-modal-card-lg">
        <button class="team-modal-close" onclick="Teams.close()">✕</button>

        <!-- Team Header Profile -->
        <div class="team-profile-header-banner">
          <img src="${logo}" alt="${displayName}" class="team-profile-badge-lg" onerror="Utils.handleImageError(this, 'team', '${displayName}')"/>
          <div class="team-banner-meta">
            <div class="team-title-row">
              <h2 class="team-profile-name-lg">${displayName}</h2>
              <button class="btn-fav-toggle ${isFav ? 'is-fav' : ''}" onclick="Favorites.toggleTeam({ id: '${teamId}', name: '${displayName}', logo: '${logo}' }); Teams.updateFavState(this, '${teamId}');" title="Toggle Favorite">
                ${isFav ? '★ Favorited' : '☆ Add to Favorites'}
              </button>
            </div>
            <div class="team-badges-row">
              <span class="team-info-pill">🏟 ${venue}${venueCity ? `, ${venueCity}` : ''}</span>
              ${standingSummary ? `<span class="team-info-pill pill-standing">📊 ${standingSummary}</span>` : ''}
              ${record ? `<span class="team-info-pill">Record: <strong>${record}</strong></span>` : ''}
            </div>
          </div>
        </div>

        <!-- Squad Roster Sections -->
        <div class="team-squad-container">
          <h3 class="squad-section-title">Official Squad Roster (${athletes.length} Players)</h3>

          ${this._renderRosterGroup('Goalkeepers', goalkeepers, displayName)}
          ${this._renderRosterGroup('Defenders', defenders, displayName)}
          ${this._renderRosterGroup('Midfielders', midfielders, displayName)}
          ${this._renderRosterGroup('Forwards', forwards, displayName)}
        </div>
      </div>
    `;
  },

  _renderRosterGroup(title, list, teamName) {
    if (!list || list.length === 0) return '';

    return `
      <div class="squad-group">
        <h4 class="squad-group-heading">${title}</h4>
        <div class="squad-grid">
          ${list.map(p => `
            <div class="squad-player-card" onclick="Players.openFromData(${JSON.stringify(p).replace(/"/g, '&quot;')}, '${teamName}')">
              <div class="squad-photo-wrap">
                <img src="${p.photo}" alt="${p.name}" class="squad-player-img" onerror="Utils.handleImageError(this, 'player', '${p.name}')" loading="lazy"/>
                <span class="squad-player-num">#${p.jersey}</span>
              </div>
              <div class="squad-player-meta">
                <span class="squad-player-name">${p.name}</span>
                <span class="squad-player-pos">${p.position}${p.citizenship ? ` • ${p.citizenship}` : ''}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  updateFavState(btn, teamId) {
    const isFav = Favorites.isTeamFavorite(teamId);
    btn.classList.toggle('is-fav', isFav);
    btn.innerHTML = isFav ? '★ Favorited' : '☆ Add to Favorites';
  },

  renderFallbackProfile(modal, teamId, teamName) {
    const fallbackLogo = Utils.getTeamLogoFallback(teamName);
    const isFav = Favorites.isTeamFavorite(teamId);

    modal.innerHTML = `
      <div class="team-modal-card">
        <button class="team-modal-close" onclick="Teams.close()">✕</button>
        <div class="team-header-profile">
          <img src="${fallbackLogo}" alt="${teamName}" class="team-profile-badge" onerror="Utils.handleImageError(this, 'team', '${teamName}')"/>
          <div class="team-profile-info">
            <h2 class="team-profile-name">${teamName}</h2>
            <span class="team-profile-sub">Official Football Club</span>
            <button class="btn-fav-toggle ${isFav ? 'is-fav' : ''}" style="margin-top: 0.5rem;" onclick="Favorites.toggleTeam({ id: '${teamId}', name: '${teamName}', logo: '${fallbackLogo}' }); Teams.updateFavState(this, '${teamId}');">
              ${isFav ? '★ Favorited' : '☆ Add to Favorites'}
            </button>
          </div>
        </div>
        <div class="team-club-notice">
          <p>Browse full squad details, upcoming matches, and live statistics in the match details center.</p>
        </div>
        <div class="team-modal-actions">
          <button class="btn btn-secondary" onclick="Teams.close()">Close</button>
        </div>
      </div>
    `;
  },

  close() {
    const modal = document.getElementById(this.modalId);
    if (modal) modal.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
};

window.Teams = Teams;
