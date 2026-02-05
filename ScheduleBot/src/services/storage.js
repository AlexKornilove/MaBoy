/**
 * User Storage Service
 * Handles persistent storage of user preferences and subscriptions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '../../data/users.json');

/**
 * User data structure
 * @typedef {Object} UserData
 * @property {string} groupId - Selected group ID
 * @property {string} groupCode - Selected group code
 * @property {string} groupName - Group display name
 * @property {boolean} subscribed - Daily notification subscription
 * @property {string} notifyTime - Notification time (HH:MM)
 * @property {number} lastActive - Last activity timestamp
 */

/**
 * Load all users from storage
 * @returns {Object.<string, UserData>} Users object
 */
function loadUsers() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return {};
        }
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        return parsed.users || {};
    } catch (error) {
        console.error('[ScheduleBot] Error loading users:', error.message);
        return {};
    }
}

/**
 * Save all users to storage
 * @param {Object.<string, UserData>} users - Users object
 */
function saveUsers(users) {
    try {
        // Ensure directory exists
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const data = JSON.stringify({ users }, null, 2);
        fs.writeFileSync(DATA_FILE, data, 'utf-8');
    } catch (error) {
        console.error('[ScheduleBot] Error saving users:', error.message);
    }
}

// In-memory cache
let usersCache = loadUsers();

/**
 * Get user data
 * @param {number|string} userId - Telegram user ID
 * @returns {UserData|null} User data or null
 */
export function getUser(userId) {
    return usersCache[String(userId)] || null;
}

/**
 * Set user data
 * @param {number|string} userId - Telegram user ID
 * @param {Partial<UserData>} data - Data to update
 * @returns {UserData} Updated user data
 */
export function setUser(userId, data) {
    const id = String(userId);
    const existing = usersCache[id] || {};

    usersCache[id] = {
        ...existing,
        ...data,
        lastActive: Date.now()
    };

    saveUsers(usersCache);
    return usersCache[id];
}

/**
 * Delete user data
 * @param {number|string} userId - Telegram user ID
 */
export function deleteUser(userId) {
    delete usersCache[String(userId)];
    saveUsers(usersCache);
}

/**
 * Set user's selected group
 * @param {number|string} userId - Telegram user ID
 * @param {Object} group - Group object
 */
export function setUserGroup(userId, group) {
    return setUser(userId, {
        groupId: group.id,
        groupCode: group.code,
        groupName: group.fullName
    });
}

/**
 * Subscribe user to daily notifications
 * @param {number|string} userId - Telegram user ID
 * @param {string} [time='07:00'] - Notification time
 */
export function subscribeUser(userId, time = '07:00') {
    return setUser(userId, {
        subscribed: true,
        notifyTime: time
    });
}

/**
 * Unsubscribe user from daily notifications
 * @param {number|string} userId - Telegram user ID
 */
export function unsubscribeUser(userId) {
    return setUser(userId, {
        subscribed: false
    });
}

/**
 * Get all subscribed users
 * @returns {Array<{userId: string, data: UserData}>} Array of subscribed users
 */
export function getSubscribedUsers() {
    const result = [];
    for (const [userId, data] of Object.entries(usersCache)) {
        if (data.subscribed && data.groupId) {
            result.push({ userId, data });
        }
    }
    return result;
}

/**
 * Check if user has a selected group
 * @param {number|string} userId - Telegram user ID
 * @returns {boolean} True if user has selected a group
 */
export function hasGroup(userId) {
    const user = getUser(userId);
    return user && user.groupId;
}

/**
 * Get all users count
 * @returns {number} Total users count
 */
export function getUsersCount() {
    return Object.keys(usersCache).length;
}

/**
 * Reload users from disk (useful after external changes)
 */
export function reloadUsers() {
    usersCache = loadUsers();
    console.log(`[ScheduleBot] Reloaded ${Object.keys(usersCache).length} users from storage`);
}

export default {
    getUser,
    setUser,
    deleteUser,
    setUserGroup,
    subscribeUser,
    unsubscribeUser,
    getSubscribedUsers,
    hasGroup,
    getUsersCount,
    reloadUsers
};
