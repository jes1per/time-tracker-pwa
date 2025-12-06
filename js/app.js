import Timer from './timer.js';
import { formatTime } from './utils.js';
import { saveSession } from './db.js';

const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('btn-start');
const pauseBtn = document.getElementById('btn-pause');
const stopBtn = document.getElementById('btn-stop');
const taskNameInput = document.getElementById('task-name'); // NEW: Select input

// --- 1. The Save Function ---
// We save the Timer numbers AND the Task Name
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
    saveAppState(); // NEW: Save every second while running
});

// --- 2. The Load Function ---
function loadAppState() {
    const savedJSON = localStorage.getItem('timeTrackerState');
    if (!savedJSON) return; // Nothing saved, start fresh

    const state = JSON.parse(savedJSON);

    // Restore text
    if (state.taskName) taskNameInput.value = state.taskName;

    // Restore Timer Logic
    if (state.timer) {
        myTimer.loadState(state.timer);
        
        // Update display immediately (don't wait 1 second for tick)
        timerDisplay.textContent = formatTime(myTimer.getElapsedTime());

        // Restore UI Buttons
        if (state.timer.isRunning) {
            startBtn.hidden = true;
            pauseBtn.hidden = false;
            stopBtn.disabled = false;
        } else if (state.timer.accumulatedTime > 0) {
            // It was paused
            startBtn.hidden = false;
            startBtn.textContent = "Resume";
            pauseBtn.hidden = true;
            stopBtn.disabled = false;
        }
    }
}

// Event Listeners
stopBtn.addEventListener('click', async () => { // <--- Mark as async
    // 1. Capture data before resetting
    const sessionData = {
        taskName: taskNameInput.value || "Untitled Task",
        category: document.getElementById('category-select').value,
        duration: myTimer.getElapsedTime(), // In milliseconds
        startTime: new Date(myTimer.startTime).toISOString(), // Roughly when started
        endTime: new Date().toISOString()
    };

    // 2. Save to IndexedDB
    try {
        await saveSession(sessionData);
        console.log("Session saved to DB:", sessionData);
    } catch (error) {
        console.error("Failed to save session:", error);
        alert("Error saving data!");
    }

    // 3. Reset Timer (Existing logic)
    myTimer.stop();
    localStorage.removeItem('timeTrackerState');
    taskNameInput.value = ""; 

    startBtn.hidden = false;
    startBtn.textContent = "Start";
    pauseBtn.hidden = true;
    stopBtn.disabled = true;
});

pauseBtn.addEventListener('click', () => {
    myTimer.pause();
    saveAppState(); // NEW: Save state immediately on click

    startBtn.hidden = false;
    startBtn.textContent = "Resume";
    pauseBtn.hidden = true;
});

stopBtn.addEventListener('click', () => {
    myTimer.stop();
    // NEW: Clear storage when stopped (task is done)
    localStorage.removeItem('timeTrackerState');
    taskNameInput.value = ""; 

    startBtn.hidden = false;
    startBtn.textContent = "Start";
    pauseBtn.hidden = true;
    stopBtn.disabled = true;
});

// --- 3. Run Load on Startup ---
loadAppState();