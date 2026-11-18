/**
 * Ultra Score / Football World - Match Events Timeline Module
 * Visual chronological event stream (goals, cards, substitutions, penalties, VAR)
 * distinguishing between home and away team events.
 */

const MatchEvents = {
  /**
   * Render chronological match events
   */
  renderTimeline(events = [], homeTeamId, awayTeamId) {
    if (!events || events.length === 0) {
      return `
        <div class="empty-timeline-state">
          <div class="empty-timeline-icon">⏱</div>
          <p class="empty-timeline-title">No Match Events Recorded</p>
          <p class="empty-timeline-desc">Events like goals, cards, and substitutions will appear here once the match begins.</p>
        </div>
      `;
    }

    // Sort events by minute (numerical extraction)
    const sorted = [...events].sort((a, b) => {
      const minA = parseInt(String(a.minute).replace(/[^\d]/g, '') || 0, 10);
      const minB = parseInt(String(b.minute).replace(/[^\d]/g, '') || 0, 10);
      return minA - minB;
    });

    let html = `
      <div class="events-timeline-container">
        <div class="timeline-center-spine"></div>
        <div class="timeline-items">
    `;

    sorted.forEach((event, idx) => {
      const isHome = event.isHome !== undefined ? event.isHome : (String(event.teamId) === String(homeTeamId));
      const eventClass = isHome ? 'event-home' : 'event-away';
      const badgeIcon = this._getEventBadgeIcon(event.type);

      html += `
        <div class="timeline-item ${eventClass} type-${event.type}">
          <!-- Minute Marker in Center -->
          <div class="timeline-minute-badge">
            ${event.minute ? `${event.minute}'` : '⏱'}
          </div>

          <!-- Event Content Card -->
          <div class="timeline-card">
            <div class="event-header">
              <span class="event-type-icon">${badgeIcon}</span>
              <span class="event-title">${this._getEventTitle(event)}</span>
            </div>

            <div class="event-body">
              ${event.player ? `<div class="event-primary-player">${event.player}</div>` : ''}
              ${event.assist ? `<div class="event-sub-info">Assist: <strong>${event.assist}</strong></div>` : ''}
              ${event.substitutedFor ? `<div class="event-sub-info">Replaced: <strong>${event.substitutedFor}</strong></div>` : ''}
              ${event.text && !event.player ? `<div class="event-description">${event.text}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  },

  /**
   * Helper to get event icons
   */
  _getEventBadgeIcon(type) {
    switch (type) {
      case 'goal':
      case 'penalty-goal':
        return '⚽';
      case 'own-goal':
        return '⚽ (OG)';
      case 'yellow-card':
        return '<span class="card-icon card-yellow"></span>';
      case 'red-card':
        return '<span class="card-icon card-red"></span>';
      case 'substitution':
        return '🔄';
      case 'var':
        return '<span class="var-badge">VAR</span>';
      default:
        return '📌';
    }
  },

  /**
   * Helper to format readable event header title
   */
  _getEventTitle(event) {
    switch (event.type) {
      case 'goal':
        return 'GOAL';
      case 'penalty-goal':
        return 'PENALTY GOAL';
      case 'own-goal':
        return 'OWN GOAL';
      case 'yellow-card':
        return 'Yellow Card';
      case 'red-card':
        return 'Red Card';
      case 'substitution':
        return 'Substitution';
      case 'var':
        return 'VAR Decision';
      default:
        return event.typeLabel || 'Match Event';
    }
  }
};

window.MatchEvents = MatchEvents;
