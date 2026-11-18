/**
 * Ultra Score / Football World - Utility Functions
 * Handles dates, local timezones, formatting, status parsing, image fallbacks, and UI helpers.
 */

const Utils = {
  /**
   * Format an ISO date/time string to the user's local time (e.g., "19:45" or "7:45 PM")
   */
  formatLocalTime(isoString) {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '--:--';
      return new Intl.DateTimeFormat(navigator.language || 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
    } catch (e) {
      return '--:--';
    }
  },

  /**
   * Format an ISO date to user-friendly local date (e.g., "Saturday, Nov 21, 2026")
   */
  formatLocalDate(isoString, format = 'full') {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      
      if (format === 'short') {
        return new Intl.DateTimeFormat(navigator.language || 'en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }).format(date);
      }
      
      return new Intl.DateTimeFormat(navigator.language || 'en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return '';
    }
  },

  /**
   * Converts a Date object or ISO string to YYYYMMDD string for API queries
   */
  toApiDateString(date = new Date()) {
    if (typeof date === 'string') {
      // If already YYYYMMDD
      if (/^\d{8}$/.test(date)) return date;
      // If YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date.replace(/-/g, '');
      date = new Date(date);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  },

  /**
   * Converts a Date object or ISO string to YYYY-MM-DD for HTML date inputs
   */
  toInputDateString(date = new Date()) {
    if (typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
      if (/^\d{8}$/.test(date)) {
        return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
      }
      date = new Date(date);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Returns human-readable relative day ("Today", "Yesterday", "Tomorrow", or short date)
   */
  getRelativeDayLabel(dateInput) {
    const target = new Date(dateInput);
    target.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === -1) return "Yesterday";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -2) return "2 Days Ago";
    if (diffDays === 2) return "In 2 Days";

    return target.toLocaleDateString(navigator.language || 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Parse match status into a clean structured object with badges, live state, and label
   */
  parseMatchStatus(statusObj, dateStr) {
    if (!statusObj) {
      return {
        state: 'scheduled',
        label: this.formatLocalTime(dateStr),
        isLive: false,
        isFinished: false,
        badgeClass: 'badge-scheduled'
      };
    }

    const typeName = (statusObj.type?.name || statusObj.name || '').toUpperCase();
    const detail = statusObj.type?.detail || statusObj.detail || '';
    const displayClock = statusObj.displayClock || statusObj.clock || '';
    const period = statusObj.period || 0;

    // Live states
    if (
      typeName === 'STATUS_IN_PROGRESS' || 
      typeName === 'STATUS_FIRST_HALF' || 
      typeName === 'STATUS_SECOND_HALF' ||
      typeName === 'STATUS_EXTRA_TIME' ||
      typeName === 'STATUS_HALFTIME' ||
      typeName === 'STATUS_SHOOTOUT' ||
      statusObj.state === 'in'
    ) {
      if (typeName === 'STATUS_HALFTIME' || detail.toLowerCase().includes('half')) {
        return {
          state: 'live',
          label: 'HT',
          fullLabel: 'Half Time',
          isLive: true,
          isFinished: false,
          isHalftime: true,
          badgeClass: 'badge-halftime'
        };
      }
      
      const clockStr = displayClock ? `${displayClock}'` : (period === 1 ? '1st H' : '2nd H');
      return {
        state: 'live',
        label: clockStr,
        fullLabel: `Live ${clockStr}`,
        isLive: true,
        isFinished: false,
        badgeClass: 'badge-live'
      };
    }

    // Finished states
    if (
      typeName === 'STATUS_FULL_TIME' || 
      typeName === 'STATUS_FINAL' || 
      typeName === 'STATUS_FINAL_AET' ||
      typeName === 'STATUS_FINAL_PEN' ||
      statusObj.state === 'post' ||
      detail.toLowerCase().includes('ft') ||
      detail.toLowerCase().includes('final')
    ) {
      let label = 'FT';
      if (typeName === 'STATUS_FINAL_AET') label = 'AET';
      if (typeName === 'STATUS_FINAL_PEN') label = 'PEN';
      return {
        state: 'finished',
        label: label,
        fullLabel: detail || 'Full Time',
        isLive: false,
        isFinished: true,
        badgeClass: 'badge-finished'
      };
    }

    // Postponed / Suspended / Cancelled
    if (typeName.includes('POSTPONED') || detail.toLowerCase().includes('postponed')) {
      return {
        state: 'postponed',
        label: 'Postponed',
        fullLabel: 'Match Postponed',
        isLive: false,
        isFinished: false,
        badgeClass: 'badge-postponed'
      };
    }

    if (typeName.includes('CANCELLED') || detail.toLowerCase().includes('cancelled')) {
      return {
        state: 'cancelled',
        label: 'Cancelled',
        fullLabel: 'Match Cancelled',
        isLive: false,
        isFinished: false,
        badgeClass: 'badge-cancelled'
      };
    }

    // Scheduled
    return {
      state: 'scheduled',
      label: this.formatLocalTime(dateStr),
      fullLabel: detail || `Kickoff: ${this.formatLocalTime(dateStr)}`,
      isLive: false,
      isFinished: false,
      badgeClass: 'badge-scheduled'
    };
  },

  /**
   * Generate an authentic fallback SVG badge for teams without images or broken logos
   */
  getTeamLogoFallback(teamName = 'FC') {
    const letters = (teamName || 'FC')
      .split(' ')
      .filter(w => w.length > 0)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
    
    // Deterministic hue based on name
    let hash = 0;
    for (let i = 0; i < teamName.length; i++) {
      hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const bgColors = ['#087F46', '#0e5230', '#133e29', '#194d33', '#166534'];
    const color = bgColors[Math.abs(hash) % bgColors.length];

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
      <circle cx="40" cy="40" r="38" fill="${color}" stroke="#00D26A" stroke-width="2"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="700" font-size="24" letter-spacing="1">
        ${letters || 'FC'}
      </text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  },

  /**
   * Generate an authentic fallback avatar SVG for players
   */
  getPlayerAvatarFallback(playerName = 'Player') {
    const initials = (playerName || 'P')
      .split(' ')
      .filter(w => w.length > 0)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="48" fill="#101613" stroke="#087F46" stroke-width="2"/>
      <circle cx="50" cy="38" r="18" fill="#A0AAA4" opacity="0.6"/>
      <path d="M 22 84 C 22 66, 35 60, 50 60 C 65 60, 78 66, 78 84" fill="#A0AAA4" opacity="0.6"/>
      <text x="50%" y="88%" dominant-baseline="middle" text-anchor="middle" fill="#00D26A" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="700" font-size="16">
        ${initials}
      </text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  },

  /**
   * Handle image load errors gracefully by replacing source with fallback
   */
  handleImageError(imgEl, fallbackType = 'team', name = '') {
    if (!imgEl) return;
    imgEl.onerror = null; // Prevent infinite loop
    if (fallbackType === 'team') {
      imgEl.src = this.getTeamLogoFallback(name || imgEl.alt);
    } else if (fallbackType === 'player') {
      imgEl.src = this.getPlayerAvatarFallback(name || imgEl.alt);
    } else {
      imgEl.src = this.getTeamLogoFallback('FW');
    }
  },

  /**
   * Professional empty-state UI component generator
   */
  createEmptyStateHtml({ title = 'No Data Available', message = 'No matches found for this selection.', icon = 'calendar', actionBtn = null }) {
    let iconSvg = '';
    if (icon === 'calendar') {
      iconSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00D26A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>`;
    } else if (icon === 'live') {
      iconSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A0AAA4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polygon points="10 8 16 12 10 16 10 8"></polygon>
      </svg>`;
    } else if (icon === 'trophy') {
      iconSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00D26A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9H4a2 2 0 0 1-2-2V5h4"></path>
        <path d="M18 9h2a2 2 0 0 0 2-2V5h-4"></path>
        <path d="M4 5h16v7a8 8 0 0 1-16 0V5z"></path>
        <path d="M12 17v4"></path>
        <path d="M8 21h8"></path>
      </svg>`;
    } else {
      iconSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00D26A" stroke-width="1.8">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>`;
    }

    return `
      <div class="empty-state-card">
        <div class="empty-state-icon">${iconSvg}</div>
        <h3 class="empty-state-title">${title}</h3>
        <p class="empty-state-desc">${message}</p>
        ${actionBtn ? `<button class="btn btn-secondary empty-action-btn" onclick="${actionBtn.onClick}">${actionBtn.text}</button>` : ''}
      </div>
    `;
  },

  /**
   * Display a clean toast notification
   */
  showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<span class="toast-icon">✓</span>`;
    } else if (type === 'error') {
      iconSvg = `<span class="toast-icon">✕</span>`;
    } else {
      iconSvg = `<span class="toast-icon">ℹ</span>`;
    }

    toast.innerHTML = `${iconSvg}<span class="toast-text">${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-show');
    }, 20);

    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  },

  /**
   * Safe value formatter for statistics
   */
  formatStatValue(val) {
    if (val === undefined || val === null || val === '' || val === 'N/A') {
      return 'Not Available';
    }
    return String(val);
  },

  /**
   * Debounce helper
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

window.Utils = Utils;
