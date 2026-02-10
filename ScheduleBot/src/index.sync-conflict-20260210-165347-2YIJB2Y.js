/**
 * NSPU Schedule Bot - Entry Point
 * 
 * Telegram bot for viewing NSPU class schedules.
 * Data source: https://schedule.nspu.ru
 */

import 'dotenv/config';
import { createBot } from './bot.js';
import { initScheduler, stopScheduler } from './services/scheduler.js';
import storage from './services/storage.js';

// Validate environment
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN || BOT_TOKEN === 'your_bot_token_here') {
    console.error('[ScheduleBot] ERROR: BOT_TOKEN is not set!');
    console.error('[ScheduleBot] Please copy .env.example to .env and set your bot token from @BotFather');
    process.exit(1);
}

// Create bot instance
const bot = createBot(BOT_TOKEN);

// Initialize scheduler for daily notifications
initScheduler(bot);

// Graceful shutdown handling
const shutdown = async (signal) => {
    console.log(`\n[ScheduleBot] Received ${signal}, shutting down...`);
    stopScheduler();
    await bot.stop(signal);
    console.log('[ScheduleBot] Bot stopped');
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start bot
console.log('[ScheduleBot] Starting bot...');
console.log(`[ScheduleBot] Loaded ${storage.getUsersCount()} users from storage`);

bot.launch()
    .then(() => {
        console.log('[ScheduleBot] Bot started successfully!');
        console.log('[ScheduleBot] Press Ctrl+C to stop');
    })
    .catch((error) => {
        console.error('[ScheduleBot] Failed to start bot:', error);
        process.exit(1);
    });
