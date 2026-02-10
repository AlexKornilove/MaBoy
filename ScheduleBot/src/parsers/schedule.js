/**
 * Schedule Parser
 * Fetches and parses group schedule from NSPU schedule website.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import selectors from '../../config/selectors.js';
import settings from '../../config/settings.js';

// Cache for schedules with TTL
const scheduleCache = new Map();
// Last update timestamp
let lastCacheUpdate = 0;
// Cache update interval: 12 hours (twice daily)
const CACHE_UPDATE_INTERVAL = 12 * 60 * 60 * 1000;

/**
 * Lesson structure
 * @typedef {Object} Lesson
 * @property {string} time - Lesson time
 * @property {string} subject - Subject name
 * @property {string} teacher - Teacher name
 * @property {string} room - Room/auditorium
 * @property {string} type - Lesson type
 * @property {string} weeks - Weeks display string
 * @property {number[]} weekRange - legacy range [start, end]
 * @property {Set<number>} activeWeeks - Set of specific active week numbers
 */

/**
 * Parse lesson type to human readable format
 */
function parseType(typeCode) {
    if (!typeCode) return '';
    const code = typeCode.toLowerCase();
    if (code.includes('л.') || code === 'л') return 'лекция';
    if (code.includes('п.з') || code.includes('пз')) return 'практическое занятие';
    if (code.includes('лаб')) return 'лабораторная работа';
    if (code.includes('сем')) return 'семинар';
    if (code.includes('конс')) return 'консультация';
    if (code.includes('экз')) return 'экзамен';
    return typeCode;
}

/**
 * Parse a flexible string of weeks into a Set of numbers
 * Supports: "23", "23-25", "23,25,27", "23-27, 30-32"
 * @param {string} weeksStr 
 * @returns {Set<number>} Set of active week numbers
 */
function parseWeeksToSet(weeksStr) {
    const weeks = new Set();
    if (!weeksStr) return weeks; // empty

    // Split by comma
    const parts = weeksStr.split(',');

    for (const part of parts) {
        const trimmed = part.trim();
        // Check for range
        const rangeMatch = trimmed.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (rangeMatch) {
            const start = parseInt(rangeMatch[1]);
            const end = parseInt(rangeMatch[2]);
            for (let i = start; i <= end; i++) {
                weeks.add(i);
            }
        } else {
            // Single number
            const numMatch = trimmed.match(/(\d+)/);
            if (numMatch) {
                weeks.add(parseInt(numMatch[1]));
            }
        }
    }
    return weeks;
}

/**
 * Normalize a Set of weeks into a readable string range
 * e.g., {23, 25, 27} -> "23-27 нед."
 * e.g., {23, 24, 25} -> "23-25 нед."
 */
function normalizeWeeks(weeksSet) {
    if (weeksSet.size === 0) return '';

    const sorted = Array.from(weeksSet).sort((a, b) => a - b);
    if (sorted.length === 0) return '';

    // Check if it's a simple range (step 1)
    const isContinuous = sorted.every((val, i) => i === 0 || val === sorted[i - 1] + 1);
    if (isContinuous && sorted.length > 2) {
        return `${sorted[0]}–${sorted[sorted.length - 1]} нед.`;
    }

    // Check if it's all odd or all even (step 2)
    const isStep2 = sorted.every((val, i) => i === 0 || val === sorted[i - 1] + 2);
    if (isStep2 && sorted.length > 2) {
        return `${sorted[0]}–${sorted[sorted.length - 1]} нед.`;
    }

    if (sorted.length > 3) {
        return `${sorted[0]}–${sorted[sorted.length - 1]} нед.`;
    }

    // Fallback: join with commas
    return sorted.join(',') + ' нед.';
}

/**
 * Format typeInfo into a detailed weeks string
 * e.g., "л.: 23–32 нед. п.з.: 33–38 нед."
 */
