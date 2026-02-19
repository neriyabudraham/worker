require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const webhookRoutes = require('./routes/webhook');
const botsRoutes = require('./routes/bots');
const blockedRoutes = require('./routes/blocked');
const whitelistRoutes = require('./routes/whitelist');
const livechatRoutes = require('./routes/livechat');
const n8nRoutes = require('./routes/n8n');

const app = express();
const PORT = process.env.PORT || 3380;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
