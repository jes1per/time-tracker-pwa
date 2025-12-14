import { formatTime } from './utils.js';

// ========================================= PRIVATE HELPER FUNCTIONS =========================================

function updateLastBackupDate() {
    localStorage.setItem('lastBackupDate', Date.now());
}

function convertToCSV(sessions) {
    // Header Row
    let csvContent = "Date,Task Name,Category,Duration (Formatted),Duration (Seconds)\n";

    // Data Rows
    sessions.forEach(session => {
        const date = new Date(session.createdAt).toLocaleDateString();
        
        // Sanitize Task Name: Remove commas so they don't break CSV columns
        const cleanName = session.taskName.replace(/,/g, " "); 
        
        const durationStr = formatTime(session.duration);
        const durationSec = Math.round(session.duration / 1000);

        csvContent += `${date},${cleanName},${session.category},${durationStr},${durationSec}\n`;
    });

    return csvContent;
}

function downloadFile(content, filename, contentType) {
    // Create a "Blob" (a file-like object in memory)
    const blob = new Blob([content], { type: contentType });
    
    // Create a temporary URL pointing to that Blob
    const url = URL.createObjectURL(blob);
    
    // Create hidden link and click it
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup memory
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ========================================= PUBLIC EXPORTS =========================================

export function exportToCSV(sessions) {
    if (!sessions || sessions.length === 0) {
        alert("No data to export!");
        return;
    }
    
    const csv = convertToCSV(sessions);
    const filename = `timetracker_backup_${new Date().toISOString().slice(0,10)}.csv`;
    
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
    updateLastBackupDate();
}

export function exportToJSON(sessions) {
    if (!sessions || sessions.length === 0) {
        alert("No data to export!");
        return;
    }
    
    const json = JSON.stringify(sessions, null, 2); // Pretty print with indentation
    const filename = `timetracker_backup_${new Date().toISOString().slice(0,10)}.json`;
    
    downloadFile(json, filename, 'application/json');
    updateLastBackupDate();
}