function formatDetailedWeeks(typeInfo) {
    if (!typeInfo || typeInfo.length === 0) return '';
    return typeInfo.map(info => {
        const typePrefix = info.type === 'лекция' ? 'л.' : (info.type === 'практическое занятие' ? 'п.з.' : info.type);
        return `${typePrefix}: ${normalizeWeeks(info.weeks)}`;
    }).join(' ');
}

/**
 * Parse combined types and weeks from text
 * @returns {Array<{type: string, weeks: Set<number>, rawWeeks: string}>}
 */
function parseTypesAndWeeks(text) {
    const results = [];

    // Regex for "type: weeks" pattern
    // Matches: "(л.: 33 нед. п.з.: 24-32,34-40 нед.)"
    // We capture content inside parens first
    const parenMatches = text.matchAll(/\(([^)]+)\)/g);

    for (const match of parenMatches) {
        const content = match[1];

        // Split by known types boundaries if possible, or just regex iteration
        // Let's iterate over types found
        const typeRegex = /(л|п\.?з|лаб|сем|конс|экз)\.?\s*:\s*([^a-zа-я]+)нед\.?/gi;
        let found = false;

        for (const typeMatch of content.matchAll(typeRegex)) {
            found = true;
            const typeCode = typeMatch[1];
            const weeksStr = typeMatch[2]; // e.g. "24-32,34-40"
            const weeksSet = parseWeeksToSet(weeksStr);

            results.push({
                type: parseType(typeCode),
                weeks: weeksSet,
                rawWeeks: weeksStr.trim()
            });
        }

        // If no complex types found, maybe simple format "(п.з.: 23-34 нед.)" or "(лаб.)"
        if (!found) {
            // Check for single type at start
            const singleTypeMatch = content.match(/^(л|п\.?з|лаб|сем|конс|экз)\.?\s*[:\s]?\s*(.*)/i);
            if (singleTypeMatch) {
                const typeCode = singleTypeMatch[1];
                let weeksStr = singleTypeMatch[2]; // Rest of string
                // Clean weeks string
                weeksStr = weeksStr.replace(/нед\.?$/, '').trim();

                let weeksSet = new Set();
                if (weeksStr) {
                    weeksSet = parseWeeksToSet(weeksStr);
                }

                results.push({
                    type: parseType(typeCode),
                    weeks: weeksSet,
                    rawWeeks: weeksStr
                });
            }
        }
    }

    return results;
}

/**
 * Calculate distance from current week to lesson's weeks
 */
function getLessonDistance(lesson, currentWeek) {
    if (!lesson) return Infinity;

    // Collect all active weeks for this lesson
    const allWeeks = new Set(lesson.activeWeeks || []);
    if (lesson.typeInfo) {
        lesson.typeInfo.forEach(t => t.weeks.forEach(w => allWeeks.add(w)));
    }

    if (allWeeks.size === 0) return Infinity;

    // If current week is in set, distance is 0 (active)
    if (allWeeks.has(currentWeek)) return 0;

    // Find absolute minimum distance
    let minDist = Infinity;
    for (const w of allWeeks) {
        const dist = Math.abs(currentWeek - w);
        if (dist < minDist) minDist = dist;
    }
    return minDist;
}

/**
 * Parse a lesson from cell HTML
 * Can return multiple lessons if cell contains <br>
 * @returns {Lesson[]} Array of parsed lessons
 */
