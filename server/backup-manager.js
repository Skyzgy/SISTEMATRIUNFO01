const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const backupDirectory = path.join(__dirname, 'backups');
const dbFilePath = path.join(__dirname, 'database.json'); // Path to your database file

// Ensure the backup directory exists
if (!fs.existsSync(backupDirectory)){ 
    fs.mkdirSync(backupDirectory);
}

// Function to create a backup
function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:]/g, '-');
    const backupFilePath = path.join(backupDirectory, `backup-${timestamp}.json`);
    fs.copyFile(dbFilePath, backupFilePath, (err) => {
        if (err) throw err;
        console.log(`Backup created at ${backupFilePath}`);
    });
}

// Function to restore from the most recent backup
function restoreBackup() {
    fs.readdir(backupDirectory, (err, files) => {
        if (err) throw err;
        const sortedFiles = files.sort();
        const latestBackup = sortedFiles[sortedFiles.length - 1];
        fs.copyFile(path.join(backupDirectory, latestBackup), dbFilePath, (err) => {
            if (err) throw err;
            console.log(`Database restored from backup ${latestBackup}`);
        });
    });
}

// Schedule backups every hour
setInterval(createBackup, 3600000); // 1 hour in milliseconds

// Commands for manual operation of backups
exec('node createBackup();', (err, stdout, stderr) => {
    if (err) {
        console.error(`exec error: ${err}`);
        return;
    }
    console.log(`Backup output: ${stdout}`);
});

exec('node restoreBackup();', (err, stdout, stderr) => {
    if (err) {
        console.error(`exec error: ${err}`);
        return;
    }
    console.log(`Restore output: ${stdout}`);
});
