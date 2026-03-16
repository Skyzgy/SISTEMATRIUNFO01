// Existing code...

// Fixing SyntaxError in /api/req quantity validation string
if (!req.body.quantity || typeof req.body.quantity !== 'string') {
    return res.status(400).send('Invalid quantity');
}

// Removing stray backslash in allowed array in PATCH /api/req/:id/status
app.patch('/api/req/:id/status', (req, res) => {
    const allowedStatuses = ['pending', 'approved', 'rejected'];
    // No stray backslash here
    if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).send('Invalid status');
    }
    // Update logic...
});

// Replacing the mistaken String(x||"{}") defaults back to empty string
const OSCreate = {
    field1: '',  // Change here
    field2: ''   // Change here
};

const reqCreate = {
    field1: '',  // Change here
    field2: ''   // Change here
};

const abastCreate = {
    field1: '',  // Change here
    field2: ''   // Change here
};

// Keeping DELETE routes
app.delete('/api/req/:id', (req, res) => {
    // Logic for DELETE req
});

app.delete('/api/abast/:id', (req, res) => {
    // Logic for DELETE abast
});

// Additional code...