/**
 * Ultra Score / Football World - League Standings Module
 * Renders authentic league tables with qualifying zone badges,
 * goal difference, points, and form guides.
 */

const Standings = {
  /**
   * Render complete standings table
   */
  renderTable(standingsData) {
    if (!standingsData || !standingsData.table || standingsData.table.length === 0) {
      return `
        <div class="empty-standings-card">
          <div class="empty-icon">🏆</div>
          <h3>Standings Table Currently Unavailable</h3>
          <p>Official standings are updated automatically by the league data provider.</p>
        </div>
      `;
    }

    const table = standingsData.table;

    return `
      <div class="standings-table-container">
        <table class="standings-table">
          <thead>
            <tr>
              <th class="th-pos">#</th>
              <th class="th-club">Club</th>
              <th class="th-num">P</th>
              <th class="th-num">W</th>
              <th class="th-num">D</th>
              <th class="th-num">L</th>
              <th class="th-num hide-mobile">GF</th>
              <th class="th-num hide-mobile">GA</th>
              <th class="th-num">GD</th>
              <th class="th-pts">PTS</th>
            </tr>
          </thead>
          <tbody>
            ${table.map((row, idx) => this._renderTableRow(row, idx, table.length)).join('')}
          </tbody>
        </table>

        <!-- Table Legend -->
        <div class="standings-legend">
          <span class="legend-item"><span class="legend-dot dot-champions"></span> Champions League / Promotion</span>
          <span class="legend-item"><span class="legend-dot dot-europa"></span> Europa League</span>
          <span class="legend-item"><span class="legend-dot dot-relegation"></span> Relegation Zone</span>
        </div>
      </div>
    `;
  },

  /**
   * Render an individual row in the standings table
   */
  _renderTableRow(row, index, totalTeams) {
    const rank = row.rank || (index + 1);
    const team = row.team;

    // Zone indicators
    let zoneClass = '';
    if (rank <= 4) {
      zoneClass = 'zone-champions';
    } else if (rank === 5) {
      zoneClass = 'zone-europa';
    } else if (rank > totalTeams - 3) {
      zoneClass = 'zone-relegation';
    }

    const gd = String(row.goalDifference);
    const gdClass = gd.startsWith('+') || parseInt(gd, 10) > 0 ? 'gd-positive' : (gd.startsWith('-') ? 'gd-negative' : 'gd-neutral');

    return `
      <tr class="standings-row ${zoneClass}">
        <td class="td-pos">
          <span class="pos-badge">${rank}</span>
        </td>
        <td class="td-club">
          <div class="club-cell" onclick="Teams.open('${team.id}', '${team.name}')">
            <img src="${team.logo}" alt="${team.name}" class="table-club-logo" onerror="Utils.handleImageError(this, 'team', '${team.name}')" loading="lazy"/>
            <span class="club-title">${team.name}</span>
          </div>
        </td>
        <td class="td-num">${row.played}</td>
        <td class="td-num">${row.won}</td>
        <td class="td-num">${row.drawn}</td>
        <td class="td-num">${row.lost}</td>
        <td class="td-num hide-mobile">${row.goalsFor}</td>
        <td class="td-num hide-mobile">${row.goalsAgainst}</td>
        <td class="td-num ${gdClass}">${gd}</td>
        <td class="td-pts"><strong>${row.points}</strong></td>
      </tr>
    `;
  }
};

window.Standings = Standings;
