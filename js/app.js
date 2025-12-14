import Timer from './timer.js';
import Notifier from './notifications.js';
import { formatTime } from './utils.js';
import { saveSession, getHistory, importSessions, requestPersistentStorage, updateSession, deleteSession } from './db.js';
import { exportToCSV, exportToJSON } from './export.js';

/* ========================================= 1. GLOBAL STATE & INIT ========================================= */
const notifier = new Notifier();
const myTimer = new Timer(handleTimerTick); // Pass the tick function directly

// State Variables
let currentEditingSession = null;
let hasTriggeredAlert = false;
let currentLimitMs = 0;

/* ========================================= 2. DOM ELEMENTS (Grouped by View) ========================================= */

// Views & Containers
const dashboardView = document.getElementById('dashboard-view');
const historyView = document.getElementById('history-view');
const editView = document.getElementById('edit-view');
const settingsView = document.getElementById('settings-view');
const recentList = document.getElementById('recent-history-list');
const fullList = document.getElementById('full-history-list');

// Header & Global Navigation
const quickSaveBtn = document.getElementById('btn-quick-save');
const settingsBtn = document.getElementById('btn-settings');
const backBtn = document.getElementById('btn-back-to-dashboard');
const backSettingsBtn = document.getElementById('btn-back-from-settings');

// Dashboard Elements
const timerDisplay = document.getElementById('timer-display');
const taskNameInput = document.getElementById('task-name');
const categorySelect = document.getElementById('category-select');
const startBtn = document.getElementById('btn-start');
const pauseBtn = document.getElementById('btn-pause');
const stopBtn = document.getElementById('btn-stop');

// Edit View Elements
const editTaskName = document.getElementById('edit-task-name');
const editCategory = document.getElementById('edit-category-select');
const editDisplayTime = document.getElementById('edit-display-time');
const editDisplayDate = document.getElementById('edit-display-date');
const btnBackEdit = document.getElementById('btn-back-from-edit');
const btnSaveEdit = document.getElementById('btn-save-edit');
const btnDeleteSession = document.getElementById('btn-delete-session');

// Settings Elements
const limitWorkInput = document.getElementById('limit-work');
const limitStudyInput = document.getElementById('limit-study');
const limitBreakInput = document.getElementById('limit-break');
const notifyBtn = document.getElementById('btn-req-notify');
const fileInput = document.getElementById('file-import');

// Data Toolbar (History View)
const exportCsvBtn = document.getElementById('btn-export-csv');
const exportJsonBtn = document.getElementById('btn-export-json');


/* ========================================= 3. CORE LOGIC (Timer, Limits, Persistence) ========================================= */

// Timer Tick Handler (Runs every second)
function handleTimerTick(currentTimeMs) {
    timerDisplay.textContent = formatTime(currentTimeMs);
    
    // Check Alerts
    if (currentLimitMs > 0 && !hasTriggeredAlert && currentTimeMs >= currentLimitMs) {
        notifier.playAlert("Time's Up!", "You reached your time limit.");
        hasTriggeredAlert = true;
    }
    
    saveAppState();
}

// Calculate limit based on category
function updateCurrentLimit() {
    const category = categorySelect.value;
    const savedLimits = localStorage.getItem('categoryLimits');
    const limits = savedLimits ? JSON.parse(savedLimits) : { work: 0, study: 0, break: 0 };
    
    const limitMinutes = limits[category] || 0;
    currentLimitMs = limitMinutes * 60 * 1000; 
}

// Persistence: Save current running state
function saveAppState() {
    const state = {
        timer: myTimer.getState(),
        taskName: taskNameInput.value
    };
    localStorage.setItem('timeTrackerState', JSON.stringify(state));
}

// Persistence: Restore state on reload
function loadAppState() {
    const savedJSON = localStorage.getItem('timeTrackerState');
    if (!savedJSON) return;

    const state = JSON.parse(savedJSON);

    if (state.taskName) taskNameInput.value = state.taskName;

    if (state.timer) {
        myTimer.loadState(state.timer);
        updateCurrentLimit(); 
        timerDisplay.textContent = formatTime(myTimer.getElapsedTime());

        // Restore Button UI
        if (state.timer.isRunning) {
            startBtn.hidden = true;
            pauseBtn.hidden = false;
            stopBtn.disabled = false;
        } else if (state.timer.accumulatedTime > 0) {
            startBtn.hidden = false;
            startBtn.textContent = "Resume";
            pauseBtn.hidden = true;
            stopBtn.disabled = false;
        }
    }
}

