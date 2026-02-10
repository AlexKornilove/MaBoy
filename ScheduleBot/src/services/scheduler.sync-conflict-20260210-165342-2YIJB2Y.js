/**
 * Scheduler Service
 * Handles daily notification scheduling using node-cron.
 */

import cron from 'node-cron';
import settings from '../../config/settings.js';
import storage from './storage.js';
import { getScheduleForDay } from '../parsers/schedule.js';
import { formatToday } from '../utils/formatter.js';

let scheduledTask = null;
let botInstance = null;

/**
 * Initialize the scheduler
 * @param {Telegraf} bot - Telegraf bot instance
 */
export function initScheduler(bot) {
    botInstance = bot;

    // Run every minute to check individual user times
    const cronExpression = '* * * * *';

    console.log(`[ScheduleBot] Initializing scheduler (polling every minute)`);

    scheduledTask = cron.schedule(cronExpression, async () => {
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-GB', {
            timeZone: settings.scheduler.timezone,
            hour: '2-digit',
            minute: '2-digit'
        });

        const subscribers = storage.getSubscribedUsers();
        const usersToNotify = subscribers.filter(s => (s.data.notifyTime || '07:00') === currentTime);

        if (usersToNotify.length > 0) {
            console.log(`[ScheduleBot] Found ${usersToNotify.length} users to notify at ${currentTime}`);
            await sendNotifications(usersToNotify);
        }
    }, {
        timezone: settings.scheduler.timezone
    });

    console.log('[ScheduleBot] Scheduler initialized');
}

/**
 * Send notifications to a specific list of users
 * @param {Array} users - List of {userId, data} objects
 */
async function sendNotifications(users) {
    let successCount = 0;
    let failCount = 0;

    for (const { userId, data } of users) {
        try {
            // Get today's schedule
            const { day, currentWeek } = await getScheduleForDay(data.groupId, data.groupCode);

            // Format message
            const message = formatter.formatToday(day, currentWeek, data.groupName || data.groupCode);

            // Send to user
            await botInstance.telegram.sendMessage(userId, message, {
                parse_mode: 'HTML'
            });

            successCount++;
            await sleep(100);
        } catch (error) {
            failCount++;
            console.error(`[ScheduleBot] Failed to send notification to ${userId}:`, error.message);

            if (error.code === 403 || error.description?.includes('blocked')) {
                storage.unsubscribeUser(userId);
            }
        }
    }

    if (users.length > 0) {
        console.log(`[ScheduleBot] Notifications batch sent: ${successCount} success, ${failCount} failed`);
    }
}

/**
 * Send daily notifications to all subscribed users (legacy/manual)
 */
async function sendDailyNotifications() {
    const subscribers = storage.getSubscribedUsers();
    await sendNotifications(subscribers);
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
    if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
        console.log('[ScheduleBot] Scheduler stopped');
    }
}

/**
 * Check if scheduler is running
 * @returns {boolean} True if running
 */
export function isSchedulerRunning() {
    return scheduledTask !== null;
}

/**
 * Manually trigger daily notifications (for testing)
 * @returns {Promise<void>}
 */
export async function triggerNotifications() {
    if (!botInstance) {
        throw new Error('Scheduler not initialized');
    }
    await sendDailyNotifications();
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
    initScheduler,
    stopScheduler,
    isSchedulerRunning,
    triggerNotifications
};
