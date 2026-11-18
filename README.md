# Ultra Score – Football World
### Live Football Scores, Chronological Events, Lineups & Statistics Platform

A professional, modern, and fully responsive live football data platform built with vanilla HTML, CSS, JavaScript, and Firebase Realtime Database.

---

## 🌟 Features

- **Live In-Play Matches**: Real-time scores, clock, elapsed time, live pulse badge, and auto-refresh every 30 seconds.
- **Fixtures & Results Explorer**:
  - Today's fixtures, finished matches, and future schedules.
  - Interactive date navigation strip with quick day chips and calendar picker for historical match results.
  - Search by club or competition name.
  - Kickoff times automatically displayed in the user's local timezone.
- **Dedicated Match Center (3 Tabs)**:
  - **Tab 1: Match Details & Timeline**: Chronological events stream with goals, assists, yellow/red cards, substitutions, penalties, and VAR decisions distinguishing home and away teams.
  - **Tab 2: Lineups & Formations**: Starting XI tactically positioned on an authentic SVG grass pitch, official player headshot photographs, jersey numbers, managers, and substitute benches.
  - **Tab 3: Match Statistics**: 16 dual-sided comparison bars with animated fill percentages for possession, total shots, shots on target, xG, passes, fouls, corners, offsides, saves, and tackles.
- **Competitions & Standings**:
  - European Top 5 Leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1), UEFA Champions League, Europa League, Conference League, World Cup, Euro, and domestic leagues.
  - Full league standings table with qualification zones for Champions League, Europa League, and Relegation.
  - Authentic computed league statistics (Best Attacking Clubs, Best Defensive Records, Goal Difference leaders).
- **Firebase Realtime Database Synchronization**:
  - Automatic background synchronization under the `football-world/` tree.
  - Built-in Platform Configuration modal to customize Firebase credentials.

---

## 🎨 Color Palette

- **Deep Black**: `#080B0A`
- **Dark Background**: `#101613`
- **Football Green**: `#00D26A`
- **Secondary Green**: `#087F46`
- **White**: `#FFFFFF`
- **Muted Gray**: `#A0AAA4`

---

## 🚀 Deployment to GitHub Pages

1. Push this repository to GitHub:
   ```bash
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git branch -M main
   git push -u origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** ➔ **Pages**.
   - Under **Build and deployment** ➔ **Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` and folder `/ (root)`.
   - Click **Save**.
3. In 1–2 minutes, your live website will be available at:
   ```
   https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>/
   ```
   You can open this URL on any phone, tablet, or laptop worldwide!
