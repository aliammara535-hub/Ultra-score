/**
 * Ultra Score / Football World - Firebase Configuration & Initialization
 * Configures Firebase Realtime Database for real-time synchronization,
 * cached match storage, and live updates.
 */

const FirebaseConfig = {
  // Storage key for user-supplied custom Firebase credentials
  STORAGE_KEY: 'fw_firebase_custom_config',

  // Active Firebase Realtime Database Configuration
  defaultConfig: {
    apiKey: "AIzaSyDKDC82WUs9BIiwmt6KQkfCH1Wsva4XWSQ",
    authDomain: "hemma-quiz.firebaseapp.com",
    databaseURL: "https://hemma-quiz-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "hemma-quiz",
    storageBucket: "hemma-quiz.firebasestorage.app",
    messagingSenderId: "670168517930",
    appId: "1:670168517930:web:62c3128b5b2ef4a98b2253",
    measurementId: "G-9N7QD56XTW"
  },

  app: null,
  database: null,
  isConnected: false,
  isInitialized: false,
  connectionListeners: [],

  /**
   * Get active config (custom from localStorage if valid, else defaultConfig)
   */
  getConfig() {
    try {
      const custom = localStorage.getItem(this.STORAGE_KEY);
      if (custom) {
        const parsed = JSON.parse(custom);
        // Ignore legacy dummy configs
        if (parsed && parsed.projectId && !parsed.projectId.includes('ultra-score-football-world') && !parsed.apiKey?.includes('Dummy')) {
          if (parsed.projectId === 'hemma-quiz' && (!parsed.databaseURL || !parsed.databaseURL.includes('europe-west1'))) {
            parsed.databaseURL = this.defaultConfig.databaseURL;
          }
          return parsed;
        }
      }
    } catch (e) {}
    return this.defaultConfig;
  },

  /**
   * Helper to parse a raw Firebase config object or JS snippet string
   */
  parseConfigInput(input) {
    if (!input) return null;
    if (typeof input === 'object') return input;

    // If user pasted a JavaScript snippet like:
    // const firebaseConfig = { apiKey: "...", databaseURL: "..." };
    try {
      // Try direct JSON first
      return JSON.parse(input);
    } catch (e) {
      // Extract key-value pairs using regex
      const config = {};
      const keys = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
      keys.forEach(k => {
        const regex = new RegExp(`['"]?${k}['"]?\\s*:\\s*['"\`]([^'"\`]+)['"\`]`, 'i');
        const match = input.match(regex);
        if (match && match[1]) {
          config[k] = match[1].trim();
        }
      });

      if (config.apiKey || config.databaseURL || config.projectId) {
        // If databaseURL was missing but projectId exists, construct default RTDB URL
        if (!config.databaseURL && config.projectId) {
          config.databaseURL = `https://${config.projectId}-default-rtdb.firebaseio.com`;
        }
        return config;
      }
    }
    return null;
  },

  /**
   * Save user custom Firebase config
   */
  saveConfig(newConfig) {
    try {
      const parsed = this.parseConfigInput(newConfig);
      if (!parsed) return false;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(parsed));
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Initialize Firebase SDK
   */
  init() {
    if (this.isInitialized && this.database) {
      return this.database;
    }

    if (typeof firebase === 'undefined') {
      console.warn('[Firebase] Firebase SDK not loaded in DOM. Operating in Direct API Cache mode.');
      this._notifyConnection(false, 'SDK not loaded');
      return null;
    }

    try {
      const config = this.getConfig();
      
      // Initialize if not already initialized
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(config);
      } else {
        this.app = firebase.app();
      }

      // Explicitly pass regional databaseURL so regional instances connect correctly
      this.database = config.databaseURL 
        ? this.app.database(config.databaseURL) 
        : this.app.database();
        
      this.isInitialized = true;

      // Monitor connection state via special Firebase .info reference
      const connectedRef = this.database.ref('.info/connected');
      connectedRef.on('value', (snap) => {
        const val = Boolean(snap.val());
        this.isConnected = val;
        this._notifyConnection(val, val ? 'Connected' : 'Standby');
      });

      // Quick active probe to confirm read/write rights immediately
      this.database.ref('football-world/sync_status/last_ping').set({
        timestamp: Date.now(),
        client: 'Web UI',
        status: 'online'
      }).then(() => {
        this.isConnected = true;
        this._notifyConnection(true, 'Connected & Verified');
      }).catch((probeErr) => {
        console.warn('[Firebase] Probe notice:', probeErr.message);
      });

      console.log('[Firebase] Realtime Database initialized successfully with URL:', config.databaseURL);
      return this.database;
    } catch (error) {
      console.warn('[Firebase] Initialization error (safe fallback mode active):', error.message);
      this._notifyConnection(false, error.message);
      return null;
    }
  },

  /**
   * Check if Firebase is active and available
   */
  isReady() {
    return Boolean(this.isInitialized && this.database);
  },

  /**
   * Register listener for connection state changes
   */
  onConnectionChange(callback) {
    if (typeof callback === 'function') {
      this.connectionListeners.push(callback);
      // Immediately notify current state
      callback(this.isConnected, this.isInitialized ? 'Initialized' : 'Standby');
    }
  },

  _notifyConnection(status, details) {
    this.connectionListeners.forEach(cb => {
      try {
        cb(status, details);
      } catch (e) {}
    });
  }
};

window.FirebaseConfig = FirebaseConfig;
