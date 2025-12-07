import Timer from './timer.js';
import { formatTime } from './utils.js';
import { saveSession, getHistory } from './db.js';
import { exportToCSV, exportToJSON } from './export.js';

const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('btn-start');
const pauseBtn = document.getElementById('btn-pause');
const stopBtn = document.getElementById('btn-stop');
const taskNameInput = document.getElementById('task-name');
const historyList = document.getElementById('history-list');
const exportCsvBtn = document.getElementById('btn-export-csv');
const exportJsonBtn = document.getElementById('btn-export-json');

// --- 1. The Save Function ---
function saveAppState() {
    const state = {
        timer: myTimer.getState(),
        taskName: taskNameInput.value
    };
    localStorage.setItem('timeTrackerState', JSON.stringify(state));
}

// Initialize Timer
const myTimer = new Timer((currentTimeMs) => {
    timerDisplay.textContent = formatTime(currentTimeMs);
    saveAppState();
});

// --- 2. The Load Function ---
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

// --- 3. History Renderer ---
async function renderHistory() {
    try {
        const sessions = await getHistory();
        
        if (!sessions || sessions.length === 0) {
            historyList.innerHTML = '<p style="text-align:center; color:#888;">No sessions yet.</p>';
            return;
        }

        sessions.reverse(); 

        historyList.innerHTML = sessions.map(session => {
            const date = new Date(session.createdAt).toLocaleDateString();
            const timeStr = formatTime(session.duration);
            
            return `
                <div class="history-card">
                    <div class="history-info">
                        <h4>${session.taskName} <span class="tag">${session.category}</span></h4>
                        <p>${date}</p>
                    </div>
                    <div class="history-time">
                        ${timeStr}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error loading history:", error);
    }
}

// --- 4. Event Listeners ---

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
    // A. Check Duration
    const duration = myTimer.getElapsedTime();
    if (duration < 5000) {
        if(!confirm("Task was less than 5 seconds. Discard it?")) {
            // If user says "No, keep it", continue. 
            // If they say "Yes, discard", we proceed to reset below but SKIP saving.
        } else {
             // Reset UI and Logic immediately
            resetUI();
            return; 
        }
    }

    // B. Prepare Data
    const sessionData = {
        taskName: taskNameInput.value || "Untitled Task",
        category: document.getElementById('category-select').value,
        duration: duration,
        startTime: new Date(myTimer.startTime).toISOString(),
        endTime: new Date().toISOString()
    };

    // C. Save to DB
    try {
        await saveSession(sessionData);
        renderHistory(); // Refresh the list
    } catch (error) {
        console.error("Failed to save session:", error);
        alert("Error saving data!");
    }

    // D. Reset UI
    resetUI();
});

exportCsvBtn.addEventListener('click', async () => {
    const sessions = await getHistory(); // Get latest data from DB
    exportToCSV(sessions);
});

exportJsonBtn.addEventListener('click', async () => {
    const sessions = await getHistory();
    exportToJSON(sessions);
});

// Helper to clear the interface
function resetUI() {
    myTimer.stop();
    localStorage.removeItem('timeTrackerState');
    taskNameInput.value = ""; 

    startBtn.hidden = false;
    startBtn.textContent = "Start";
    pauseBtn.hidden = true;
    stopBtn.disabled = true;
    timerDisplay.textContent = "00:00"; // Explicitly reset text
}

// --- 5. Init ---
loadAppState();
renderHistory();