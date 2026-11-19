/**
 * Ultra Score / Football World - Lineups Module
 * Visual Tactical Football Pitch formation layout with real player photos,
 * starting XI positions, bench substitutes, and managers.
 */

const Lineups = {
  /**
   * Render complete lineups view: Pitch Formation + Lists
   */
  renderLineups(lineupsData, homeTeam, awayTeam) {
    if (!lineupsData || (!lineupsData.home?.starters?.length && !lineupsData.away?.starters?.length)) {
      return `
        <div class="empty-lineups-card">
          <div class="empty-icon">📋</div>
          <h3>Lineups Not Yet Announced</h3>
          <p>Official starting lineups are typically released 60 minutes prior to kickoff.</p>
        </div>
      `;
    }

    const isOfficial = Boolean(lineupsData.isOfficial);
    const home = lineupsData.home || {};
    const away = lineupsData.away || {};

    return `
      <div class="lineups-wrapper">
        <!-- Status & Formations Bar -->
        <div class="lineups-header-bar">
          <div class="team-formation-tag home-tag">
            <span class="formation-team">${homeTeam.displayName}</span>
            <span class="formation-code">${home.formation || '4-3-3'}</span>
          </div>

          <div class="lineup-status-indicator">
            <span class="status-badge ${isOfficial ? 'status-official' : 'status-expected'}">
              ${isOfficial ? '✓ Official Lineups' : '⏱ Expected Lineups'}
            </span>
          </div>

          <div class="team-formation-tag away-tag">
            <span class="formation-code">${away.formation || '4-3-3'}</span>
            <span class="formation-team">${awayTeam.displayName}</span>
          </div>
        </div>

        <!-- Tactical Pitch Display -->
        <div class="tactical-pitch-container">
          <div class="tactical-pitch">
            <!-- Away Team (Top Half - Attacking Downwards) -->
            <div class="pitch-half away-half">
              ${this._renderPitchFormationRows(away.starters, away.formation, true)}
            </div>

            <!-- Pitch Center Line Marker -->
            <div class="pitch-half-divider"></div>

            <!-- Home Team (Bottom Half - Attacking Upwards) -->
            <div class="pitch-half home-half">
              ${this._renderPitchFormationRows(home.starters, home.formation, false)}
            </div>
          </div>
        </div>

        <!-- Coaches Info -->
        <div class="coaches-row">
          <div class="coach-card">
            <span class="coach-label">Head Coach (${homeTeam.displayName}):</span>
            <span class="coach-name">👔 ${home.coach || 'Head Coach'}</span>
          </div>
          <div class="coach-card text-right">
            <span class="coach-label">Head Coach (${awayTeam.displayName}):</span>
            <span class="coach-name">👔 ${away.coach || 'Head Coach'}</span>
          </div>
        </div>

        <!-- Substitutes Bench Grid -->
        <div class="substitutes-section">
          <h4 class="subs-heading">Substitutes Bench</h4>
          
          <div class="subs-dual-grid">
            <!-- Home Subs -->
            <div class="subs-column home-subs">
              <h5 class="subs-team-title">${homeTeam.displayName}</h5>
              <div class="subs-list">
                ${this._renderSubsList(home.substitutes)}
              </div>
            </div>

            <!-- Away Subs -->
            <div class="subs-column away-subs">
              <h5 class="subs-team-title">${awayTeam.displayName}</h5>
              <div class="subs-list">
                ${this._renderSubsList(away.substitutes)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Split 11 starters into formation lines (Goalkeeper, Defenders, Midfielders, Attackers)
   * and render them placed tactically on their pitch half
   */
  _renderPitchFormationRows(starters = [], formationStr = '4-3-3', isTopHalf = false) {
    if (!starters || starters.length === 0) return '';

    // Parse formation numbers e.g. "4-3-3" or "4-2-3-1"
    const parsedCounts = (formationStr || '4-3-3')
      .split('-')
      .map(n => parseInt(n, 10))
      .filter(n => !isNaN(n) && n > 0);

    // Starters list: player 0 is usually Goalkeeper, followed by defenders, midfielders, attackers
    const rows = [];
    
    // Line 0: GK (always 1)
    const gk = starters.filter(p => p.position && p.position.toLowerCase().includes('goal') || p.position === 'G') || [];
    const nonGk = starters.filter(p => !gk.includes(p));

    // Fallback if GK not tagged
    const goalkeeper = gk.length ? gk : [starters[0]];
    const outfield = gk.length ? nonGk : starters.slice(1);

    rows.push(goalkeeper);

    let outfieldIndex = 0;
    parsedCounts.forEach(count => {
      const line = outfield.slice(outfieldIndex, outfieldIndex + count);
      outfieldIndex += count;
      if (line.length > 0) {
        rows.push(line);
      }
    });

    // If leftover outfield players remain
    if (outfieldIndex < outfield.length) {
      rows.push(outfield.slice(outfieldIndex));
    }

    // If top half (away team): Goalkeeper is at the very top (y=0), attackers at center line
    // If bottom half (home team): Goalkeeper is at the very bottom, attackers at center line
    const displayRows = isTopHalf ? rows : [...rows].reverse();

    return displayRows.map(linePlayers => `
      <div class="pitch-formation-row">
        ${linePlayers.map(p => this._renderPitchPlayerNode(p, isTopHalf)).join('')}
      </div>
    `).join('');
  },

  /**
   * Player pin on the football pitch with headshot, number, and name
   */
  _renderPitchPlayerNode(player, isAway = false) {
    const isGK = player.position && (player.position.toLowerCase().includes('goal') || player.position === 'G');
    const safePlayerJson = JSON.stringify(player).replace(/"/g, '&quot;');

    return `
      <div class="pitch-player-pin ${isAway ? 'away-pin' : 'home-pin'} ${isGK ? 'gk-pin' : ''}" onclick="Players.openFromData(${safePlayerJson})" style="cursor: pointer;" title="View ${player.name} Profile">
        <div class="player-photo-circle">
          <img src="${player.photo}" alt="${player.name}" onerror="Utils.handleImageError(this, 'player', '${player.name}')" loading="lazy" />
          <span class="player-jersey-number">${player.jersey}</span>
          ${player.subbedOut ? '<span class="pin-sub-badge sub-out">↓</span>' : ''}
          ${player.subbedIn ? '<span class="pin-sub-badge sub-in">↑</span>' : ''}
        </div>
        <span class="pitch-player-name" title="${player.name}">${player.name}</span>
      </div>
    `;
  },

  /**
   * Render substitute players list
   */
  _renderSubsList(subs = []) {
    if (!subs || subs.length === 0) {
      return '<div class="no-subs">No substitutes listed</div>';
    }

    return subs.map(p => {
      const safeJson = JSON.stringify(p).replace(/"/g, '&quot;');
      return `
        <div class="sub-item-row ${p.subbedIn ? 'was-subbed-in' : ''}" onclick="Players.openFromData(${safeJson})" style="cursor: pointer;" title="View ${p.name} Profile">
          <img src="${p.photo}" alt="${p.name}" class="sub-photo" onerror="Utils.handleImageError(this, 'player', '${p.name}')" loading="lazy"/>
          <div class="sub-meta">
            <span class="sub-jersey">#${p.jersey}</span>
            <span class="sub-name">${p.name}</span>
            <span class="sub-pos">${p.position}</span>
          </div>
          ${p.subbedIn ? '<span class="sub-in-tag">Subbed In</span>' : ''}
        </div>
      `;
    }).join('');
  }
};

window.Lineups = Lineups;
