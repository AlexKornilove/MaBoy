/**
 * Message Formatter
 * Formats schedule data into readable Telegram messages.
 */

import settings from '../../config/settings.js';

const { emoji } = settings.messages;

/**
 * Format a single lesson with week info
 * @param {Object} lesson - Lesson object
 * @returns {string} Formatted lesson string
 */
export function formatLesson(lesson) {
    if (lesson.isEmpty) {
        return `${emoji.clock} <b>${lesson.time}</b>\n<i>Занятий нет</i>`;
    }

    const lines = [];

    // 1. Time
    if (lesson.time) {
        lines.push(`${emoji.clock} <b>${lesson.time}</b>`);
    }

    // 2. Subject + Type
    let subjectLine = `${emoji.book} ${lesson.subject}`;
    if (lesson.type) {
        subjectLine += ` <i>(${lesson.type})</i>`;
    }
    lines.push(subjectLine);

    // 3. Teacher
    if (lesson.teacher) {
        lines.push(`${emoji.teacher} ${lesson.teacher}`);
    }

    // 4. Room
    if (lesson.room) {
        lines.push(`${emoji.room} ${lesson.room}`);
    }

    // 5. Weeks
    if (lesson.weeks) {
        lines.push(`📌 ${lesson.weeks}`);
    }

    return lines.join('\n');
}

/**
 * Format a day's schedule
 * @param {Object} day - Day schedule object
 * @returns {string} Formatted day string
 */
export function formatDay(day) {
    const lines = [];

    // Day header
    let header = day.dayName;
    if (day.date) {
        header += ` (${day.date})`;
    }
    if (day.isToday) {
        header = `${emoji.today} ${header} — СЕГОДНЯ`;
    }
    lines.push(`\n<b>${header}</b>`);
    lines.push('─'.repeat(25));

    // Lessons
    if (!day.lessons || day.lessons.length === 0) {
        lines.push('<i>Нет занятий</i>');
    } else {
        day.lessons.forEach((lesson, index) => {
            if (index > 0) {
                lines.push('');
            }
            lines.push(formatLesson(lesson));
        });
    }

    return lines.join('\n');
}

/**
 * Format current week header
 * @param {number} currentWeek - Current academic week number
 * @returns {string} Week header string
 */
export function formatWeekHeader(currentWeek) {
    if (currentWeek > 0) {
        return `📆 <b>Текущая неделя: ${currentWeek}</b>`;
    }
    return '';
}

/**
 * Format full weekly schedule
 * @param {Object[]} schedule - Array of day schedules
 * @param {number} currentWeek - Current academic week number
 * @param {string} groupName - Group name
 * @returns {string} Formatted schedule message
 */
export function formatSchedule(schedule, currentWeek, groupName) {
    const lines = [];

    // Header
    lines.push(`<b>${emoji.calendar} Расписание на неделю</b>`);
    lines.push(`<b>Группа:</b> ${groupName}`);

    // Current week at top
    const weekHeader = formatWeekHeader(currentWeek);
    if (weekHeader) {
        lines.push(weekHeader);
    }

    // Days
    if (!schedule || schedule.length === 0) {
        lines.push('\n<i>Расписание не найдено</i>');
    } else {
        schedule.forEach(day => {
            lines.push(formatDay(day));
        });
    }

    return lines.join('\n');
}

/**
 * Format today's schedule
 * @param {Object|null} today - Today's schedule or null
 * @param {number} currentWeek - Current academic week number  
 * @param {string} groupName - Group name
 * @returns {string} Formatted today's schedule
 */
