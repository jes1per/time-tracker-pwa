import Timer from './timer.js';
import { formatTime } from './utils.js';

// DOM Elements
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('btn-start');
const pauseBtn = document.getElementById('btn-pause');
const stopBtn = document.getElementById('btn-stop');

// Initialize Timer
// We pass a function that updates the screen whenever the timer ticks
const myTimer = new Timer((currentTimeMs) => {
    timerDisplay.textContent = formatTime(currentTimeMs);
});

// Event Listeners

startBtn.addEventListener('click', () => {
    myTimer.start();
    
    // Toggle Buttons
    startBtn.hidden = true;
    pauseBtn.hidden = false;
    stopBtn.disabled = false;
});

pauseBtn.addEventListener('click', () => {
    myTimer.pause();
    
    // Toggle Buttons
    startBtn.hidden = false;
    startBtn.textContent = "Resume"; // Change text to be helpful
    pauseBtn.hidden = true;
});

stopBtn.addEventListener('click', () => {
    myTimer.stop();
    
    // Reset Buttons
    startBtn.hidden = false;
    startBtn.textContent = "Start";
    pauseBtn.hidden = true;
    stopBtn.disabled = true; // Optional: disable stop if already stopped
});