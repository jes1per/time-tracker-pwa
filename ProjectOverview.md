# TimeTracker PWA

## Project Overview
**TimeTracker** is a progressive web app for focused time management. It tracks task durations using precise "delta-time" calculations, handles interruptions via a robust pause system, and ensures data safety even if the browser crashes. It prioritizes battery life and uses native browser features over heavy external libraries.

## Core Features

### 1. Timer & Task Management
- **Drift-Free Focus Timer**: Calculates time based on timestamps (not a tick counter) to ensure accuracy.
- **Resilient Tracking**: 
  - **Pause/Resume**: Accurately tracks active work time separate from wall-clock time.
  - **Crash Recovery**: Automatically restores the running timer state if the page is refreshed or closed accidentally.
- **Overtime Tracking**: Allows sessions to continue past the planned duration.
- **Task Categorization**: Standard (Work, Study, Health, etc.) + Custom categories.

### 2. User Feedback & Notifications
- **Audio Alerts**: Simple "Ding" sound when the timer completes.
- **System Notifications**: Native browser notifications if the user is in another tab when time is up.
- **Screen Wake Lock**: (Optional toggle) Keeps the screen dim but awake on mobile during focus sessions.

### 3. Data Management
- **Long-Term Storage**: `IndexedDB` for completed session history.
- **Current State Storage**: `localStorage` for saving the currently running timer (instant recovery).
- **Export Capabilities**:
  - CSV (Excel-compatible).
  - JSON (Backup).
  - **Native PDF**: Uses CSS Print Styles (Print -> Save as PDF) to avoid complex PDF libraries.
- **Import Function**: Restore data from JSON backups.

### 4. Reporting & Analytics
- **Daily/Weekly/Monthly**: Visual breakdowns of time spent.
- **Visuals**: Simple pie/bar charts showing category distribution.

## Technical Architecture

### Frontend Stack
- **HTML5**: Semantic structure, `<audio>` elements.
- **CSS3**: 
  - CSS Variables for theming (light/dark).
  - **Print Media Queries**: `@media print` for report generation.
- **Vanilla JavaScript**:
  - `localStorage` for state persistence.
  - `IndexedDB` for history.
  - `Notification API` for system alerts.
  - `WakeLock API` for screen management.

### Key Libraries (Simplified)
- **Chart.js**: For visualizing data.
- **Date-fns**: For easy date formatting and math.
- **FileSaver.js**: For downloading the CSV/JSON exports.
- **Workbox**: For easy Service Worker (offline) generation.
- *Removed: jsPDF (Replaced by CSS Print)*

### Data Schema

#### 1. Long-Term History (IndexedDB)
*Stores completed sessions.*
```javascript
{
  id: string, // UUID
  categoryId: string,
  taskName: string,
  startTime: timestamp, // When the session technically started
  endTime: timestamp,   // When the session finished
  
  // CRITICAL: This is the source of truth for reports
  accumulatedTime: number, // Total milliseconds actually worked (excluding pauses)
  
  plannedDuration: number, // Minutes
  status: 'completed' | 'abandoned'
}
```

#### 2. Current State (localStorage)
*Stores the "Active" session. Read this on page load to restore state.*
```javascript
{
  taskId: string,
  categoryId: string,
  taskName: string,
  
  startTime: timestamp,       // When this specific segment started
  accumulatedTime: number,    // Time banked before the last pause
  
  isRunning: boolean,         // Is the timer ticking right now?
  plannedDuration: number
}
```

#### 3. Categories (IndexedDB)
```javascript
{
  id: string,
  name: string,
  color: string, // Hex code
  icon: string   // Emoji or SVG path
}
```

## Project Structure
```
time-tracker-pwa/
├── index.html              # Main interface
├── manifest.json           # PWA config
├── sw.js                   # Service Worker logic
├── assets/
│   └── alarm.mp3           # End-of-timer sound
├── css/
│   └── style.css           # All styles (Layout, Themes, Print settings)
├── js/
│   ├── app.js              # Entry point, event listeners, state recovery
│   ├── timer.js            # Delta-time logic, pause/resume math
│   ├── db.js               # IndexedDB helpers
│   ├── notifications.js    # Audio and System Notification logic
│   ├── reports.js          # Chart.js rendering
│   └── utils.js            # Formatters (e.g., msToTime string)
└── icons/                  # PWA icons
```

## Development Phases

### Phase 1: The "Rock Solid" Timer (Week 1)
- Implement `timer.js` using the "Delta Time" approach (Current Time - Start Time).
- Implement `localStorage` saving/loading to handle page refreshes.
- Build the basic UI for Start/Stop/Pause.
- Add `Audio` playback logic.

### Phase 2: Data & Categorization (Week 2)
- Set up `IndexedDB`.
- Connect the "Stop" button to save data from the Timer to IndexedDB.
- Build the Category creation UI.
- Implement the JSON/CSV export logic.

### Phase 3: Reporting & PWA (Week 3)
- Integrate `Chart.js`.
- Write `@media print` CSS for generating PDF reports.
- Configure `manifest.json` and `sw.js` (Workbox) for offline support.
- Final UI polish (Dark mode toggle).

## Logic Checklist for Novices
*These are specific logic checks to keep in mind while coding:*

1.  **The Pause Trap**: When a user Pauses, calculate `now - startTime` and add it to `accumulatedTime`. When they Resume, reset `startTime` to `now`.
2.  **The Refresh Trap**: On every "tick" of the timer (every second), save the state to `localStorage`. If the user hits F5, `app.js` reads that storage and continues the countdown seamlessly.
3.  **The Drift Trap**: Do not do `timeRemaining--`. Do `timeRemaining = duration - (Date.now() - startTime)`.

## Browser Compatibility
- **Chrome/Edge**: Full support (including Wake Lock).
- **Safari (iOS)**: Good support (Wake Lock might require specific handling or be unavailable, but core features work).
- **Firefox**: Good support.

## Success Metrics (Updated)
- **Crash Recovery**: User can refresh the page and the timer continues without losing a second.
- **Accuracy**: Timer matches the wall-clock exactly, even after 1 hour.
- **Report Generation**: Native print dialog opens instantly.
- **Battery**: Low impact (screen dimming managed via system).