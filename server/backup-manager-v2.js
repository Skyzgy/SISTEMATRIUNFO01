const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const express = require('express');
const app = express();
const prisma = new PrismaClient();

const BACKUP_DIR = path.join(__dirname, 'backups');

// Create backups directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)){ 
    fs.mkdirSync(BACKUP_DIR);
}

// Function to perform database backup
const backupDatabase = async () => {
    const backupFilePath = path.join(BACKUP_DIR, `backup-${new Date().toISOString()}.sql`);
    const command = `pg_dump -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -d ${process.env.DB_NAME} -f ${backupFilePath}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error backing up database: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Backup stderr: ${stderr}`);
            return;
        }
        console.log(`Database backed up successfully: ${backupFilePath}`);
    });
};

// Schedule automated backup every day at 2:00 AM
schedule.scheduleJob('0 2 * * *', backupDatabase);

// Endpoint for manual restore
app.post('/restore', async (req, res) => {
    const { backupFile } = req.body;
    const restoreCommand = `psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -d ${process.env.DB_NAME} -f ${path.join(BACKUP_DIR, backupFile)}`;

    exec(restoreCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error restoring database: ${error.message}`);
            return res.status(500).send('Error restoring database');
        }
        if (stderr) {
            console.error(`Restore stderr: ${stderr}`);
            return res.status(500).send('Error restoring database');
        }
        console.log(`Database restored successfully from ${backupFile}`);
        return res.send('Database restored successfully');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