// Reset UI after stopping
function resetUI() {
    myTimer.stop();
    localStorage.removeItem('timeTrackerState');
    taskNameInput.value = ""; 
    
    startBtn.hidden = false;
    startBtn.textContent = "Start";
    pauseBtn.hidden = true;
    stopBtn.disabled = true;
    timerDisplay.textContent = "00:00";
}


/* ========================================= 4. UI RENDERING & NAVIGATION ========================================= */

function switchView(viewName) {
    // Hide all first
    dashboardView.hidden = true;
    historyView.hidden = true;
    editView.hidden = true;
    settingsView.hidden = true;

    // Toggle Header Buttons
    quickSaveBtn.style.display = 'none';
    settingsBtn.style.display = 'none'; 

    if (viewName === 'history') {
        historyView.hidden = false;
        renderFullHistory();
    } else if (viewName === 'edit') {
        editView.hidden = false;
    } else if (viewName === 'settings') {
        settingsView.hidden = false;
    } else {
        // Dashboard
        dashboardView.hidden = false;
        quickSaveBtn.style.display = 'flex';
        settingsBtn.style.display = 'flex';
        renderDashboard();
    }
}

function createSessionCard(session) {
    const date = new Date(session.createdAt).toLocaleDateString();
    const timeStr = formatTime(session.duration);
    const sessionString = encodeURIComponent(JSON.stringify(session));

    return `
        <div class="history-card" onclick="window.openEditSession('${sessionString}')" style="cursor: pointer;">
            <div class="history-info">
                <h4>${session.taskName} <span class="tag">${session.category}</span></h4>
                <p>${date}</p>
            </div>
            <div class="history-time">${timeStr}</div>
        </div>
    `;
}

async function renderDashboard() {
    const sessions = await getHistory();
    if (!sessions || sessions.length === 0) {
        recentList.innerHTML = '<p style="text-align:center; color:#888;">No sessions yet.</p>';
        return;
    }
    
    sessions.reverse();
    const recent = sessions.slice(0, 3);
    const hasMore = sessions.length > 3;

    recentList.innerHTML = recent.map(createSessionCard).join('');

    if (hasMore) {
        // Avoid duplicate buttons
        const oldBtn = document.getElementById('btn-view-history');
        if(oldBtn) oldBtn.remove();

        const btn = document.createElement('button');
        btn.id = 'btn-view-history';
        btn.className = 'btn-small';
        btn.style.width = '100%';
        btn.style.marginTop = '10px';
        btn.textContent = `View All History (${sessions.length})`;
        btn.addEventListener('click', () => switchView('history'));
        
        recentList.parentNode.appendChild(btn);
    }
}

async function renderFullHistory() {
    const sessions = await getHistory();
    if (!sessions || sessions.length === 0) {
        fullList.innerHTML = '<p style="text-align:center; color:#888;">No sessions yet.</p>';
        return;
    }
    sessions.reverse();
    fullList.innerHTML = sessions.map(createSessionCard).join('');
}

// Backup Visual Indicator
function checkBackupStatus() {
    const lastBackup = localStorage.getItem('lastBackupDate');
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (!lastBackup || (now - lastBackup > THREE_DAYS_MS)) {
        quickSaveBtn.classList.add('needs-backup');
    } else {
        quickSaveBtn.classList.remove('needs-backup');
    }
}


/* ========================================= 5. EVENT LISTENERS ========================================= */

// --- Timer Controls ---
startBtn.addEventListener('click', () => {
    updateCurrentLimit();
    myTimer.start();
    saveAppState();
    
    startBtn.hidden = true;
    pauseBtn.hidden = false;
    stopBtn.disabled = false;
});

pauseBtn.addEventListener('click', () => {
    myTimer.pause();
    saveAppState();
    
    startBtn.hidden = false;
    startBtn.textContent = "Resume";
    pauseBtn.hidden = true;
});

stopBtn.addEventListener('click', async () => {
    const duration = myTimer.getElapsedTime();
    
    // Ignore short accidental clicks (< 5s)
    if (duration < 5000) {
        if(confirm("Task was less than 5 seconds. Discard it?")) {
            resetUI();
            return; 
        }
    }

    const sessionData = {
        taskName: taskNameInput.value || "Untitled Task",
        category: categorySelect.value,
        duration: duration,
        startTime: new Date(myTimer.startTime).toISOString(),
        endTime: new Date().toISOString()
    };

    await saveSession(sessionData);
    renderDashboard();
    resetUI();
});

