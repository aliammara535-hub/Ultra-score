/**
 * Ultra Score / Football World - Favorites System
 * Manages user favorite teams and competitions with localStorage persistence.
 */

const Favorites = {
  STORAGE_KEY: 'fw_user_favorites',

  _data: {
    teams: [],        // [{ id, name, logo }]
    competitions: []  // [{ id, name, logo }]
  },

  init() {
    this.load();
    this.renderFavoritesBar();
  },

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        this._data = JSON.parse(raw);
        if (!Array.isArray(this._data.teams)) this._data.teams = [];
        if (!Array.isArray(this._data.competitions)) this._data.competitions = [];
      }
    } catch (e) {
      this._data = { teams: [], competitions: [] };
    }
  },

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._data));
    } catch (e) {}
    this.renderFavoritesBar();
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: this._data }));
  },

  isTeamFavorite(teamId) {
    if (!teamId) return false;
    return this._data.teams.some(t => String(t.id) === String(teamId));
  },

  toggleTeam(team) {
    if (!team || !team.id) return;
    const teamId = String(team.id);
    const idx = this._data.teams.findIndex(t => String(t.id) === teamId);

    if (idx >= 0) {
      this._data.teams.splice(idx, 1);
      Utils.showToast(`Removed ${team.displayName || team.name} from Favorites`, 'info');
    } else {
      this._data.teams.push({
        id: teamId,
        name: team.displayName || team.name,
        logo: team.logo || Utils.getTeamLogoFallback(team.displayName || team.name)
      });
      Utils.showToast(`Added ${team.displayName || team.name} to Favorites! ⭐`, 'success');
    }
    this.save();
  },

  isCompFavorite(compId) {
    if (!compId) return false;
    return this._data.competitions.some(c => String(c.id) === String(compId));
  },

  toggleCompetition(comp) {
    if (!comp || !comp.id) return;
    const compId = String(comp.id);
    const idx = this._data.competitions.findIndex(c => String(c.id) === compId);

    if (idx >= 0) {
      this._data.competitions.splice(idx, 1);
      Utils.showToast(`Removed ${comp.displayName || comp.name} from Favorites`, 'info');
    } else {
      this._data.competitions.push({
        id: compId,
        name: comp.displayName || comp.name,
        logo: comp.logo || ''
      });
      Utils.showToast(`Added ${comp.displayName || comp.name} to Favorites! ⭐`, 'success');
    }
    this.save();
  },

  getFavoriteTeams() {
    return this._data.teams || [];
  },

  getFavoriteCompetitions() {
    return this._data.competitions || [];
  },

  hasAnyFavorites() {
    return (this._data.teams.length > 0 || this._data.competitions.length > 0);
  },

  renderFavoritesBar() {
    const container = document.getElementById('favorites-bar-container');
    if (!container) return;

    if (!this.hasAnyFavorites()) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    let html = `
      <div class="fav-bar-inner">
        <span class="fav-bar-label">⭐ Favorites:</span>
        <div class="fav-chips-track">
    `;

    this._data.teams.forEach(t => {
      html += `
        <div class="fav-chip" onclick="Teams.open('${t.id}', '${t.name}')" title="View ${t.name}">
          <img src="${t.logo}" alt="${t.name}" class="fav-chip-img" onerror="Utils.handleImageError(this, 'team', '${t.name}')"/>
          <span class="fav-chip-name">${t.name}</span>
          <button class="fav-chip-remove" onclick="event.stopPropagation(); Favorites.toggleTeam({ id: '${t.id}', name: '${t.name}' });" title="Remove">✕</button>
        </div>
      `;
    });

    this._data.competitions.forEach(c => {
      html += `
        <div class="fav-chip fav-chip-comp" onclick="Competitions.open('${c.id}')" title="View ${c.name}">
          ${c.logo ? `<img src="${c.logo}" alt="${c.name}" class="fav-chip-img"/>` : '🏆'}
          <span class="fav-chip-name">${c.name}</span>
          <button class="fav-chip-remove" onclick="event.stopPropagation(); Favorites.toggleCompetition({ id: '${c.id}', name: '${c.name}' });" title="Remove">✕</button>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;
  }
};

window.Favorites = Favorites;
