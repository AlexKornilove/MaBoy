/**
 * Weeks Parser
 * Determines the current academic week from NSPU schedule website.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import selectors from '../../config/selectors.js';
import settings from '../../config/settings.js';

// Cache for current week
let weekCache = null;
let cacheTimestamp = 0;

/**
 * Week info structure
 * @typedef {Object} WeekInfo
 * @property {number} weekNumber - Current academic week number
 * @property {string} date - Current highlighted date
 * @property {string} semester - Semester info (e.g., "2025-2026")
 */

/**
 * Fetch current week information
 * @returns {Promise<WeekInfo>} Current week info
 */
export async function fetchCurrentWeek() {
    // Return cached data if still valid (cache for 1 hour)
    const now = Date.now();
    const WEEK_CACHE_TTL = 60 * 60 * 1000; // 1 hour

    if (weekCache && (now - cacheTimestamp) < WEEK_CACHE_TTL) {
        console.log('[ScheduleBot] Using cached week info');
        return weekCache;
    }

    const url = selectors.urls.weeks;
    console.log(`[ScheduleBot] Fetching week info from ${url}`);

    try {
        const response = await axios.get(url, {
            timeout: settings.request.timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);

        // Find the cell with yellow background (current date)
        let weekNumber = null;
        let currentDate = null;

        // Look for yellow highlighted cell
        $('td').each((_, element) => {
            const $td = $(element);
            const bgColor = $td.attr('bgcolor');

            if (bgColor && bgColor.toLowerCase() === selectors.weeks.currentDateBg) {
                currentDate = $td.text().trim();

                // The week number is typically in the same row or nearby
                // Look for the week number in the same table row
                const $row = $td.parent('tr');
                const $firstCell = $row.find('td').first();
                const firstCellText = $firstCell.text().trim();

                // Try to extract week number
                const weekMatch = firstCellText.match(/(\d+)/);
                if (weekMatch) {
                    weekNumber = parseInt(weekMatch[1], 10);
                }

                return false; // Break the loop
            }
        });

        // If we couldn't find the week directly, try alternative approach
        if (!weekNumber) {
            // Look for text like "24 неделя" or similar patterns
            const bodyText = $('body').text();
            const weekPatterns = [
                /(\d+)\s*неделя/i,
                /неделя\s*(\d+)/i,
                /week\s*(\d+)/i
            ];

            for (const pattern of weekPatterns) {
                const match = bodyText.match(pattern);
                if (match) {
                    weekNumber = parseInt(match[1], 10);
                    break;
                }
            }
        }

        // Extract semester info from page title or header
        const pageTitle = $('title').text() || '';
        const semesterMatch = pageTitle.match(/(\d{4})\s*-\s*(\d{4})/);
        const semester = semesterMatch ? `${semesterMatch[1]}-${semesterMatch[2]}` : '2025-2026';

        const result = {
            weekNumber: weekNumber || 0,
            date: currentDate || new Date().toLocaleDateString('ru-RU'),
            semester
        };

        console.log(`[ScheduleBot] Current week: ${result.weekNumber}, Date: ${result.date}`);

        // Update cache
        weekCache = result;
        cacheTimestamp = now;

        return result;
    } catch (error) {
        console.error('[ScheduleBot] Error fetching week info:', error.message);

        // Return cached data if available
        if (weekCache) {
            console.log('[ScheduleBot] Returning stale cache due to error');
            return weekCache;
        }

        // Fallback response
        return {
            weekNumber: 0,
            date: new Date().toLocaleDateString('ru-RU'),
            semester: '2025-2026'
        };
    }
}

/**
 * Get formatted week header for messages
 * @returns {Promise<string>} Formatted week string
 */
export async function getWeekHeader() {
    const week = await fetchCurrentWeek();
    if (week.weekNumber > 0) {
        return `📆 ${week.weekNumber} неделя (${week.semester})`;
    }
    return `📆 Учебный год ${week.semester}`;
}

export default {
    fetchCurrentWeek,
    getWeekHeader
};