function parseLessonFromCell($, $cell) {
    const html = $cell.html() || '';
    // Split by <br> tags to handle multiple lessons in one cell
    const parts = html.split(/<br\s*\/?>/i);
    const parsedLessons = [];

    for (const part of parts) {
        const $part = cheerio.load(`<div>${part}</div>`, null, false);
        const text = $part.text().trim();

        if (!text || text === '-' || text === '—' || text.length < 5) continue;

        // Extract multiple teachers and their titles
        const teachers = [];
        const teacherNodes = []; // Keep track of what to remove from subject

        $part('a[href*="teacher"]').each((i, el) => {
            const $link = $part(el);
            const name = $link.text().trim();

            // Look for titles before the link
            // We look at the preceding text nodes in the raw HTML part
            const prevText = el.previousSibling && el.previousSibling.type === 'text'
                ? el.previousSibling.data
                : '';

            const titlesRegex = /(?:доц\.?|проф\.?|ассист\.?|ст\.\s*препод\.?|ст\.\s*преп\.?|преп\.?|преподаватель)/gi;
            const titleMatch = prevText.match(titlesRegex);
            const title = titleMatch ? titleMatch[titleMatch.length - 1].trim() : '';

            const fullTeacher = title ? `${title} ${name}` : name;
            teachers.push(fullTeacher);

            teacherNodes.push(name);
            if (title) teacherNodes.push(title);
        });

        // Extract room
        const $roomLink = $part('a[href*="room"]');
        let room = $roomLink.first().text().trim();
        if (!room) {
            const roomMatch = text.match(/(?:а\.|ауд\.?)\s*(\d+[а-яА-Я]?(?:\/\d+)?)/i);
            if (roomMatch) room = 'а. ' + roomMatch[1];
        }

        // Parse types and weeks
        const typeInfo = parseTypesAndWeeks(text);

        // Fallback parsing for weeks if typeInfo is empty
        let weeksDisplay = '';
        let activeWeeks = new Set();
        if (typeInfo.length === 0) {
            const weeksMatch = text.match(/(\d+(?:[-–]\d+)?(?:,\s*\d+(?:[-–]\d+)?)*)\s*нед/);
            if (weeksMatch) {
                const wStr = weeksMatch[1];
                activeWeeks = parseWeeksToSet(wStr);
                weeksDisplay = normalizeWeeks(activeWeeks);
            }
        }

        // Clean subject
        let subject = text;

        // Multi-pass cleaning to ensure titles and names are gone
        teacherNodes.forEach(t => {
            const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(escaped, 'gi');
            subject = subject.replace(re, '');
        });

        // Remove room
        if (room) {
            subject = subject.replace(room, '');
            // Also remove the "а." or "ауд." prefix that might be left
            subject = subject.replace(/(?:а\.|ауд\.?|ауд)\s*/gi, '');
        }

        // Remove weeks and types in parens
        subject = subject.replace(/\([^)]*\)/g, '');

        // Remove artifacts and clean whitespace
        subject = subject.replace(/\*/g, '')
            .replace(/\s+/g, ' ')
            .replace(/^[\s,;.-]+|[\s,;.-]+$/g, '')
            .trim();

        parsedLessons.push({
            subject,
            teacher: teachers.join(', '),
            room,
            typeInfo: typeInfo.length > 0 ? typeInfo : null,
            type: '', // Will be resolved later
            weeks: weeksDisplay,
            activeWeeks,
            rawText: text
        });
    }

    // Post-process to merge orphans (parts with no weeks/type)
    const mergedLessons = [];
    for (let i = 0; i < parsedLessons.length; i++) {
        const current = parsedLessons[i];
        const isOrphan = current.activeWeeks.size === 0 && (!current.typeInfo || current.typeInfo.length === 0);

        if (isOrphan) {
            // Try to merge with next if next is valid
            if (i + 1 < parsedLessons.length) {
                const next = parsedLessons[i + 1];
                // Prepend current subject to next
                // But wait, if we stripped teacher from next, maybe we need raw text?
                // No, subject + subject is fine. "Physics" + "Assoc Prof" -> "Physics Assoc Prof"
                next.subject = `${current.subject} ${next.subject}`;
                // Also merge teachers if current has one?
                if (current.teacher && !next.teacher) next.teacher = current.teacher;
                // Don't push current, it's merged into next
                continue;
            }
            // Else try to merge with prev if prev was valid (and already pushed)
            else if (mergedLessons.length > 0) {
                const prev = mergedLessons[mergedLessons.length - 1];
                prev.subject = `${prev.subject} ${current.subject}`;
                if (current.teacher && !prev.teacher) prev.teacher = current.teacher;
                continue;
            }
        }

        // If not processed as orphan (or is a valid orphan that couldn't be merged?), push
        // If it's still orphan here (last item, no prev?), push it.
        mergedLessons.push(current);
    }

    // Final cleanup of subjects
    mergedLessons.forEach(l => {
        l.subject = l.subject.replace(/\s+/g, ' ').trim();
        // Remove short garbage
        if (l.subject.length < 3 && l.weeks) {
            // If subject became empty but there is teacher?
            // Use teacher as subject? No.
        }
    });

    return mergedLessons.filter(l => l.subject.length >= 2);
}

