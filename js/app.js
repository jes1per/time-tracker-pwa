import Timer from './timer.js';
import { formatTime } from './utils.js';
import { saveSession, getHistory ,importSessions, requestPersistentStorage } from './db.js';
import { exportToCSV, exportToJSON } from './export.js';

// --- DOM ELEMENTS ---
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('btn-start');
const pauseBtn = document.getElementById('btn-pause');
const stopBtn = document.getElementById('btn-stop');
const taskNameInput = document.getElementById('task-name');

// Views
const dashboardView = document.getElementById('dashboard-view');
const historyView = document.getElementById('history-view');
const recentList = document.getElementById('recent-history-list'); // Dashboard list
const fullList = document.getElementById('full-history-list');     // Full page list
// const historyList = document.getElementById('history-list');

// Buttons
const exportCsvBtn = document.getElementById('btn-export-csv');
const exportJsonBtn = document.getElementById('btn-export-json');
const importBtn = document.getElementById('btn-import-trigger');
const fileInput = document.getElementById('file-import');
const backBtn = document.getElementById('btn-back-to-dashboard');

function saveAppState() {
    const state = {
        timer: myTimer.getState(),
        taskName: taskNameInput.value
    };
    localStorage.setItem('timeTrackerState', JSON.stringify(state));
}

const myTimer = new Timer((currentTimeMs) => {
    timerDisplay.textContent = formatTime(currentTimeMs);
    saveAppState();
});

function loadAppState() {
    const savedJSON = localStorage.getItem('timeTrackerState');
    if (!savedJSON) return;

    const state = JSON.parse(savedJSON);

    if (state.taskName) taskNameInput.value = state.taskName;

    if (state.timer) {
        myTimer.loadState(state.timer);
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
    return `
        <div class="history-card">
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
    if (viewName === 'history') {
        dashboardView.hidden = true;
        historyView.hidden = false;
        renderFullHistory(); // Refresh list when opening
    } else {
        dashboardView.hidden = false;
        historyView.hidden = true;
        renderDashboard(); // Refresh recent list when going back
    }
}
backBtn.addEventListener('click', () => switchView('dashboard'));

startBtn.addEventListener('click', () => {
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

importBtn.addEventListener('click', () => {
    fileInput.click();
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

// --- Backup Reminder Logic ---
function checkBackupStatus() {
    const lastBackup = localStorage.getItem('lastBackupDate');
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (!lastBackup || (now - lastBackup > THREE_DAYS_MS)) {
        exportJsonBtn.classList.add('needs-backup');
        exportJsonBtn.title = "Backup recommended! (Last backup: Long ago)";
    } else {
        exportJsonBtn.classList.remove('needs-backup');
    }
}

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