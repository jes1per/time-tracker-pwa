import Timer from './timer.js';
import { formatTime } from './utils.js';
import { saveSession, getHistory ,importSessions, requestPersistentStorage, updateSession, deleteSession } from './db.js';
import { exportToCSV, exportToJSON } from './export.js';
import Notifier from './notifications.js';

// --- DOM ELEMENTS ---
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('btn-start');
const pauseBtn = document.getElementById('btn-pause');
const stopBtn = document.getElementById('btn-stop');
const taskNameInput = document.getElementById('task-name');
const editTaskName = document.getElementById('edit-task-name');
const editCategory = document.getElementById('edit-category-select');
const editDisplayTime = document.getElementById('edit-display-time');
const editDisplayDate = document.getElementById('edit-display-date');
const fileInput = document.getElementById('file-import');
const notifier = new Notifier();
const limitWorkInput = document.getElementById('limit-work');
const limitStudyInput = document.getElementById('limit-study');
const limitBreakInput = document.getElementById('limit-break');

// Views
const dashboardView = document.getElementById('dashboard-view');
const historyView = document.getElementById('history-view');
const recentList = document.getElementById('recent-history-list');
const fullList = document.getElementById('full-history-list');
const editView = document.getElementById('edit-view');
const settingsView = document.getElementById('settings-view');

// Buttons
const exportCsvBtn = document.getElementById('btn-export-csv');
const exportJsonBtn = document.getElementById('btn-export-json');
const backBtn = document.getElementById('btn-back-to-dashboard');
const quickSaveBtn = document.getElementById('btn-quick-save');
const btnBackEdit = document.getElementById('btn-back-from-edit');
const btnSaveEdit = document.getElementById('btn-save-edit');
const btnDeleteSession = document.getElementById('btn-delete-session');
const settingsBtn = document.getElementById('btn-settings');
const backSettingsBtn = document.getElementById('btn-back-from-settings');
const notifyBtn = document.getElementById('btn-req-notify');

let currentEditingSession = null;
let hasTriggeredAlert = false;
let currentLimitMs = 0;

function updateCurrentLimit() {
    const category = document.getElementById('category-select').value;
    const savedLimits = localStorage.getItem('categoryLimits');
    const limits = savedLimits ? JSON.parse(savedLimits) : { work: 0, study: 0, break: 0 };
    
    const limitMinutes = limits[category] || 0;
    
    // Convert to milliseconds
    currentLimitMs = limitMinutes * 60 * 1000; 
}

function saveAppState() {
    const state = {
        timer: myTimer.getState(),
        taskName: taskNameInput.value
    };
    localStorage.setItem('timeTrackerState', JSON.stringify(state));
}

const myTimer = new Timer((currentTimeMs) => {
    timerDisplay.textContent = formatTime(currentTimeMs);
    if (currentLimitMs > 0 && !hasTriggeredAlert && currentTimeMs >= currentLimitMs) {
        notifier.playAlert("Time's Up!", "You reached your time limit.");
        hasTriggeredAlert = true;
    }
    saveAppState();
});

function loadAppState() {
    const savedJSON = localStorage.getItem('timeTrackerState');
    if (!savedJSON) return;

    const state = JSON.parse(savedJSON);

    if (state.taskName) taskNameInput.value = state.taskName;

    if (state.timer) {
        myTimer.loadState(state.timer);
        updateCurrentLimit(); 
        timerDisplay.textContent = formatTime(myTimer.getElapsedTime());

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

function createSessionCard(session) {
    const date = new Date(session.createdAt).toLocaleDateString();
    const timeStr = formatTime(session.duration);
    
    // We encode the JSON to make it safe for HTML attributes
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
    const recent = sessions.slice(0, 3); // Only top 3
    const hasMore = sessions.length > 3;

    recentList.innerHTML = recent.map(createSessionCard).join('');

    // Add "View All" button if needed
    if (hasMore) {
        // Remove old button if it exists to avoid duplicates
        const oldBtn = document.getElementById('btn-view-history');
        if(oldBtn) oldBtn.remove();

        const btn = document.createElement('button');
        btn.id = 'btn-view-history';
        btn.className = 'btn-small';
        btn.style.width = '100%';
        btn.style.marginTop = '10px';
        btn.textContent = `View All History (${sessions.length})`;
        
        // CLICK LOGIC: Switch View
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

function switchView(viewName) {
    dashboardView.hidden = true;
    historyView.hidden = true;
    editView.hidden = true;
    settingsView.hidden = true;

    quickSaveBtn.style.display = 'none';
    settingsBtn.style.display = 'none'; // Hide gear in sub-pages

    if (viewName === 'history') {
        historyView.hidden = false;
        renderFullHistory();
    } else if (viewName === 'edit') {
        editView.hidden = false;
    } else if (viewName === 'settings') {
        settingsView.hidden = false;
    } else {
        dashboardView.hidden = false;
        quickSaveBtn.style.display = 'flex';
        settingsBtn.style.display = 'flex';
        renderDashboard();
    }
}
backBtn.addEventListener('click', () => switchView('dashboard'));

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
    if (duration < 5000) {
        if(!confirm("Task was less than 5 seconds. Discard it?")) {
            // Keep
        } else {
            resetUI();
            return; 
        }
    }

    const sessionData = {
        taskName: taskNameInput.value || "Untitled Task",
        category: document.getElementById('category-select').value,
        duration: duration,
        startTime: new Date(myTimer.startTime).toISOString(),
        endTime: new Date().toISOString()
    };

    await saveSession(sessionData);
    renderDashboard();
    resetUI();
});

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

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    // When file is read:
    reader.onload = async (event) => {
        try {
            const json = event.target.result;
            const sessions = JSON.parse(json);

            if (!Array.isArray(sessions)) {
                throw new Error("Invalid file format");
            }

            if (confirm(`Found ${sessions.length} sessions in file. Proceed with import?`)) {
                    const result = await importSessions(sessions);
                    alert(`Import Complete!\n✅ Added: ${result.added}\n⏭️ Skipped (Duplicates): ${result.skipped}`);
                    renderFullHistory(); 
                }
        } catch (error) {
            console.error(error);
            alert("Failed to import. Make sure the file is a valid JSON backup.");
        }
        
        // Clear input so we can select the same file again if needed
        fileInput.value = ''; 
    };

    reader.readAsText(file);
});

