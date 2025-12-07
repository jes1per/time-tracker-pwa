import { formatTime } from './utils.js';

function updateLastBackupDate() {
    localStorage.setItem('lastBackupDate', Date.now());
}

// 1. Convert Data to CSV Format (Excel readable)
function convertToCSV(sessions) {
    // CSV Header
    let csvContent = "Date,Task Name,Category,Duration (Formatted),Duration (Seconds)\n";

    // Add rows
    sessions.forEach(session => {
        const date = new Date(session.createdAt).toLocaleDateString();
        // Escape commas in task names to prevent breaking columns
        const cleanName = session.taskName.replace(/,/g, " "); 
        const durationStr = formatTime(session.duration);
        const durationSec = Math.round(session.duration / 1000);

        csvContent += `${date},${cleanName},${session.category},${durationStr},${durationSec}\n`;
    });

    return csvContent;
}

// 2. The Download Trigger
function downloadFile(content, filename, contentType) {
    // Create a "Blob" (a file-like object in memory)
    const blob = new Blob([content], { type: contentType });
    
    // Create a fake temporary link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Click it programmatically
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 3. Public Export Functions
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
    const json = JSON.stringify(sessions, null, 2); // Pretty print
    const filename = `timetracker_backup_${new Date().toISOString().slice(0,10)}.json`;
    downloadFile(json, filename, 'application/json');

    updateLastBackupDate();
}