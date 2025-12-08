# ⏱️ TimeTracker PWA

A minimalist, offline-first Progressive Web App (PWA) for tracking time without distractions. Built with privacy and battery life in mind.

## 🚀 Features

### Core Functionality
- **Precision Timer**: Uses "Delta Time" logic to prevent drift, ensuring accurate tracking even if the browser is throttled.
- **Crash Recovery**: Automatically saves the running timer state to `localStorage`. If you accidentally refresh or close the browser, your timer picks up exactly where it left off.
- **Task Management**: Categorize tasks (Work, Study, Break) and add custom descriptions.

### Data & History
- **Offline Storage**: All completed sessions are stored locally in **IndexedDB**. Your data never leaves your device.
- **History View**: View your recent 3 tasks on the dashboard, or switch to the "All Tasks" view for a complete scrollable history.
- **Editing**: Click any history card to edit the task name/category or delete the session.

### Data Portability
- **Export**: Download your data as **CSV** (for Excel/Numbers) or **JSON** (for backup).
- **Import**: Restore your history from a JSON backup file.
- **Smart Deduplication**: The import system automatically detects and skips duplicate sessions.

### PWA & Mobile
- **Installable**: Can be installed on Android/iOS home screens via `manifest.json`.
- **Offline-First**: Uses a Service Worker with a "Network First, Fallback to Cache" strategy. Works perfectly without an internet connection.
- **Responsive Design**: Mobile-first interface that adapts to desktop screens (max-width 600px).

## 🛠️ Technical Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+).
- **Storage**: IndexedDB (via a Promise-based wrapper), LocalStorage.
- **Styling**: CSS Variables for easy theming, Flexbox for layout.
- **No Dependencies**: Zero external libraries or frameworks.

## 📦 How to Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/time-tracker-pwa.git
   ```
2. Open the folder in **VS Code**.
3. Install the "Live Server" extension (if not installed).
4. Click **"Go Live"** in the bottom right corner.

## 🌐 Deployment

This project is optimized for **GitHub Pages**:

1. Push the code to a GitHub repository.
2. Go to **Settings** -> **Pages**.
3. Select the `main` branch and save.
4. Your app will be live at `https://your-username.github.io/time-tracker-pwa/`.

## 📱 How to Install on Mobile

1. Open the hosted link on your mobile browser (Chrome/Safari).
2. **Android**: Tap the "Add to Home Screen" banner or select "Install App" from the browser menu.
3. **iOS**: Tap the "Share" button -> "Add to Home Screen".

## 📄 License

This project is open source and available under the [MIT License](LICENSE).