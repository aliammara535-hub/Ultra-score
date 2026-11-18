/**
 * Ultra Score / Football World - API Configuration
 * Defines supported competitions, endpoints, polling intervals, and data source mappings.
 */

const ApiConfig = {
  // Base endpoint for high-fidelity live football data
  BASE_URL: 'https://site.api.espn.com/apis/site/v2/sports/soccer',
  STANDINGS_BASE_URL: 'https://site.api.espn.com/apis/v2/sports/soccer',

  // Update intervals (in ms)
  INTERVALS: {
    LIVE_POLL: 30000,          // 30 seconds for live match updates
    FIXTURES_POLL: 180000,     // 3 minutes for general fixtures
    STANDINGS_POLL: 600000     // 10 minutes for standings
  },

  // Supported Competitions (European Top 5, Continental, International & Domestic)
  COMPETITIONS: [
    // European Top Five Leagues
    {
      id: 'eng.1',
      name: 'Premier League',
      displayName: 'English Premier League',
      country: 'England',
      category: 'top-five',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png',
      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      currentSeason: '2026/2027',
      teamsCount: 20
    },
    {
      id: 'esp.1',
      name: 'La Liga',
      displayName: 'Spanish La Liga',
      country: 'Spain',
      category: 'top-five',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/15.png',
      flag: '🇪🇸',
      currentSeason: '2026/2027',
      teamsCount: 20
    },
    {
      id: 'ita.1',
      name: 'Serie A',
      displayName: 'Italian Serie A',
      country: 'Italy',
      category: 'top-five',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/12.png',
      flag: '🇮🇹',
      currentSeason: '2026/2027',
      teamsCount: 20
    },
    {
      id: 'ger.1',
      name: 'Bundesliga',
      displayName: 'German Bundesliga',
      country: 'Germany',
      category: 'top-five',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/10.png',
      flag: '🇩🇪',
      currentSeason: '2026/2027',
      teamsCount: 18
    },
    {
      id: 'fra.1',
      name: 'Ligue 1',
      displayName: 'French Ligue 1',
      country: 'France',
      category: 'top-five',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/9.png',
      flag: '🇫🇷',
      currentSeason: '2026/2027',
      teamsCount: 18
    },

    // Continental Club Tournaments
    {
      id: 'uefa.champions',
      name: 'Champions League',
      displayName: 'UEFA Champions League',
      country: 'Europe',
      category: 'continental',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2.png',
      flag: '🏆',
      currentSeason: '2026/2027',
      teamsCount: 36
    },
    {
      id: 'uefa.europa',
      name: 'Europa League',
      displayName: 'UEFA Europa League',
      country: 'Europe',
      category: 'continental',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2032.png',
      flag: '🥈',
      currentSeason: '2026/2027',
      teamsCount: 36
    },
    {
      id: 'uefa.europa.conf',
      name: 'Conference League',
      displayName: 'UEFA Conference League',
      country: 'Europe',
      category: 'continental',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/2157.png',
      flag: '🥉',
      currentSeason: '2026/2027',
      teamsCount: 36
    },

    // International Tournaments
    {
      id: 'fifa.world',
      name: 'World Cup',
      displayName: 'FIFA World Cup',
      country: 'Global',
      category: 'international',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/4.png',
      flag: '🌍',
      currentSeason: '2026',
      teamsCount: 48
    },
    {
      id: 'uefa.euro',
      name: 'Euro Championship',
      displayName: 'UEFA European Championship',
      country: 'Europe',
      category: 'international',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/3.png',
      flag: '🇪🇺',
      currentSeason: '2028 Qualifiers',
      teamsCount: 24
    },

    // Other Domestic Leagues
    {
      id: 'ned.1',
      name: 'Eredivisie',
      displayName: 'Dutch Eredivisie',
      country: 'Netherlands',
      category: 'other-domestic',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/11.png',
      flag: '🇳🇱',
      currentSeason: '2026/2027',
      teamsCount: 18
    },
    {
      id: 'por.1',
      name: 'Primeira Liga',
      displayName: 'Portuguese Primeira Liga',
      country: 'Portugal',
      category: 'other-domestic',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/14.png',
      flag: '🇵🇹',
      currentSeason: '2026/2027',
      teamsCount: 18
    },
    {
      id: 'usa.1',
      name: 'MLS',
      displayName: 'Major League Soccer',
      country: 'United States',
      category: 'other-domestic',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/19.png',
      flag: '🇺🇸',
      currentSeason: '2026',
      teamsCount: 30
    }
  ],

  /**
   * Helper to find a competition configuration by ID
   */
  getCompetitionById(id) {
    return this.COMPETITIONS.find(c => c.id === id) || {
      id: id || 'eng.1',
      name: 'Football Match',
      displayName: 'Football Competition',
      country: 'Global',
      category: 'other',
      logo: 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png',
      flag: '⚽',
      teamsCount: 20
    };
  },

  /**
   * URL Builders
   */
  getScoreboardUrl(leagueId, dateStr = null) {
    let url = `${this.BASE_URL}/${leagueId}/scoreboard`;
    if (dateStr) {
      url += `?dates=${dateStr}`;
    }
    return url;
  },

  getSummaryUrl(leagueId, eventId) {
    return `${this.BASE_URL}/${leagueId}/summary?event=${eventId}`;
  },

  getStandingsUrl(leagueId) {
    return `${this.STANDINGS_BASE_URL}/${leagueId}/standings`;
  },

  getTeamUrl(leagueId, teamId) {
    return `${this.BASE_URL}/${leagueId}/teams/${teamId}`;
  }
};

window.ApiConfig = ApiConfig;
