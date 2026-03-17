const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Define your routes here...
app.post('/api/req', (req, res) => {
    const quantity = req.body.quantity;
    if (!quantity) {
        return res.status(400).json({ error: 'Quantity is required' });
    }
    // Handle request...
});

app.patch('/api/req/:id/status', (req, res) => {
    const id = req.params.id;
    // Handle status update...
});

app.delete('/api/req/:id', (req, res) => {
    const id = req.params.id;
    // Handle delete...
});

app.delete('/api/abast/:id', (req, res) => {
    const id = req.params.id;
    // Handle delete...
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});