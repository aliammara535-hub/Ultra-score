/**
 * Ultra Score / Football World - Players Module
 * Displays authentic player profiles, headshot photographs, jersey numbers,
 * citizenship, and real season statistics (Goals, Assists, Appearances).
 */

const Players = {
  modalId: 'player-modal',

  openFromData(playerData, teamName = 'Football Club') {
    if (!playerData) return;

    let modal = document.getElementById(this.modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = this.modalId;
      modal.className = 'team-modal-overlay';
      document.body.appendChild(modal);
    }

    modal.classList.add('active');
    document.body.classList.add('modal-open');

    // Extract statistics from splits/categories
    const statsCategories = playerData.stats || [];
    let appearances = '0';
    let goals = '0';
    let assists = '0';
    let yellowCards = '0';
    let redCards = '0';
    let saves = null;
    let shots = '0';

    statsCategories.forEach(cat => {
      const stats = cat.stats || [];
      stats.forEach(s => {
        if (s.name === 'appearances' || s.name === 'APP') appearances = s.displayValue || String(s.value);
        if (s.name === 'totalGoals' || s.name === 'G') goals = s.displayValue || String(s.value);
        if (s.name === 'goalAssists' || s.name === 'A') assists = s.displayValue || String(s.value);
        if (s.name === 'yellowCards' || s.name === 'YC') yellowCards = s.displayValue || String(s.value);
        if (s.name === 'redCards' || s.name === 'RC') redCards = s.displayValue || String(s.value);
        if (s.name === 'saves' || s.name === 'SV') saves = s.displayValue || String(s.value);
        if (s.name === 'totalShots') shots = s.displayValue || String(s.value);
      });
    });

    const isGoalkeeper = (playerData.position || '').toLowerCase().includes('goal') || playerData.position === 'G';

    modal.innerHTML = `
      <div class="team-modal-card player-modal-card">
        <button class="team-modal-close" onclick="Players.close()">✕</button>

        <div class="player-profile-hero">
          <div class="player-photo-hero-wrap">
            <img src="${playerData.photo}" alt="${playerData.name}" class="player-hero-img" onerror="Utils.handleImageError(this, 'player', '${playerData.name}')"/>
            <span class="player-hero-num">#${playerData.jersey || '-'}</span>
          </div>

          <div class="player-hero-details">
            <h2 class="player-hero-name">${playerData.name}</h2>
            <div class="player-hero-badges">
              <span class="player-badge-pill">${teamName}</span>
              <span class="player-badge-pill pill-pos">${playerData.position}</span>
              ${playerData.citizenship ? `<span class="player-badge-pill">🌍 ${playerData.citizenship}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Official Season Statistics -->
        <div class="player-stats-section">
          <h4 class="player-stats-heading">Official Season Performance</h4>
          <div class="player-stats-grid">
            <div class="player-stat-tile">
              <span class="stat-tile-val text-green">${appearances}</span>
              <span class="stat-tile-label">Appearances</span>
            </div>

            ${isGoalkeeper ? `
              <div class="player-stat-tile">
                <span class="stat-tile-val text-green">${saves || '0'}</span>
                <span class="stat-tile-label">Saves</span>
              </div>
            ` : `
              <div class="player-stat-tile">
                <span class="stat-tile-val text-green">${goals}</span>
                <span class="stat-tile-label">Goals</span>
              </div>
            `}

            <div class="player-stat-tile">
              <span class="stat-tile-val">${assists}</span>
              <span class="stat-tile-label">Assists</span>
            </div>

            <div class="player-stat-tile">
              <span class="stat-tile-val">${shots}</span>
              <span class="stat-tile-label">Shots Taken</span>
            </div>

            <div class="player-stat-tile">
              <span class="stat-tile-val text-yellow">${yellowCards}</span>
              <span class="stat-tile-label">Yellow Cards</span>
            </div>

            <div class="player-stat-tile">
              <span class="stat-tile-val text-red">${redCards}</span>
              <span class="stat-tile-label">Red Cards</span>
            </div>
          </div>
        </div>

        <div class="team-modal-actions" style="margin-top: 1.5rem;">
          <button class="btn btn-secondary" onclick="Players.close()">Close</button>
        </div>
      </div>
    `;

    if (window.DatabaseService && playerData.id) {
      DatabaseService.syncPlayer(playerData.id, playerData);
    }
  },

  open(playerObj) {
    if (!playerObj) return;
    this.openFromData(playerObj, playerObj.teamName || 'Football Club');
  },

  close() {
    const modal = document.getElementById(this.modalId);
    if (modal) modal.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
};

window.Players = Players;
