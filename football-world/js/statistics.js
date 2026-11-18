/**
 * Ultra Score / Football World - Match Statistics Module
 * High-precision dual-sided comparison bars and numerical displays
 * for 14+ official football metrics with graceful "Not Available" fallbacks.
 */

const Statistics = {
  /**
   * Render complete statistics tab content
   */
  renderStatistics(statsData, homeTeam, awayTeam) {
    if (!statsData) {
      return `
        <div class="empty-stats-card">
          <div class="empty-icon">📊</div>
          <h3>Statistics Not Available</h3>
          <p>Detailed performance statistics have not been recorded for this match yet.</p>
        </div>
      `;
    }

    // List of metrics to display in prioritized order
    const metrics = [
      { key: 'possession', label: 'Ball Possession', isPercentage: true },
      { key: 'totalShots', label: 'Total Shots' },
      { key: 'shotsOnTarget', label: 'Shots on Target' },
      { key: 'shotsOffTarget', label: 'Shots off Target' },
      { key: 'expectedGoals', label: 'Expected Goals (xG)' },
      { key: 'totalPasses', label: 'Total Passes' },
      { key: 'passAccuracy', label: 'Pass Accuracy', isPercentage: true },
      { key: 'fouls', label: 'Fouls Committed' },
      { key: 'yellowCards', label: 'Yellow Cards' },
      { key: 'redCards', label: 'Red Cards' },
      { key: 'cornerKicks', label: 'Corner Kicks' },
      { key: 'offsides', label: 'Offsides' },
      { key: 'totalAttacks', label: 'Total Attacks' },
      { key: 'dangerousAttacks', label: 'Dangerous Attacks' },
      { key: 'saves', label: 'Goalkeeper Saves' },
      { key: 'tackles', label: 'Total Tackles' }
    ];

    return `
      <div class="stats-overview-wrapper">
        <!-- Team Headers -->
        <div class="stats-teams-header">
          <div class="stat-team-label home">
            <img src="${homeTeam.logo}" alt="${homeTeam.displayName}" class="stat-badge" onerror="Utils.handleImageError(this, 'team', '${homeTeam.displayName}')"/>
            <span class="stat-team-name">${homeTeam.displayName}</span>
          </div>

          <div class="stat-vs-pill">VS</div>

          <div class="stat-team-label away">
            <span class="stat-team-name">${awayTeam.displayName}</span>
            <img src="${awayTeam.logo}" alt="${awayTeam.displayName}" class="stat-badge" onerror="Utils.handleImageError(this, 'team', '${awayTeam.displayName}')"/>
          </div>
        </div>

        <!-- Metric Bars -->
        <div class="stats-bars-container">
          ${metrics.map(m => this._renderMetricComparisonRow(statsData[m.key], m.label, m.isPercentage)).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Render an individual comparison row with numbers and dual percentage bars
   */
  _renderMetricComparisonRow(metricObj, label, isPercentage = false) {
    if (!metricObj || !metricObj.available) {
      return `
        <div class="stat-row stat-unavailable">
          <div class="stat-val home-val unavailable-text">Not Available</div>
          <div class="stat-meta">
            <span class="stat-name">${label}</span>
            <div class="stat-bar-track empty-track">
              <div class="stat-empty-indicator">Data Unavailable from Official Source</div>
            </div>
          </div>
          <div class="stat-val away-val unavailable-text">Not Available</div>
        </div>
      `;
    }

    const homeDisplay = metricObj.homeDisplay || 'Not Available';
    const awayDisplay = metricObj.awayDisplay || 'Not Available';
    const homePct = metricObj.homePct ?? 50;
    const awayPct = metricObj.awayPct ?? 50;

    // Check which team is leading this metric
    const isHomeBetter = (metricObj.homeVal > metricObj.awayVal);
    const isAwayBetter = (metricObj.awayVal > metricObj.homeVal);

    return `
      <div class="stat-row">
        <!-- Home Value -->
        <div class="stat-val home-val ${isHomeBetter ? 'val-leading' : ''}">
          ${homeDisplay}
        </div>

        <!-- Center Bar & Label -->
        <div class="stat-meta">
          <div class="stat-label-row">
            <span class="stat-name">${label}</span>
          </div>
          <div class="stat-bar-track">
            <div class="bar-fill bar-home" style="width: ${homePct}%;"></div>
            <div class="bar-fill bar-away" style="width: ${awayPct}%;"></div>
          </div>
        </div>

        <!-- Away Value -->
        <div class="stat-val away-val ${isAwayBetter ? 'val-leading' : ''}">
          ${awayDisplay}
        </div>
      </div>
    `;
  }
};

window.Statistics = Statistics;
