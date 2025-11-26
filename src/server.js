import 'dotenv/config';
import express from 'express';
import { middleware } from '@line/bot-sdk';
import messageHandler from './handlers/messageHandler.js';
import analytics from './utils/analytics.js';

const app = express();
const port = process.env.PORT || 3000;

// LINE bot configuration
const lineConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

// Validate configuration
if (!lineConfig.channelAccessToken || lineConfig.channelAccessToken === 'your_channel_access_token_here') {
    console.warn('⚠️  WARNING: LINE_CHANNEL_ACCESS_TOKEN not configured in .env file');
    console.warn('   The bot will not work without valid LINE credentials');
}

if (!lineConfig.channelSecret || lineConfig.channelSecret === 'your_channel_secret_here') {
    console.warn('⚠️  WARNING: LINE_CHANNEL_SECRET not configured in .env file');
}

if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not configured in .env file');
    console.warn('   AI responses will not work without a valid API key');
}

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Shippop LINE MCP Bot',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Analytics endpoint
app.get('/analytics', (req, res) => {
    res.json({
        metrics: analytics.getMetrics(),
        savings: analytics.calculateSavings(),
        recentQueries: analytics.getRecentQueries(5)
    });
});

// LINE webhook endpoint
app.post('/webhook', middleware(lineConfig), async (req, res) => {
    try {
        const events = req.body.events;

        console.log(`[Server] Received ${events.length} event(s)`);

        // Process all events
        await Promise.all(events.map(async (event) => {
            console.log(`[Server] Processing event type: ${event.type}`);

            switch (event.type) {
                case 'message':
                    await messageHandler.handleMessage(event);
                    break;

                case 'follow':
                    await messageHandler.handleFollow(event);
                    break;

                case 'postback':
                    await messageHandler.handlePostback(event);
                    break;

                default:
                    console.log(`[Server] Unhandled event type: ${event.type}`);
            }
        }));

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('[Server] Error processing webhook:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[Server] Unhandled error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
});

// Start server
app.listen(port, () => {
    console.log('\n========================================');
    console.log('🚀 Shippop LINE MCP Bot Server');
    console.log('========================================');
    console.log(`Server running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/`);
    console.log(`Analytics: http://localhost:${port}/analytics`);
    console.log(`Webhook endpoint: http://localhost:${port}/webhook`);
    console.log('========================================');
    console.log('\n✅ Server started successfully!\n');

    // Configuration status
    console.log('📋 Configuration Status:');
    console.log(`   LINE Token: ${lineConfig.channelAccessToken && lineConfig.channelAccessToken !== 'your_channel_access_token_here' ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   LINE Secret: ${lineConfig.channelSecret && lineConfig.channelSecret !== 'your_channel_secret_here' ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   OpenAI API: ${process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' ? '✅ Configured' : '❌ Not configured'}`);
    console.log('\n💡 Tip: Use ngrok to expose your local server to LINE:');
    console.log(`   ngrok http ${port}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n[Server] SIGTERM signal received: closing HTTP server');
    analytics.printSummary();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n[Server] SIGINT signal received: closing HTTP server');
    analytics.printSummary();
    process.exit(0);
});
