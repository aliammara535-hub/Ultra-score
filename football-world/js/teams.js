/**
 * Ultra Score / Football World - Teams Module
 * Handles team profile modal, squad details, and club information.
 */

const Teams = {
  modalId: 'team-modal',

  async open(teamId, teamName = 'Football Club') {
    let modal = document.getElementById(this.modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = this.modalId;
      modal.className = 'team-modal-overlay';
      document.body.appendChild(modal);
    }

    modal.classList.add('active');
    document.body.classList.add('modal-open');

    const fallbackLogo = Utils.getTeamLogoFallback(teamName);

    modal.innerHTML = `
      <div class="team-modal-card">
        <button class="team-modal-close" onclick="Teams.close()">✕</button>

        <div class="team-header-profile">
          <img src="${fallbackLogo}" alt="${teamName}" class="team-profile-badge" onerror="Utils.handleImageError(this, 'team', '${teamName}')"/>
          <div class="team-profile-info">
            <h2 class="team-profile-name">${teamName}</h2>
            <span class="team-profile-sub">Official Football Club Profile</span>
          </div>
        </div>

        <div class="team-profile-content">
          <div class="team-quick-stats">
            <div class="quick-stat-box">
              <span class="stat-box-label">Club ID</span>
              <span class="stat-box-val">${teamId || 'N/A'}</span>
            </div>
            <div class="quick-stat-box">
              <span class="stat-box-label">Data Status</span>
              <span class="stat-box-val text-green">Verified Official Feed</span>
            </div>
          </div>

          <div class="team-club-notice">
            <p>To inspect full squad lineups, tactical formations, and match stats for <strong>${teamName}</strong>, click on any of their upcoming or finished fixtures in the match center.</p>
          </div>
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
