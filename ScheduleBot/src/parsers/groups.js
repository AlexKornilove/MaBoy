/**
 * Groups Parser
 * Fetches and parses the list of student groups from NSPU schedule website.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import selectors from '../../config/selectors.js';
import settings from '../../config/settings.js';

// Cache for groups list
let groupsCache = null;
let cacheTimestamp = 0;

/**
 * Group object structure
 * @typedef {Object} Group
 * @property {string} id - Group ID (numeric)
 * @property {string} code - Group code (e.g., "3.092.2.24")
 * @property {string} shortName - Short name (e.g., "200")
 * @property {string} fullName - Full display name (e.g., "3.092.2.24 (200)")
 * @property {string} url - Full URL to group schedule
 */

/**
 * Parse group name from link text
 * Examples:
 * - "3.092.2.24 (200)" -> { code: "3.092.2.24", shortName: "200" }
 * - "3.057.2.25 (105)" -> { code: "3.057.2.25", shortName: "105" }
 */
function parseGroupName(text) {
    const match = text.match(/^([\d.]+)\s*\(([^)]+)\)/);
    if (match) {
        return {
            code: match[1].trim(),
            shortName: match[2].trim()
        };
    }
    // Fallback for non-standard names
    return {
        code: text.trim(),
        shortName: text.trim()
    };
}

/**
 * Fetch all groups from the index page
 * @param {number} [departmentId=8] - Department ID
 * @returns {Promise<Group[]>} Array of group objects
 */
export async function fetchGroups(departmentId = 8) {
    // Return cached data if still valid
    const now = Date.now();
    if (groupsCache && (now - cacheTimestamp) < settings.cache.groupsTTL) {
        console.log('[ScheduleBot] Using cached groups list');
        return groupsCache;
    }

    const url = `${selectors.urls.groups}?dep=${departmentId}`;
    console.log(`[ScheduleBot] Fetching groups from ${url}`);

    try {
        const response = await axios.get(url, {
            timeout: settings.request.timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const groups = [];

        $(selectors.groups.groupLink).each((_, element) => {
            const $link = $(element);
            const href = $link.attr('href');
            const text = $link.text().trim();

            if (!href || !text) return;

            // Skip groups with "Практика" in the name
            if (text.toLowerCase().includes('практика')) {
                return;
            }

            // Extract group ID from URL
            const idMatch = href.match(selectors.groups.groupIdPattern);
            if (!idMatch) return;

            const parsed = parseGroupName(text);

            groups.push({
                id: idMatch[1],
                code: parsed.code,
                shortName: parsed.shortName,
                fullName: text,
                url: `${selectors.urls.base}/${href}`
            });
        });

        console.log(`[ScheduleBot] Found ${groups.length} groups`);

        // Update cache
        groupsCache = groups;
        cacheTimestamp = now;

        return groups;
    } catch (error) {
        console.error('[ScheduleBot] Error fetching groups:', error.message);
        // Return cached data if available, even if stale
        if (groupsCache) {
            console.log('[ScheduleBot] Returning stale cache due to error');
            return groupsCache;
        }
        throw error;
    }
}

/**
 * Search groups by code or name
 * @param {string} query - Search query
 * @param {Group[]} [groups] - Optional pre-fetched groups array
 * @returns {Promise<Group[]>} Matching groups
 */
export async function searchGroups(query, groups = null) {
    const allGroups = groups || await fetchGroups();
    const lowerQuery = query.toLowerCase().trim();

    return allGroups.filter(group =>
        group.code.toLowerCase().includes(lowerQuery) ||
        group.shortName.toLowerCase().includes(lowerQuery) ||
        group.fullName.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Find a group by its ID
 * @param {string} groupId - Group ID
 * @returns {Promise<Group|null>} Group object or null
 */
export async function findGroupById(groupId) {
    const groups = await fetchGroups();
    return groups.find(g => g.id === groupId) || null;
}

/**
 * Find a group by its code
 * @param {string} code - Group code (e.g., "3.092.2.24")
 * @returns {Promise<Group|null>} Group object or null
 */
export async function findGroupByCode(code) {
    const groups = await fetchGroups();
    return groups.find(g => g.code === code) || null;
}

export default {
    fetchGroups,
    searchGroups,
    findGroupById,
    findGroupByCode
};
