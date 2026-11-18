/**
 * Ultra Score / Football World - Players Module
 * Handles player profiles, authentic photographs, and statistics.
 */

const Players = {
  modalId: 'player-modal',

  open(playerData) {
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

    modal.innerHTML = `
      <div class="team-modal-card player-modal-card">
        <button class="team-modal-close" onclick="Players.close()">✕</button>

        <div class="team-header-profile">
          <img src="${playerData.photo}" alt="${playerData.name}" class="player-profile-photo" onerror="Utils.handleImageError(this, 'player', '${playerData.name}')"/>
          <div class="team-profile-info">
            <h2 class="team-profile-name">${playerData.name}</h2>
            <span class="player-shirt-tag">#${playerData.jersey || '-'} • ${playerData.position || 'Player'}</span>
          </div>
        </div>

        <div class="player-profile-body">
          <div class="player-meta-grid">
            <div class="quick-stat-box">
              <span class="stat-box-label">Position</span>
              <span class="stat-box-val">${playerData.position || 'Outfield'}</span>
            </div>
            <div class="quick-stat-box">
              <span class="stat-box-label">Shirt Number</span>
              <span class="stat-box-val">#${playerData.jersey || '-'}</span>
            </div>
            <div class="quick-stat-box">
              <span class="stat-box-label">Lineup Status</span>
              <span class="stat-box-val text-green">${playerData.starter ? 'Starting XI' : 'Substitute'}</span>
            </div>
          </div>
        </div>

        <div class="team-modal-actions">
          <button class="btn btn-secondary" onclick="Players.close()">Close</button>
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

window.Players = Players;
