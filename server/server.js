const express = require('express');
const prisma = require('@prisma/client');

const app = express();
app.use(express.json());

// POST /api/req
app.post('/api/req', async (req, res) => {
    const { quantidade } = req.body;
    const erros = [];
    if (!quantidade) {
        erros.push("quantidade is required");
    }
    if (erros.length) {
        return res.status(400).json({ erros });
    }
    // proceed with the business logic...
});

// PATCH /api/req/:id/status
app.patch('/api/req/:id/status', async (req, res) => {
    const { id } = req.params;
    // business logic...
    res.sendStatus(204);
});

// POST /api/os
app.post('/api/os', async (req, res) => {
    const { x } = req.body;
    res.json({ value: String(x || '') });
});

// POST /api/req
app.post('/api/req', async (req, res) => {
    const { x } = req.body;
    res.json({ value: String(x || '') });
});

// POST /api/abast
app.post('/api/abast', async (req, res) => {
    const { x } = req.body;
    res.json({ value: String(x || '') });
});

// Server start
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});