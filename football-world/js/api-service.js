/**
 * Ultra Score / Football World - API Service
 * Centralized data fetching layer interfacing with ESPN Football API,
 * cache manager, and Firebase Realtime Database.
 */

const ApiService = {
  /**
   * Resilient fetch helper with proxy fallback for client-side CORS/adblocker resilience
   */
  async _fetchJson(url) {
    // 1. Direct fetch
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[ApiService] Direct fetch failed for', url, err.message);
    }

    // 2. Fallback via CORS proxy (allorigins)
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[ApiService] Proxy fallback failed:', err.message);
    }

    // 3. Fallback via secondary CORS proxy
    try {
      const proxyUrl2 = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl2);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {}

    throw new Error(`All fetch attempts failed for ${url}`);
  },

  /**
   * Fetch scoreboard for a single competition and optional date (YYYYMMDD)
   */
  async fetchScoreboard(leagueId, dateStr = null, forceRefresh = false) {
    const cacheKey = `scoreboard_${leagueId}_${dateStr || 'current'}`;

    if (!forceRefresh) {
      const cached = window.appCache.get(cacheKey);
      if (cached) return cached;
    }

    const url = ApiConfig.getScoreboardUrl(leagueId, dateStr);

    try {
      const data = await this._fetchJson(url);
      const normalizedMatches = this._normalizeScoreboardEvents(data, leagueId);

      // Determine appropriate TTL
      const hasLiveMatch = normalizedMatches.some(m => m.status.isLive);
      const ttl = hasLiveMatch 
        ? window.appCache.TTL.LIVE_MATCHES 
        : (dateStr ? window.appCache.TTL.HISTORICAL_MATCHES : window.appCache.TTL.TODAY_MATCHES);

      window.appCache.set(cacheKey, normalizedMatches, ttl);

      // Synchronize into Firebase in background
      if (window.DatabaseService && normalizedMatches.length > 0) {
        window.DatabaseService.syncMatches(normalizedMatches, dateStr || 'current');
      }

      return normalizedMatches;
    } catch (error) {
      console.warn(`[ApiService] Scoreboard fetch error (${leagueId}):`, error.message);
      // Return cached even if stale, or empty list
      return window.appCache.get(cacheKey) || [];
    }
  },

  /**
   * Fetch scoreboards across multiple leagues concurrently
   */
  async fetchMultiLeagueScoreboard(leagueIds = null, dateStr = null, forceRefresh = false) {
    const targetLeagues = leagueIds || ApiConfig.COMPETITIONS.map(c => c.id);
    const promises = targetLeagues.map(id => this.fetchScoreboard(id, dateStr, forceRefresh));
    const results = await Promise.allSettled(promises);

    const allMatches = [];
    results.forEach(res => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        allMatches.push(...res.value);
      }
    });

    // Sort by kickoff time
    allMatches.sort((a, b) => new Date(a.date) - new Date(b.date));
    return allMatches;
  },

  /**
   * Fetch all currently live matches across top leagues
   */
  async fetchLiveMatches(forceRefresh = false) {
    const cacheKey = 'live_matches_all';

    if (!forceRefresh) {
      const cached = window.appCache.get(cacheKey);
      if (cached) return cached;
    }

    // Prioritize European top 5 + Continental for live query speed
    const priorityLeagues = [
      'eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1',
      'uefa.champions', 'uefa.europa', 'uefa.europa.conf',
      'fifa.world', 'uefa.euro', 'ned.1', 'por.1', 'usa.1'
    ];

    const allMatches = await this.fetchMultiLeagueScoreboard(priorityLeagues, null, forceRefresh);
    const liveMatches = allMatches.filter(m => m.status.isLive);

    window.appCache.set(cacheKey, liveMatches, window.appCache.TTL.LIVE_MATCHES);
    return liveMatches;
  },

  /**
   * Fetch all matches for a specific date (today, past, or future)
   */
  async fetchMatchesByDate(dateInput, forceRefresh = false) {
    const dateStr = Utils.toApiDateString(dateInput);
    const cacheKey = `matches_by_date_${dateStr}`;

    if (!forceRefresh) {
      const cached = window.appCache.get(cacheKey);
      if (cached) return cached;
    }

    const priorityLeagues = ApiConfig.COMPETITIONS.map(c => c.id);
    const matches = await this.fetchMultiLeagueScoreboard(priorityLeagues, dateStr, forceRefresh);

    const isToday = dateStr === Utils.toApiDateString(new Date());
    const ttl = isToday ? window.appCache.TTL.TODAY_MATCHES : window.appCache.TTL.HISTORICAL_MATCHES;

    window.appCache.set(cacheKey, matches, ttl);
    return matches;
  },

  /**
   * Fetch default matchday / gameweek fixtures across competitions (no date restriction)
   * Returns current round including upcoming fixtures and active/recent matches
   */
  async fetchDefaultScoreboard(forceRefresh = false) {
    const cacheKey = 'matches_default_gameweek';
    if (!forceRefresh) {
      const cached = window.appCache.get(cacheKey);
      if (cached && cached.length > 0) return cached;
    }
    const priorityLeagues = ApiConfig.COMPETITIONS.map(c => c.id);
    const matches = await this.fetchMultiLeagueScoreboard(priorityLeagues, null, forceRefresh);
    window.appCache.set(cacheKey, matches, window.appCache.TTL.TODAY_MATCHES);
    return matches;
  },

  /**
   * Fetch recent finished match results (historical completed fixtures)
   */
  async fetchRecentFinishedMatches(forceRefresh = false) {
    const cacheKey = 'matches_recent_finished';
    if (!forceRefresh) {
      const cached = window.appCache.get(cacheKey);
      if (cached && cached.length > 0) return cached;
    }

    // Check recent match dates
    const recentDates = ['20261117', '20261116', '20261115', '20261114', '20261108', '20261107'];
    const leagues = ApiConfig.COMPETITIONS.map(c => c.id);

    const allFinished = [];
    for (const d of recentDates) {
      const dayMatches = await this.fetchMultiLeagueScoreboard(leagues, d, forceRefresh);
      const finished = dayMatches.filter(m => m.status.isFinished);
      if (finished.length > 0) {
        allFinished.push(...finished);
        if (allFinished.length >= 10) break;
      }
    }

    window.appCache.set(cacheKey, allFinished, window.appCache.TTL.HISTORICAL_MATCHES);
    return allFinished;
  },

  /**
   * Fetch full match summary: events timeline, boxscore stats, lineups, officials, venue
   */
  async fetchMatchDetails(leagueId, eventId, forceRefresh = false) {
    const cacheKey = `match_detail_${leagueId}_${eventId}`;

    if (!forceRefresh) {
      const cached = window.appCache.get(cacheKey);
      if (cached) return cached;
    }

    const url = ApiConfig.getSummaryUrl(leagueId, eventId);

    try {
      const data = await this._fetchJson(url);
      const normalizedDetails = this._normalizeMatchSummary(data, leagueId, eventId);

      const isLive = normalizedDetails.header?.status?.isLive;
      const ttl = isLive ? window.appCache.TTL.MATCH_DETAILS_LIVE : window.appCache.TTL.MATCH_DETAILS_FINAL;

      window.appCache.set(cacheKey, normalizedDetails, ttl);

      // Background sync to Firebase
      if (window.DatabaseService) {
        window.DatabaseService.syncMatchDetails(eventId, normalizedDetails);
      }

      return normalizedDetails;
    } catch (error) {
      console.warn(`[ApiService] Match details fetch error (${eventId}):`, error.message);
      return window.appCache.get(cacheKey) || null;
    }
  },

  /**
   * Fetch competition standings
   */
  async fetchStandings(leagueId, forceRefresh = false) {
    const cacheKey = `standings_${leagueId}`;

    if (!forceRefresh) {
      const cached = window.appCache.get(cacheKey);
      if (cached) return cached;
    }

    const url = ApiConfig.getStandingsUrl(leagueId);

    try {
      const data = await this._fetchJson(url);
      const normalizedStandings = this._normalizeStandings(data, leagueId);

      window.appCache.set(cacheKey, normalizedStandings, window.appCache.TTL.STANDINGS);

      // Background sync to Firebase
      if (window.DatabaseService) {
        window.DatabaseService.syncStandings(leagueId, normalizedStandings);
      }

      return normalizedStandings;
    } catch (error) {
      console.warn(`[ApiService] Standings fetch error (${leagueId}):`, error.message);
      return window.appCache.get(cacheKey) || null;
    }
  },

  /**
   * Normalizes raw ESPN scoreboard events into clean match models
   */
  _normalizeScoreboardEvents(raw, leagueId) {
    if (!raw || !raw.events || !Array.isArray(raw.events)) return [];

    const leagueMeta = raw.leagues && raw.leagues[0] ? raw.leagues[0] : null;
    const compConfig = ApiConfig.getCompetitionById(leagueId);

    return raw.events.map(ev => {
      const competition = ev.competitions && ev.competitions[0] ? ev.competitions[0] : {};
      const competitors = competition.competitors || [];

      const homeComp = competitors.find(c => c.homeAway === 'home') || competitors[0] || {};
      const awayComp = competitors.find(c => c.homeAway === 'away') || competitors[1] || {};

      const homeScore = homeComp.score !== undefined ? homeComp.score : '-';
      const awayScore = awayComp.score !== undefined ? awayComp.score : '-';

      const status = Utils.parseMatchStatus(competition.status || ev.status, ev.date);

      return {
        id: ev.id,
        leagueId: leagueId,
        date: ev.date,
        name: ev.name,
        competitionId: leagueId,
        competitionName: leagueMeta?.name || compConfig.name,
        competitionLogo: leagueMeta?.logos?.[0]?.href || compConfig.logo,
        venue: competition.venue?.fullName || '',
        homeTeam: {
          id: homeComp.id || homeComp.team?.id,
          name: homeComp.team?.name || 'Home Team',
          displayName: homeComp.team?.displayName || homeComp.team?.name || 'Home Team',
          abbreviation: homeComp.team?.abbreviation || 'HOM',
          score: homeScore,
          logo: homeComp.team?.logos?.[0]?.href || homeComp.team?.logo || Utils.getTeamLogoFallback(homeComp.team?.name),
          color: homeComp.team?.color ? `#${homeComp.team.color}` : '#00D26A'
        },
        awayTeam: {
          id: awayComp.id || awayComp.team?.id,
          name: awayComp.team?.name || 'Away Team',
          displayName: awayComp.team?.displayName || awayComp.team?.name || 'Away Team',
          abbreviation: awayComp.team?.abbreviation || 'AWY',
          score: awayScore,
          logo: awayComp.team?.logos?.[0]?.href || awayComp.team?.logo || Utils.getTeamLogoFallback(awayComp.team?.name),
          color: awayComp.team?.color ? `#${awayComp.team.color}` : '#A0AAA4'
        },
        status: status,
        broadcast: competition.broadcasts?.[0]?.names?.join(', ') || ''
      };
    });
  },

  /**
   * Normalizes match summary details into clean event, lineup, and stat models
   */
  _normalizeMatchSummary(raw, leagueId, eventId) {
    if (!raw) return null;

    const compConfig = ApiConfig.getCompetitionById(leagueId);
    const header = raw.header || {};
    const compHeader = header.competitions?.[0] || {};
    const competitors = compHeader.competitors || [];

    const homeComp = competitors.find(c => c.homeAway === 'home') || competitors[0] || {};
    const awayComp = competitors.find(c => c.homeAway === 'away') || competitors[1] || {};

    const status = Utils.parseMatchStatus(compHeader.status || header.status, compHeader.date);

    // 1. General match info
    const matchInfo = {
      id: eventId,
      leagueId: leagueId,
      date: compHeader.date,
      competitionName: compConfig.displayName,
      competitionLogo: compConfig.logo,
      venue: raw.gameInfo?.venue?.fullName || 'Stadium',
      venueCity: raw.gameInfo?.venue?.address?.city || '',
      officials: raw.gameInfo?.officials?.map(o => o.displayName).filter(Boolean).join(', ') || 'Official',
      broadcasts: raw.broadcasts?.map(b => b.names?.join(', ')).filter(Boolean).join(', ') || '',
      attendance: raw.gameInfo?.attendance || null,
      status: status,
      homeTeam: {
        id: homeComp.id || homeComp.team?.id,
        name: homeComp.team?.name || 'Home Team',
        displayName: homeComp.team?.displayName || 'Home Team',
        score: homeComp.score ?? '-',
        logo: homeComp.team?.logos?.[0]?.href || homeComp.team?.logo || Utils.getTeamLogoFallback(homeComp.team?.name),
        form: homeComp.form || ''
      },
      awayTeam: {
        id: awayComp.id || awayComp.team?.id,
        name: awayComp.team?.name || 'Away Team',
        displayName: awayComp.team?.displayName || 'Away Team',
        score: awayComp.score ?? '-',
        logo: awayComp.team?.logos?.[0]?.href || awayComp.team?.logo || Utils.getTeamLogoFallback(awayComp.team?.name),
        form: awayComp.form || ''
      }
    };

    // 2. Events timeline
    const events = [];
    if (Array.isArray(raw.keyEvents)) {
      raw.keyEvents.forEach(ke => {
        const typeText = ke.type?.text || '';
        const text = ke.text || '';
        const clock = ke.clock?.displayValue || '';
        const teamId = ke.team?.id;

        // Determine event type
        let eventType = 'other';
        if (/goal/i.test(typeText) || /scores/i.test(text)) {
          eventType = 'goal';
          if (/penalty/i.test(text)) eventType = 'penalty-goal';
          if (/own goal/i.test(text)) eventType = 'own-goal';
        } else if (/yellow/i.test(typeText) || /yellow card/i.test(text)) {
          eventType = 'yellow-card';
        } else if (/red/i.test(typeText) || /red card/i.test(text)) {
          eventType = 'red-card';
        } else if (/substitution/i.test(typeText) || /substitut/i.test(text)) {
          eventType = 'substitution';
        } else if (/var/i.test(typeText) || /var/i.test(text)) {
          eventType = 'var';
        }

        events.push({
          id: ke.id || `${clock}-${eventType}-${Math.random()}`,
          minute: clock,
          type: eventType,
          typeLabel: typeText || eventType,
          text: text,
          teamId: teamId,
          isHome: String(teamId) === String(homeComp.id || homeComp.team?.id),
          player: ke.participants?.[0]?.athlete?.displayName || '',
          assist: ke.participants?.[1]?.athlete?.displayName || '',
          substitutedFor: ke.participants?.[1]?.athlete?.displayName || ''
        });
      });
    }

    // 3. Lineups & Rosters
    const rosters = raw.rosters || [];
    const homeRoster = rosters.find(r => String(r.team?.id) === String(homeComp.id || homeComp.team?.id)) || rosters[0] || {};
    const awayRoster = rosters.find(r => String(r.team?.id) === String(awayComp.id || awayComp.team?.id)) || rosters[1] || {};

    const parseRosterPlayers = (rosterObj) => {
      const rosterList = rosterObj.roster || [];
      const starters = [];
      const substitutes = [];

      rosterList.forEach(p => {
        const athlete = p.athlete || {};
        const playerItem = {
          id: athlete.id || '',
          name: athlete.displayName || athlete.shortName || 'Player',
          jersey: p.jersey || athlete.jersey || '-',
          position: p.position?.displayName || p.position?.name || athlete.position?.name || 'Position',
          starter: Boolean(p.starter),
          subbedIn: Boolean(p.subbedIn),
          subbedOut: Boolean(p.subbedOut),
          photo: athlete.headshot?.href || athlete.photoUrl || Utils.getPlayerAvatarFallback(athlete.displayName)
        };

        if (p.starter) {
          starters.push(playerItem);
        } else {
          substitutes.push(playerItem);
        }
      });

      return {
        formation: rosterObj.formation || '4-3-3',
        coach: rosterObj.coach?.[0]?.displayName || rosterObj.coach?.name || null,
        starters: starters,
        substitutes: substitutes
      };
    };

    const lineups = {
      isOfficial: rosters.length > 0 && rosters[0].roster?.length > 0,
      home: parseRosterPlayers(homeRoster),
      away: parseRosterPlayers(awayRoster)
    };

    // 4. Statistics
    const boxscoreTeams = raw.boxscore?.teams || [];
    const homeBox = boxscoreTeams.find(t => String(t.team?.id) === String(homeComp.id || homeComp.team?.id)) || boxscoreTeams[0] || {};
    const awayBox = boxscoreTeams.find(t => String(t.team?.id) === String(awayComp.id || awayComp.team?.id)) || boxscoreTeams[1] || {};

    const extractStatsMap = (statsArr) => {
      const map = {};
      if (Array.isArray(statsArr)) {
        statsArr.forEach(s => {
          map[s.name] = s.displayValue ?? s.value;
        });
      }
      return map;
    };

    const homeStats = extractStatsMap(homeBox.statistics);
    const awayStats = extractStatsMap(awayBox.statistics);

    // Compute or format values
    const getStat = (homeVal, awayVal, isPercentage = false) => {
      const hStr = homeVal !== undefined && homeVal !== null ? String(homeVal) : 'Not Available';
      const aStr = awayVal !== undefined && awayVal !== null ? String(awayVal) : 'Not Available';

      let hNum = parseFloat(hStr);
      let aNum = parseFloat(aStr);

      if (isNaN(hNum)) hNum = 0;
      if (isNaN(aNum)) aNum = 0;

      let homePct = 50;
      let awayPct = 50;
      const total = hNum + aNum;

      if (total > 0) {
        homePct = Math.round((hNum / total) * 100);
        awayPct = 100 - homePct;
      }

      return {
        homeDisplay: hStr !== 'Not Available' ? (isPercentage ? `${hStr}%` : hStr) : 'Not Available',
        awayDisplay: aStr !== 'Not Available' ? (isPercentage ? `${aStr}%` : aStr) : 'Not Available',
        homeVal: hNum,
        awayVal: aNum,
        homePct: homePct,
        awayPct: awayPct,
        available: hStr !== 'Not Available' || aStr !== 'Not Available'
      };
    };

    const statistics = {
      possession: getStat(homeStats.possessionPct, awayStats.possessionPct, true),
      totalShots: getStat(homeStats.totalShots, awayStats.totalShots),
      shotsOnTarget: getStat(homeStats.shotsOnTarget, awayStats.shotsOnTarget),
      shotsOffTarget: getStat(
        homeStats.totalShots && homeStats.shotsOnTarget ? (parseFloat(homeStats.totalShots) - parseFloat(homeStats.shotsOnTarget)) : null,
        awayStats.totalShots && awayStats.shotsOnTarget ? (parseFloat(awayStats.totalShots) - parseFloat(awayStats.shotsOnTarget)) : null
      ),
      expectedGoals: getStat(homeStats.expectedGoals || homeStats.xg, awayStats.expectedGoals || awayStats.xg),
      totalPasses: getStat(homeStats.totalPasses, awayStats.totalPasses),
      passAccuracy: getStat(
        homeStats.passPct ? (parseFloat(homeStats.passPct) > 1 ? homeStats.passPct : Math.round(parseFloat(homeStats.passPct) * 100)) : null,
        awayStats.passPct ? (parseFloat(awayStats.passPct) > 1 ? awayStats.passPct : Math.round(parseFloat(awayStats.passPct) * 100)) : null,
        true
      ),
      fouls: getStat(homeStats.foulsCommitted, awayStats.foulsCommitted),
      yellowCards: getStat(homeStats.yellowCards, awayStats.yellowCards),
      redCards: getStat(homeStats.redCards, awayStats.redCards),
      cornerKicks: getStat(homeStats.wonCorners, awayStats.wonCorners),
      offsides: getStat(homeStats.offsides, awayStats.offsides),
      totalAttacks: getStat(homeStats.totalAttacks, awayStats.totalAttacks),
      dangerousAttacks: getStat(homeStats.dangerousAttacks, awayStats.dangerousAttacks),
      saves: getStat(homeStats.saves, awayStats.saves),
      tackles: getStat(homeStats.totalTackles, awayStats.totalTackles)
    };

    return {
      header: matchInfo,
      events: events,
      lineups: lineups,
      statistics: statistics
    };
  },

  /**
   * Normalizes raw ESPN standings into clean table models
   */
  _normalizeStandings(raw, leagueId) {
    if (!raw) return null;

    const compConfig = ApiConfig.getCompetitionById(leagueId);
    const children = raw.children?.[0] || raw;
    const entries = children.standings?.entries || raw.entries || [];

    const table = entries.map(entry => {
      const statsMap = {};
      if (Array.isArray(entry.stats)) {
        entry.stats.forEach(s => {
          statsMap[s.name] = s.displayValue ?? s.value;
        });
      }

      const team = entry.team || {};

      return {
        rank: parseInt(statsMap.rank || entry.rank || 0, 10),
        team: {
          id: team.id,
          name: team.displayName || team.name || 'Team',
          abbreviation: team.abbreviation || '',
          logo: team.logos?.[0]?.href || Utils.getTeamLogoFallback(team.displayName)
        },
        played: parseInt(statsMap.gamesPlayed || 0, 10),
        won: parseInt(statsMap.wins || 0, 10),
        drawn: parseInt(statsMap.ties || 0, 10),
        lost: parseInt(statsMap.losses || 0, 10),
        goalsFor: parseInt(statsMap.pointsFor || 0, 10),
        goalsAgainst: parseInt(statsMap.pointsAgainst || 0, 10),
        goalDifference: statsMap.pointDifferential || '0',
        points: parseInt(statsMap.points || 0, 10)
      };
    });

    // Sort by rank
    table.sort((a, b) => a.rank - b.rank);

    let seasonDisplay = compConfig.currentSeason;
    if (raw.season) {
      if (typeof raw.season === 'object') {
        seasonDisplay = raw.season.displayName || (raw.season.year ? `${raw.season.year}/${raw.season.year + 1}` : compConfig.currentSeason);
      } else {
        seasonDisplay = String(raw.season);
      }
    }

    return {
      competitionId: leagueId,
      competitionName: raw.name || compConfig.displayName,
      season: seasonDisplay,
      table: table
    };
  }
};

window.ApiService = ApiService;
