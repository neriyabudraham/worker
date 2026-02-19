require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const webhookRoutes = require('./routes/webhook');
const botsRoutes = require('./routes/bots');
const blockedRoutes = require('./routes/blocked');
const whitelistRoutes = require('./routes/whitelist');
const livechatRoutes = require('./routes/livechat');
const n8nRoutes = require('./routes/n8n');
const adminRoutes = require('./routes/admin');
const flowsRoutes = require('./routes/flows');
const whatsappRoutes = require('./routes/whatsapp');

const app = express();
const PORT = process.env.PORT || 3380;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
// Disable morgan logging - use console.log for important events only
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Builder clean URLs
app.get('/builder', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/builder/index.html'));
});
app.get('/builder/editor/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/builder/editor.html'));
});
app.get('/builder/numbers', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/builder/numbers.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/webhook', webhookRoutes);
app.use('/api/bots', botsRoutes);
app.use('/api/blocked', blockedRoutes);
app.use('/api/whitelist', whitelistRoutes);
app.use('/api/livechat', livechatRoutes);
app.use('/api/n8n', n8nRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/flows', flowsRoutes);
app.use('/api/whatsapp', whatsappRoutes);


// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
    console.log(`Bot Router running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
