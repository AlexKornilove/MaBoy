/**
 * Bot Settings Configuration
 */

export default {
    // Request settings
    request: {
        timeout: 10000,  // 10 seconds
        retries: 3,
        retryDelay: 1000  // 1 second between retries
    },

    // Scheduler settings
    scheduler: {
        // Cron expression for daily notifications (default: 7:00 AM)
        defaultCron: '0 7 * * *',
        // Timezone for scheduler
        timezone: 'Asia/Novosibirsk'
    },

    // Cache settings
    cache: {
        // Groups list cache TTL (24 hours)
        groupsTTL: 24 * 60 * 60 * 1000,
        // Schedule cache TTL (30 minutes)
        scheduleTTL: 30 * 60 * 1000
    },

    // Pagination settings
    pagination: {
        // Groups per page in inline keyboard
        groupsPerPage: 8
    },

    // Message formatting
    messages: {
        maxLength: 4096,  // Telegram message limit
        emoji: {
            calendar: '📅',
            clock: '🕐',
            book: '📚',
            teacher: '👨‍🏫',
            room: '🚪',
            week: '📆',
            bell: '🔔',
            mute: '🔕',
            check: '✅',
            cross: '❌',
            search: '🔍',
            back: '◀️',
            forward: '▶️',
            today: '📌'
        }
    }
};
