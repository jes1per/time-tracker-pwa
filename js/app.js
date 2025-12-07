import Timer from './timer.js';
import { formatTime } from './utils.js';
import { saveSession, getHistory ,importSessions } from './db.js';
import { exportToCSV, exportToJSON } from './export.js';

const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('btn-start');
const pauseBtn = document.getElementById('btn-pause');
const stopBtn = document.getElementById('btn-stop');
const taskNameInput = document.getElementById('task-name');
const historyList = document.getElementById('history-list');
const exportCsvBtn = document.getElementById('btn-export-csv');
const exportJsonBtn = document.getElementById('btn-export-json');
const importBtn = document.getElementById('btn-import-trigger');
const fileInput = document.getElementById('file-import');

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

        // 1. Slice the array to get only the first 3 items
        const recentSessions = sessions.slice(0, 3);
        const hasMore = sessions.length > 3;

        // 2. Generate HTML for the top 3
        let html = recentSessions.map(session => {
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

        // 3. Add "View More" button if needed
        if (hasMore) {
            html += `
                <button id="btn-view-history" class="btn-small" style="width:100%; margin-top:10px; background:#f0f0f0;">
                    View All History (${sessions.length})
                </button>
            `;
        }
        
        historyList.innerHTML = html;

        // 4. Attach Event Listener to the new button
        if (hasMore) {
            document.getElementById('btn-view-history').addEventListener('click', () => {
                alert("Full history view is in development!");
            });
        }

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
                    // Capture the result from our new DB logic
                    const result = await importSessions(sessions);
                    
                    // Show detailed feedback
                    alert(`Import Complete!\n✅ Added: ${result.added}\n⏭️ Skipped (Duplicates): ${result.skipped}`);
                    
                    renderHistory(); 
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