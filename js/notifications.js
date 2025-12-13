export default class Notifier {
    constructor() {
        this.permission = Notification.permission;
        this.audioContext = null;
    }

    async requestPermission() {
        if (this.permission === 'default') {
            this.permission = await Notification.requestPermission();
        }
        
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        return this.permission;
    }

    playAlert(title, body) {
        const delay = 400;
        this.playBeep();
        setTimeout(() => {
            this.playBeep();
        }, delay);
        setTimeout(() => {
            this.playBeep();
        }, delay * 2);

        if (this.permission === 'granted') {
            if (document.visibilityState === 'hidden') {
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(title, {
                            body: body,
                            icon: './icons/icon-192.png',
                            vibrate: [200, 100, 200]
                        });
                    });
                } else {
                    new Notification(title, {
                        body: body,
                        icon: './icons/icon-192.png'
                    });
                }
            }
        }
    }

    playBeep() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const ctx = this.audioContext;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine'; // Smooth sound
        oscillator.frequency.setValueAtTime(500, ctx.currentTime); // 500Hz (B4 note)
        oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1); // Slide up (Ding!)

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.5); // Stop after 0.5 seconds
    }
}