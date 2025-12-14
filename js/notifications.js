/**
 * Handles Audio Alerts and System Notifications.
 * Uses Web Audio API for offline-compatible, synthesized sounds (no external MP3s required).
 */
export default class Notifier {
    constructor() {
        this.permission = Notification.permission;
        // AudioContext is initialized lazily on user interaction to comply with browser autoplay policies
        this.audioContext = null;
    }

    /**
     * Request browser permission for notifications.
     * Must be triggered by a user gesture (e.g., button click).
     */
    async requestPermission() {
        if (this.permission === 'default') {
            this.permission = await Notification.requestPermission();
        }
        
        // Initialize Audio Engine
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Resume context if browser suspended it (common power-saving behavior)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        return this.permission;
    }

    /**
     * Triggers the "Three-Ring" audio alert and a system notification.
     * @param {string} title - Notification Title
     * @param {string} body - Notification Body text
     */
    playAlert(title, body) {
        // --- 1. AUDIO ALERT (Ring-Ring-Ring) ---
        const delay = 400; // ms between rings
        
        this.playBeep(); // 1st Ring
        
        setTimeout(() => {
            this.playBeep(); // 2nd Ring
        }, delay);
        
        setTimeout(() => {
            this.playBeep(); // 3rd Ring
        }, delay * 2);

        // --- 2. VISUAL NOTIFICATION ---
        if (this.permission === 'granted') {
            // Only show banner if user is NOT looking at the page
            if (document.visibilityState === 'hidden') {
                this.showSystemNotification(title, body);
            }
        }
    }

    /**
     * Internal helper to route notifications through Service Worker (Android) or Standard API (Desktop).
     */
    showSystemNotification(title, body) {
        const options = {
            body: body,
            icon: './icons/icon-192.png',
            vibrate: [200, 100, 200]
        };

        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options);
            });
        } else {
            new Notification(title, options);
        }
    }

    /**
     * Generates a single synthesized "Ding" using a Sine Wave Oscillator.
     */
    playBeep() {
        // Ensure Audio Engine exists
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Wiring: Source (Oscillator) -> Volume (Gain) -> Speakers (Destination)
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Tone Settings
        oscillator.type = 'sine'; // Smooth pure tone
        oscillator.frequency.setValueAtTime(500, ctx.currentTime); // Start at 500Hz
        oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1); // Slide up to 1000Hz (The "Ding" effect)

        // Volume Envelope (Fade Out)
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime); // Start volume 30%
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5); // Fade to silence over 0.5s

        // Play
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.5); 
    }
}