/**
 * Select specific lesson details based on current week
 */
function resolveLessonDetails(lesson, currentWeek) {
    if (!lesson) return null;

    const allWeeks = new Set();
    if (lesson.typeInfo) {
        lesson.typeInfo.forEach(t => t.weeks.forEach(w => allWeeks.add(w)));
    } else if (lesson.activeWeeks) {
        lesson.activeWeeks.forEach(w => allWeeks.add(w));
    }

    const detailedWeeks = lesson.typeInfo ? formatDetailedWeeks(lesson.typeInfo) : normalizeWeeks(allWeeks);

    if (currentWeek === 0) {
        const types = lesson.typeInfo ? [...new Set(lesson.typeInfo.map(t => t.type))].join(', ') : '';
        return {
            ...lesson,
            type: types,
            weeks: detailedWeeks,
            activeWeeks: allWeeks,
            weekRange: allWeeks.size > 0 ? [Math.min(...allWeeks), Math.max(...allWeeks)] : []
        };
    }

    // Resolve specific type for current week
    let activeType = '';
    if (lesson.typeInfo) {
        const found = lesson.typeInfo.find(info => info.weeks.has(currentWeek));
        if (found) {
            activeType = found.type;
        } else {
            // Pick nearest type if current week not active
            let minGap = Infinity;
            lesson.typeInfo.forEach(info => {
                info.weeks.forEach(w => {
                    const gap = Math.abs(currentWeek - w);
                    if (gap < minGap) {
                        minGap = gap;
                        activeType = info.type;
                    }
                });
            });
        }
    }

    return {
        ...lesson,
        type: activeType,
        weeks: detailedWeeks,
        activeWeeks: allWeeks,
        weekRange: allWeeks.size > 0 ? [Math.min(...allWeeks), Math.max(...allWeeks)] : []
    };
}

/**
 * Select the best lesson based on proximity to current week
 * Strict selection: returns only the single best match, or empty
 */
function selectLessons(numerator, denominator, currentWeek) {
    // Collect all candidates (flatten arrays)
    const candidates = [...(numerator || []), ...(denominator || [])];

    if (candidates.length === 0) return [];

    // Resolve details for each candidate (ignoring currentWeek filtering for the content)
    // We want the content to be "rich" (showing the range), but the SELECTION to be strict.
    // So we resolve with 0 to get full content, then calculate distance.
    const resolvedCandidates = candidates.map(c => {
        const resolved = resolveLessonDetails(c, 0); // Get full details
        // Calculate distance using original data (resolved has normalization, maybe keep original?)
        // resolveLessonDetails returns new object but keeps activeWeeks/typeInfo?
        // Yes, it keeps activeWeeks.
        return resolved;
    }).filter(c => c !== null);

    if (resolvedCandidates.length === 0) return [];

    // Sort by proximity to currentWeek
    resolvedCandidates.sort((a, b) => {
        const distA = getLessonDistance(a, currentWeek);
        const distB = getLessonDistance(b, currentWeek);

        if (distA !== distB) return distA - distB;

        // If distances equal, maybe prioritize active? (already covered by dist 0)
        // If both future/past with same distance? Stable sort.
        return 0;
    });

    // Return ONLY the best one
    const best = resolvedCandidates[0];

    // We might need to resolve it AGAIN with currentWeek for specific type display?
    // User requested: "choose nearest... and choose correct type"
    // `resolveLessonDetails(c, 0)` returns combined types.
    // If I use `resolveLessonDetails(c, currentWeek)`, I might get just "lecture".
    // "Combined formats... expected... correct type... which will be displayed".
    // This implies specific type selection IS desired for the chosen lesson.
    // So: Select best lesson -> Then resolve type for current week (or nearest week if not active).

    // Refine the best match
    const finalLesson = resolveLessonDetails(best, currentWeek);

    return [finalLesson];
}