quickSaveBtn.addEventListener('click', async () => {
    const sessions = await getHistory();
    exportToJSON(sessions);
    checkBackupStatus();
});

settingsBtn.addEventListener('click', () => switchView('settings'));
backSettingsBtn.addEventListener('click', () => switchView('dashboard'));

// --- Backup Reminder Logic ---
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

// --- EDITING LOGIC ---
window.openEditSession = (sessionString) => {
    const session = JSON.parse(decodeURIComponent(sessionString));
    currentEditingSession = session; // Store it globally

    // Fill the form
    editTaskName.value = session.taskName;
    editCategory.value = session.category;
    editDisplayTime.textContent = formatTime(session.duration);
    editDisplayDate.textContent = new Date(session.createdAt).toLocaleString();

    switchView('edit');
};

btnSaveEdit.addEventListener('click', async () => {
    if (!currentEditingSession) return;

    // Update object values
    currentEditingSession.taskName = editTaskName.value;
    currentEditingSession.category = editCategory.value;

    try {
        await updateSession(currentEditingSession);
        // Go back to the list
        switchView('history'); 
    } catch (error) {
        console.error(error);
        alert("Failed to update session");
    }
});

btnDeleteSession.addEventListener('click', async () => {
    if (!currentEditingSession) return;

    if (confirm("Are you sure you want to delete this session? This cannot be undone.")) {
        try {
            await deleteSession(currentEditingSession.id);
            // Go back
            switchView('history');
        } catch (error) {
            console.error(error);
            alert("Failed to delete session");
        }
    }
});

btnBackEdit.addEventListener('click', () => {
    switchView('history');
});

// --- ALERT SETTINGS LOGIC ---

// 1. Default Settings
const defaultLimits = { work: 50, study: 25, break: 5 };

// 2. Load Limits from LocalStorage
function loadLimits() {
    const saved = localStorage.getItem('categoryLimits');
    const limits = saved ? JSON.parse(saved) : defaultLimits;
    
    limitWorkInput.value = limits.work;
    limitStudyInput.value = limits.study;
    limitBreakInput.value = limits.break;
    
    return limits;
}

// 3. Save Limits whenever they change
function saveLimits() {
    const limits = {
        work: parseInt(limitWorkInput.value) || 0,
        study: parseInt(limitStudyInput.value) || 0,
        break: parseInt(limitBreakInput.value) || 0
    };
    localStorage.setItem('categoryLimits', JSON.stringify(limits));
    return limits;
}

// 4. Update Button UI based on current permission
function updateNotificationButton() {
    if (Notification.permission === 'granted') {
        notifyBtn.textContent = "✅ Notifications Enabled";
        notifyBtn.disabled = true; // No need to ask again
    } else if (Notification.permission === 'denied') {
        notifyBtn.textContent = "❌ Denied (Check Browser Settings)";
        notifyBtn.disabled = true; // Can't ask again via JS, user must fix in settings
    }
}

// Event Listeners for Inputs
[limitWorkInput, limitStudyInput, limitBreakInput].forEach(input => {
    input.addEventListener('change', saveLimits);
});

// Permission Button
notifyBtn.addEventListener('click', async () => {
    const result = await notifier.requestPermission();
    if (result === 'granted') {
        notifyBtn.textContent = "✅ Notifications Enabled";
        notifyBtn.disabled = true;
        notifier.playAlert("Test", "This is how alerts will sound.");
    } else {
        alert("Notifications were denied. Please enable them in browser settings.");
    }
    updateNotificationButton();
});

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

// --- 5. Init ---
loadAppState();
renderDashboard();
requestPersistentStorage();
checkBackupStatus();
loadLimits();
updateNotificationButton();

// --- PWA REGISTRATION ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('ServiceWorker registered with scope:', registration.scope);
            })
            .catch((err) => {
                console.log('ServiceWorker registration failed:', err);
            });
    });
}