/**
 * Ultra Score / Football World - Database Service
 * Manages Firebase Realtime Database reads, writes, synchronization,
 * and indexing according to the schema specifications.
 * 
 * Schema:
 * football-world/
 *   competitions/
 *   teams/
 *   matches/
 *   standings/
 *   players/
 *   statistics/
 *   sync_status/
 */

const DatabaseService = {
  BASE_PATH: 'football-world',

  /**
   * Helper to get database reference
   */
  _getRef(path = '') {
    const db = FirebaseConfig.init();
    if (!db) return null;
    return db.ref(`${this.BASE_PATH}/${path}`);
  },

  /**
   * Synchronize an array of matches into Firebase Realtime Database
   * Uses stable API IDs as unique keys to prevent duplicate records
   */
  async syncMatches(matches = [], dateKey = '') {
    if (!matches || !matches.length) return false;
    const ref = this._getRef('matches');
    if (!ref) return false;

    try {
      const updates = {};
      const timestamp = Date.now();

      matches.forEach(m => {
        if (!m.id) return;
        // Clean and prepare object for Firebase RTDB
        updates[m.id] = {
          id: String(m.id),
          date: m.date || '',
          competitionId: m.competitionId || '',
          competitionName: m.competitionName || '',
          competitionLogo: m.competitionLogo || '',
          homeTeam: {
            id: m.homeTeam?.id || '',
            name: m.homeTeam?.name || '',
            displayName: m.homeTeam?.displayName || '',
            score: m.homeTeam?.score ?? '-',
            logo: m.homeTeam?.logo || ''
          },
          awayTeam: {
            id: m.awayTeam?.id || '',
            name: m.awayTeam?.name || '',
            displayName: m.awayTeam?.displayName || '',
            score: m.awayTeam?.score ?? '-',
            logo: m.awayTeam?.logo || ''
          },
          status: {
            state: m.status?.state || 'scheduled',
            label: m.status?.label || '',
            fullLabel: m.status?.fullLabel || '',
            isLive: Boolean(m.status?.isLive),
            isFinished: Boolean(m.status?.isFinished)
          },
          venue: m.venue || '',
          lastSyncedAt: timestamp
        };
      });

      await ref.update(updates);
      await this.updateSyncStatus('matches', { count: matches.length, date: dateKey });
      return true;
    } catch (e) {
      console.warn('[DatabaseService] syncMatches error:', e.message);
      return false;
    }
  },

  /**
   * Synchronize active live fixtures into football-world/live_matches
   */
  async syncLiveMatches(liveMatches = []) {
    const ref = this._getRef('live_matches');
    if (!ref) return false;

    try {
      const payload = {};
      const timestamp = Date.now();
      liveMatches.forEach(m => {
        if (m.id) {
          payload[m.id] = {
            id: String(m.id),
            date: m.date || '',
            leagueId: m.leagueId || '',
            competitionName: m.competitionName || '',
            homeTeam: m.homeTeam || {},
            awayTeam: m.awayTeam || {},
            status: m.status || {},
            lastSyncedAt: timestamp
          };
        }
      });
      await ref.set(payload);
      await this.updateSyncStatus('live_matches', { count: liveMatches.length });
      return true;
    } catch (e) {
      console.warn('[DatabaseService] syncLiveMatches error:', e.message);
      return false;
    }
  },

  /**
   * Synchronize team profile and squad into football-world/teams/{teamId}
   */
  async syncTeam(teamId, teamData) {
    if (!teamId || !teamData) return false;
    const ref = this._getRef(`teams/${teamId}`);
    if (!ref) return false;

    try {
      await ref.set({
        ...teamData,
        lastSyncedAt: Date.now()
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Synchronize player stats and profile into football-world/players/{playerId}
   */
  async syncPlayer(playerId, playerData) {
    if (!playerId || !playerData) return false;
    const ref = this._getRef(`players/${playerId}`);
    if (!ref) return false;

    try {
      await ref.set({
        ...playerData,
        lastSyncedAt: Date.now()
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Synchronize match details (events, lineups, statistics) into Firebase
   */
  async syncMatchDetails(matchId, detailsData) {
    if (!matchId || !detailsData) return false;
    const db = FirebaseConfig.init();
    if (!db) return false;

    try {
      const updates = {};
      const timestamp = Date.now();

      // Store in matches/{matchId}/details
      updates[`${this.BASE_PATH}/matches/${matchId}/details`] = {
        venue: detailsData.venue || null,
        officials: detailsData.officials || null,
        broadcasts: detailsData.broadcasts || null,
        lastSyncedAt: timestamp
      };

      // Store events timeline in matches/{matchId}/events
      if (detailsData.events) {
        updates[`${this.BASE_PATH}/matches/${matchId}/events`] = detailsData.events;
      }

      // Store lineups in matches/{matchId}/lineups
      if (detailsData.lineups) {
        updates[`${this.BASE_PATH}/matches/${matchId}/lineups`] = detailsData.lineups;
      }

      // Store statistics in statistics/{matchId}
      if (detailsData.statistics) {
        updates[`${this.BASE_PATH}/statistics/${matchId}`] = {
          teams: detailsData.statistics,
          lastSyncedAt: timestamp
        };
      }

      await db.ref().update(updates);
      return true;
    } catch (e) {
      console.warn('[DatabaseService] syncMatchDetails error:', e.message);
      return false;
    }
  },

  /**
   * Synchronize league standings into standings/{competitionId}
   */
  async syncStandings(competitionId, standingsData) {
    if (!competitionId || !standingsData) return false;
    const ref = this._getRef(`standings/${competitionId}`);
    if (!ref) return false;

    try {
      await ref.set({
        competitionId,
        competitionName: standingsData.competitionName || '',
        season: standingsData.season || '',
        table: standingsData.table || [],
        lastSyncedAt: Date.now()
      });
      return true;
    } catch (e) {
      console.warn('[DatabaseService] syncStandings error:', e.message);
      return false;
    }
  },

  /**
   * Synchronize competition info into competitions/{competitionId}
   */
  async syncCompetition(competitionId, compData) {
    if (!competitionId || !compData) return false;
    const ref = this._getRef(`competitions/${competitionId}`);
    if (!ref) return false;

    try {
      await ref.update({
        ...compData,
        lastSyncedAt: Date.now()
      });
      return true;
    } catch (e) {
      console.warn('[DatabaseService] syncCompetition error:', e.message);
      return false;
    }
  },

  /**
   * Record API sync status and timestamps
   */
  async updateSyncStatus(source, metadata = {}) {
    const ref = this._getRef(`sync_status/${source}`);
    if (!ref) return false;

    try {
      await ref.set({
        ...metadata,
        timestamp: Date.now(),
        isoTime: new Date().toISOString()
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Fetch a single match and its details from Firebase
   */
  async getMatch(matchId) {
    if (!matchId) return null;
    const ref = this._getRef(`matches/${matchId}`);
    if (!ref) return null;

    try {
      const snap = await ref.once('value');
      return snap.val();
    } catch (e) {
      console.warn('[DatabaseService] getMatch error:', e.message);
      return null;
    }
  },

  /**
   * Fetch statistics for a match from Firebase
   */
  async getStatistics(matchId) {
    if (!matchId) return null;
    const ref = this._getRef(`statistics/${matchId}`);
    if (!ref) return null;

    try {
      const snap = await ref.once('value');
      return snap.val();
    } catch (e) {
      return null;
    }
  },

  /**
   * Fetch standings for a competition from Firebase
   */
  async getStandings(competitionId) {
    if (!competitionId) return null;
    const ref = this._getRef(`standings/${competitionId}`);
    if (!ref) return null;

    try {
      const snap = await ref.once('value');
      return snap.val();
    } catch (e) {
      return null;
    }
  },

  /**
   * Subscribe to real-time updates for live matches
   */
  listenToLiveMatches(callback) {
    const ref = this._getRef('matches');
    if (!ref || typeof callback !== 'function') return () => {};

    try {
      const query = ref.orderByChild('status/isLive').equalTo(true);
      const listener = query.on('value', snap => {
        const data = snap.val() || {};
        const liveMatches = Object.values(data);
        callback(liveMatches);
      });

      // Return unsubscribe function
      return () => query.off('value', listener);
    } catch (e) {
      console.warn('[DatabaseService] listenToLiveMatches error:', e.message);
      return () => {};
    }
  }
};

window.DatabaseService = DatabaseService;