// --- Navigation ---
backBtn.addEventListener('click', () => switchView('dashboard'));
settingsBtn.addEventListener('click', () => switchView('settings'));
backSettingsBtn.addEventListener('click', () => switchView('dashboard'));
btnBackEdit.addEventListener('click', () => switchView('history'));

// --- Data & Export ---
exportCsvBtn.addEventListener('click', async () => {
    const sessions = await getHistory();
    exportToCSV(sessions);
    checkBackupStatus();
});

exportJsonBtn.addEventListener('click', async () => {
    const sessions = await getHistory();
    exportToJSON(sessions);
    checkBackupStatus();
});

quickSaveBtn.addEventListener('click', async () => {
    const sessions = await getHistory();
    exportToJSON(sessions);
    checkBackupStatus();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const sessions = JSON.parse(event.target.result);
            if (Array.isArray(sessions) && confirm(`Found ${sessions.length} sessions. Import?`)) {
                const result = await importSessions(sessions);
                alert(`Import Complete!\n✅ Added: ${result.added}\n⏭️ Skipped: ${result.skipped}`);
                renderFullHistory(); 
            }
        } catch (error) {
            alert("Import Failed: Invalid JSON");
        }
        fileInput.value = ''; 
    };
    reader.readAsText(file);
});


// --- Editing Logic ---

// Exposed to Window for onclick events
window.openEditSession = (sessionString) => {
    const session = JSON.parse(decodeURIComponent(sessionString));
    currentEditingSession = session; 

    // Populate Form
    editTaskName.value = session.taskName;
    editCategory.value = session.category;
    editDisplayTime.textContent = formatTime(session.duration);
    editDisplayDate.textContent = new Date(session.createdAt).toLocaleString();

    switchView('edit');
};

btnSaveEdit.addEventListener('click', async () => {
    if (!currentEditingSession) return;

    currentEditingSession.taskName = editTaskName.value;
    currentEditingSession.category = editCategory.value;

    try {
        await updateSession(currentEditingSession);
        switchView('history'); 
    } catch (error) {
        alert("Failed to update session");
    }
});

btnDeleteSession.addEventListener('click', async () => {
    if (!currentEditingSession) return;
    if (confirm("Delete this session? This cannot be undone.")) {
        await deleteSession(currentEditingSession.id);
        switchView('history');
    }
});


// --- Settings Logic ---

const defaultLimits = { work: 50, study: 25, break: 5 };

function loadLimits() {
    const saved = localStorage.getItem('categoryLimits');
    const limits = saved ? JSON.parse(saved) : defaultLimits;
    
    limitWorkInput.value = limits.work;
    limitStudyInput.value = limits.study;
    limitBreakInput.value = limits.break;
}

function saveLimits() {
    const limits = {
        work: parseInt(limitWorkInput.value) || 0,
        study: parseInt(limitStudyInput.value) || 0,
        break: parseInt(limitBreakInput.value) || 0
    };
    localStorage.setItem('categoryLimits', JSON.stringify(limits));
}

function updateNotificationButton() {
    if (Notification.permission === 'granted') {
        notifyBtn.textContent = "✅ Notifications Enabled";
        notifyBtn.disabled = true; 
    } else if (Notification.permission === 'denied') {
        notifyBtn.textContent = "❌ Denied (Check Browser Settings)";
        notifyBtn.disabled = true; 
    }
}

// Settings Listeners
[limitWorkInput, limitStudyInput, limitBreakInput].forEach(input => {
    input.addEventListener('change', saveLimits);
});

notifyBtn.addEventListener('click', async () => {
    const result = await notifier.requestPermission();
    if (result === 'granted') {
        notifyBtn.textContent = "✅ Notifications Enabled";
        notifyBtn.disabled = true;
        notifier.playAlert("Test", "This is how alerts will sound.");
    } else {
        alert("Permission Denied");
    }
    updateNotificationButton();
});


/* ========================================= 6. APP INITIALIZATION ========================================= */
loadAppState();
renderDashboard();
requestPersistentStorage();
checkBackupStatus();
loadLimits();
updateNotificationButton();

// PWA Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(console.error);
    });
}