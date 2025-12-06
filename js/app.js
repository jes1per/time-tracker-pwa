console.log("TimeTracker App Initialized!");

// Select elements to ensure we can find them
const startBtn = document.getElementById('btn-start');
const timerDisplay = document.getElementById('timer-display');

// Simple test event
startBtn.addEventListener('click', () => {
    alert("Button clicked! JS is connected.");
});