// ... Rest of the fetch logic (extractCurrentWeek, etc.) needs to be preserved ...
// Since I'm using `write_to_file` I need to provide the FULL file content or use `replace_file_content`.
// `replace_file_content` is safer to preserve existing helper flow, but `write_to_file` is cleaner for a rewrite.
// Given the complexity of changes (adding Sets, normalization, type parsing), a full rewrite of `schedule.js` is safer to ensure consistency.

function extractCurrentWeek($) {
    const headerText = $('body').text();
    const weekMatch = headerText.match(/текущая\s+неделя\s+(?:номер\s+)?(\d+)/i);
    return weekMatch ? parseInt(weekMatch[1]) : 0;
}

export async function fetchSchedule(groupId, groupCode = null) {
    const cacheKey = groupId || groupCode;
    const now = Date.now();
    const cacheExpired = (now - lastCacheUpdate) > CACHE_UPDATE_INTERVAL;

    const cached = scheduleCache.get(cacheKey);
    if (cached && !cacheExpired && (now - cached.timestamp) < settings.cache.scheduleTTL) {
        console.log(`[ScheduleBot] Using cached schedule for ${cacheKey}`);
        return cached.data;
    }

    let url = groupCode ? `${selectors.urls.schedule}?n=${groupCode}` : `${selectors.urls.base}/group_shedule_1s.php?id=${groupId}`;
    console.log(`[ScheduleBot] Fetching schedule from ${url}`);

    try {
        const response = await axios.get(url, {
            timeout: settings.request.timeout,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const $ = cheerio.load(response.data);
        const currentWeek = extractCurrentWeek($);
        console.log(`[ScheduleBot] Current week: ${currentWeek}`);

        const schedule = [];
        const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

        let mainTable = null;
        $('table').each((i, table) => {
            const txt = $(table).find('tr').first().text();
            if (txt.includes('Числитель') || txt.includes('Знаменатель')) {
                mainTable = $(table);
                return false;
            }
        });

        if (!mainTable) return { schedule: [], currentWeek };

        let currentDay = null;

        mainTable.find('tr').each((rowIndex, row) => {
            const cells = $(row).find('td');
            if (cells.length === 0) return;

            // Logic to find day rows vs lesson rows (same as before)
            const firstText = cells.eq(0).text().trim();
            const dayMatch = dayNames.find(d => firstText.includes(d));

            if (dayMatch) {
                if (currentDay && currentDay.lessons.length > 0) schedule.push(currentDay);

                const isToday = (cells.eq(0).attr('bgcolor') || '').toLowerCase() === 'yellow';
                currentDay = { dayName: dayMatch, date: '', isToday, lessons: [] };

                // Parse first lesson of day
                // Row 1: Day, Time, Num, Denom
                const timeText = cells.eq(1).text().trim();
                const colspan = parseInt(cells.eq(2).attr('colspan') || '1');

                const isNumerator = currentWeek === 0 || currentWeek % 2 !== 0; // Odd is Numerator
                let numeratorLessons = [];
                let denominatorLessons = [];

                if (colspan === 2) {
                    numeratorLessons = parseLessonFromCell($, cells.eq(2));
                    denominatorLessons = numeratorLessons;
                } else {
                    numeratorLessons = parseLessonFromCell($, cells.eq(2));
                    denominatorLessons = parseLessonFromCell($, cells.eq(3));
                }

                const lessonsToAdd = selectLessons(
                    isNumerator ? numeratorLessons : [],
                    isNumerator ? [] : denominatorLessons,
                    currentWeek
                );

                // Sort lessons by start week
                lessonsToAdd.sort((a, b) => {
                    const startA = a.weekRange ? a.weekRange[0] : 0;
                    const startB = b.weekRange ? b.weekRange[0] : 0;
                    return startA - startB;
                });

                if (lessonsToAdd.length === 0) {
                    currentDay.lessons.push({
                        time: timeText,
                        isEmpty: true
                    });
                } else {
                    lessonsToAdd.forEach(lesson => {
                        lesson.time = timeText;
                        currentDay.lessons.push(lesson);
                    });
                }

            } else if (currentDay && cells.length >= 2) { // Lesson row
                const timeText = cells.eq(0).text().trim();
                const cell1 = cells.eq(1);
                const colspan = parseInt(cell1.attr('colspan') || '1');

                const isNumerator = currentWeek === 0 || currentWeek % 2 !== 0;
                let numeratorLessons = [];
                let denominatorLessons = [];

                if (colspan === 2) {
                    numeratorLessons = parseLessonFromCell($, cell1);
                    denominatorLessons = numeratorLessons;
                } else {
                    numeratorLessons = parseLessonFromCell($, cell1);
                    denominatorLessons = parseLessonFromCell($, cells.eq(2));
                }

                const lessonsToAdd = selectLessons(
                    isNumerator ? numeratorLessons : [],
                    isNumerator ? [] : denominatorLessons,
                    currentWeek
                );

                // Sort lessons by start week
                lessonsToAdd.sort((a, b) => {
                    const startA = a.weekRange ? a.weekRange[0] : 0;
                    const startB = b.weekRange ? b.weekRange[0] : 0;
                    return startA - startB;
                });

                if (lessonsToAdd.length === 0) {
                    currentDay.lessons.push({
                        time: timeText,
                        isEmpty: true
                    });
                } else {
                    lessonsToAdd.forEach(lesson => {
                        lesson.time = timeText;
                        currentDay.lessons.push(lesson);
                    });
                }
            }
        });

        if (currentDay && currentDay.lessons.length > 0) schedule.push(currentDay);

        console.log(`[ScheduleBot] Parsed ${schedule.length} days`);
        const res = { schedule, currentWeek };
        scheduleCache.set(cacheKey, { data: res, timestamp: now });
        lastCacheUpdate = now;
        return res;

    } catch (e) {
        console.error('[ScheduleBot] Error:', e.message);
        const cached = scheduleCache.get(cacheKey);
        if (cached) return cached.data;
        throw e;
    }
}

export async function getScheduleForDay(groupId, groupCode = null) {
    const { schedule, currentWeek } = await fetchSchedule(groupId, groupCode);
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const todayName = dayNames[new Date().getDay()];

    const todaySchedule = schedule.find(day => day.dayName.toLowerCase().includes(todayName.toLowerCase()));

    if (todaySchedule) return { day: { ...todaySchedule, isToday: true }, currentWeek };

    return {
        day: { dayName: todayName, date: new Date().toLocaleDateString('ru-RU'), isToday: true, lessons: [] },
        currentWeek
    };
}

export async function getWeeklySchedule(groupId, groupCode = null) {
    const { schedule, currentWeek } = await fetchSchedule(groupId, groupCode);
    const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const todayName = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][new Date().getDay()];

    const weekly = dayNames.map(dayName => {
        const found = schedule.find(d => d.dayName === dayName);
        return {
            dayName,
            date: found?.date || '',
            isToday: dayName === todayName,
            lessons: found?.lessons || []
        };
    });
    return { schedule: weekly, currentWeek };
}

export function clearCache(groupId = null) {
    if (groupId) scheduleCache.delete(groupId);
    else scheduleCache.clear();
    lastCacheUpdate = 0;
    console.log('[ScheduleBot] Cache cleared');
}

export async function refreshAllCaches() {
    lastCacheUpdate = 0;
    const keys = Array.from(scheduleCache.keys());
    for (const key of keys) {
        await fetchSchedule(null, key).catch(e => console.error(e.message));
    }
}

export default { fetchSchedule, getScheduleForDay, getWeeklySchedule, clearCache, refreshAllCaches };
