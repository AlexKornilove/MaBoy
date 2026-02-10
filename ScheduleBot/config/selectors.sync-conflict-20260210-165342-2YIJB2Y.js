/**
 * CSS Selectors for NSPU Schedule Website
 * 
 * Centralized selectors configuration for resilience against website layout changes.
 * If the website structure changes, update selectors here only.
 * 
 * @see https://schedule.nspu.ru
 */

export default {
  // Schedule page selectors (group_shedule_1s.php)
  schedule: {
    // Main schedule table
    table: 'table',
    // Current day marker (yellow background)
    currentDayBg: 'yellow',
    // Day header cells
    dayHeader: 'td[colspan]',
    // Individual lesson rows
    lessonRow: 'tr',
    // Cells within lesson row
    timeCell: 'td:first-child',
    lessonDetails: 'td:nth-child(2)',
    // Links to teachers and rooms
    teacherLink: 'a[href*="teacher_shedule.php"]',
    roomLink: 'a[href*="room_shedule.php"]'
  },

  // Weeks page selectors (group_shedule_weeks.php)
  weeks: {
    // Current date marker (yellow background)
    currentDateBg: 'yellow',
    // Week number cells
    weekCell: 'td',
    // Month tables
    monthTable: 'table'
  },

  // Groups index page selectors (group_index.php)
  groups: {
    // Links to group schedules
    groupLink: 'a[href*="group_shedule.php"]',
    // Section headers (Очная/Заочная формы)
    sectionHeader: 'h2, h3',
    // Pattern to extract group ID from URL
    groupIdPattern: /id=(\d+)/
  },

  // Base URLs
  urls: {
    base: 'https://schedule.nspu.ru',
    schedule: 'https://schedule.nspu.ru/group_shedule_1s.php',
    weeks: 'https://schedule.nspu.ru/group_shedule_weeks.php?fancy',
    groups: 'https://schedule.nspu.ru/group_index.php'
  }
};
