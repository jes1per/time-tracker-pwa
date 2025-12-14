/* =========================================
   TIMER CLASS
   Uses "Delta Time" logic (Date.now) for accuracy.
   ========================================= */

export default class Timer {
    constructor(onTick) {
        this.startTime = 0;
        this.accumulatedTime = 0; // Time banked from previous sessions
        this.isRunning = false;
        this.intervalId = null;
        this.onTick = onTick; // Callback to update UI
    }

    // --- CORE CONTROLS ---

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.startTime = Date.now();
        
        // Update UI every second
        this.intervalId = setInterval(() => {
            const currentTime = this.getElapsedTime();
            this.onTick(currentTime);
        }, 1000);
    }

    pause() {
        if (!this.isRunning) return;

        this.isRunning = false;
        clearInterval(this.intervalId);
        
        // Bank the elapsed time from this specific run
        const sessionDuration = Date.now() - this.startTime;
        this.accumulatedTime += sessionDuration;
    }

    stop() {
        this.pause(); 
        
        // Reset state
        this.accumulatedTime = 0;
        this.startTime = 0;
        
        // Clear UI
        this.onTick(0);
    }

    // --- CALCULATION LOGIC ---

    getElapsedTime() {
        if (!this.isRunning) {
            return this.accumulatedTime;
        }
        // Formula: Banked Time + (Current Time - Start Time)
        return this.accumulatedTime + (Date.now() - this.startTime);
    }

    // --- STATE PERSISTENCE ---

    getState() {
        return {
            isRunning: this.isRunning,
            startTime: this.startTime,
            accumulatedTime: this.accumulatedTime,
            lastUpdated: Date.now()
        };
    }

    loadState(state) {
        this.isRunning = state.isRunning;
        this.startTime = state.startTime;
        this.accumulatedTime = state.accumulatedTime;
        
        // If restoring a running timer, restart the loop immediately
        if (this.isRunning) {
            this.intervalId = setInterval(() => {
                const currentTime = this.getElapsedTime();
                this.onTick(currentTime);
            }, 1000);
        }
    }
}