export function formatToday(today, currentWeek, groupName) {
    const lines = [];

    // Header
    lines.push(`<b>${emoji.today} Расписание на сегодня</b>`);
    lines.push(`<b>Группа:</b> ${groupName}`);

    // Current week at top
    const weekHeader = formatWeekHeader(currentWeek);
    if (weekHeader) {
        lines.push(weekHeader);
    }
    lines.push('');

    if (!today || !today.lessons || today.lessons.length === 0) {
        const dayName = today?.dayName || getDayName();
        lines.push(`<b>${dayName}</b>`);
        lines.push('─'.repeat(25));
        lines.push('<i>Сегодня нет занятий по расписанию</i>');
    } else {
        // Day header
        let header = today.dayName;
        if (today.date) {
            header += ` (${today.date})`;
        }
        lines.push(`<b>${header}</b>`);
        lines.push('─'.repeat(25));

        // Show all lessons
        today.lessons.forEach((lesson, index) => {
            if (index > 0) {
                lines.push('');
            }
            lines.push(formatLesson(lesson));
        });
    }

    return lines.join('\n');
}

/**
 * Get current day name in Russian
 * @returns {string} Day name
 */
function getDayName() {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[new Date().getDay()];
}

/**
 * Format group selection message
 */
export function formatGroupPrompt(totalGroups) {
    return `${emoji.search} <b>Выбор группы</b>

Найдено групп: ${totalGroups}

Выберите группу из списка или введите код группы:`;
}

/**
 * Format subscription confirmation
 */
export function formatSubscription(subscribed, time = '07:00') {
    if (subscribed) {
        return `${emoji.bell} <b>Подписка активирована!</b>

Вы будете получать расписание каждое утро в ${time}.`;
    } else {
        return `${emoji.mute} <b>Подписка отключена</b>

Ежедневные уведомления больше не будут приходить.`;
    }
}

/**
 * Format welcome message
 */
export function formatWelcome() {
    return `${emoji.calendar} <b>Бот расписания НГПУ</b>

Просмотр расписания занятий Новосибирского государственного педагогического университета.

Используйте кнопки меню для навигации.

Для начала выберите группу:`;
}

/**
 * Format help message
 */
export function formatHelp() {
    return `${emoji.book} <b>Справка</b>

<b>Кнопки меню:</b>
📌 Сегодня — расписание на текущий день
📅 Неделя — расписание на всю неделю
🔍 Сменить группу — выбор другой группы
🔔/🔕 — управление рассылкой
🕘 Время — настройка времени рассылки

<b>Часовой пояс:</b>
Все настройки времени производятся по Новосибирску (UTC+7).

<b>Отображение занятий:</b>
• Вверху показана текущая учебная неделя
• У каждого предмета указан диапазон недель
• Тип занятия показан в скобках

<b>Источник:</b> schedule.nspu.ru`;
}

/**
 * Format error message
 */
export function formatError(message = null) {
    const defaultMsg = 'Произошла ошибка. Попробуйте позже.';
    return `${emoji.cross} <b>Ошибка</b>\n\n${message || defaultMsg}`;
}

/**
 * Format group selected confirmation
 */
export function formatGroupSelected(groupName) {
    return `${emoji.check} <b>Группа выбрана!</b>

Ваша группа: <b>${groupName}</b>

Используйте кнопки меню для просмотра расписания.`;
}

/**
 * Format time setting message
 */
export function formatTimeSettings(currentTime = '07:00') {
    return `${emoji.clock} <b>Настройка времени рассылки</b>\n\n` +
        `Текущее время: <b>${currentTime}</b>\n` +
        `Часовой пояс: <b>Новосибирск (UTC+7)</b>\n\n` +
        `Чтобы изменить время, отправьте его в формате: <b>ЧЧ:ММ</b>\n` +
        `Например: <code>08:30</code> или <code>21:00</code>`;
}

/**
 * Format time updated confirmation
 */
export function formatTimeUpdated(newTime) {
    return `${emoji.check} <b>Время рассылки обновлено!</b>\n\n` +
        `Теперь вы будете получать расписание в <b>${newTime}</b> (по Новосибирскому времени).`;
}

export default {
    formatLesson,
    formatDay,
    formatWeekHeader,
    formatSchedule,
    formatToday,
    formatGroupPrompt,
    formatSubscription,
    formatWelcome,
    formatHelp,
    formatError,
    formatGroupSelected,
    formatTimeSettings,
    formatTimeUpdated
};
