export default class Timer {
    constructor(onTick) {
        this.startTime = 0;
        this.accumulatedTime = 0; // Time stored from previous pauses
        this.isRunning = false;
        this.intervalId = null;
        this.onTick = onTick; // Function to run every second (update UI)
    }

    start() {
        if (this.isRunning) return; // Don't start if already running

        this.isRunning = true;
        this.startTime = Date.now(); // Mark the timestamp NOW
        
        // Update the timer every 1000ms (1 second)
        this.intervalId = setInterval(() => {
            const currentTime = this.getElapsedTime();
            this.onTick(currentTime); // Tell the UI to update
        }, 1000);
    }

    pause() {
        if (!this.isRunning) return;

        this.isRunning = false;
        clearInterval(this.intervalId); // Stop the loop
        
        // Calculate how much time passed in this specific session
        const sessionDuration = Date.now() - this.startTime;
        
        // Add it to our bank
        this.accumulatedTime += sessionDuration;
    }

    stop() {
        this.pause(); // Ensure interval is cleared and time saved
        
        // Reset everything
        this.accumulatedTime = 0;
        this.startTime = 0;
        
        // Update UI one last time to show 00:00
        this.onTick(0);
    }

    // The Magic Formula
    getElapsedTime() {
        if (!this.isRunning) {
            return this.accumulatedTime;
        }
        // If running: Banked Time + (Current Time - Start Time)
        return this.accumulatedTime + (Date.now() - this.startTime);
    }
}