/**
 * Telegram Bot Module
 * Main bot logic with command handlers and inline keyboards.
 */

import { Telegraf, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import settings from '../config/settings.js';

// Parsers
import { fetchGroups, searchGroups, findGroupById } from './parsers/groups.js';
import { getScheduleForDay, getWeeklySchedule, refreshAllCaches } from './parsers/schedule.js';

// Services
import storage from './services/storage.js';

// Formatter
import formatter from './utils/formatter.js';

const { emoji } = settings.messages;

/**
 * Create the main menu keyboard
 * @param {boolean} hasGroup - Whether user has selected a group
 * @param {boolean} isSubscribed - Whether user is subscribed
 * @returns {Object} Keyboard markup
 */
function getMainKeyboard(hasGroup = false, isSubscribed = false) {
    const buttons = [];

    if (hasGroup) {
        buttons.push([
            Markup.button.text(`${emoji.today} Сегодня`),
            Markup.button.text(`${emoji.calendar} Неделя`)
        ]);
        buttons.push([
            Markup.button.text(`${emoji.search} Сменить группу`),
            isSubscribed
                ? Markup.button.text(`${emoji.mute} Отключить рассылку`)
                : Markup.button.text(`${emoji.bell} Включить рассылку`)
        ]);
        if (isSubscribed) {
            buttons.push([Markup.button.text(`${emoji.clock} Настроить время`)]);
        }
    } else {
        buttons.push([
            Markup.button.text(`${emoji.search} Выбрать группу`)
        ]);
    }

    buttons.push([
        Markup.button.text(`❓ Помощь`)
    ]);

    return Markup.keyboard(buttons).resize();
}

/**
 * Create and configure the bot
 * @param {string} token - Telegram bot token
 * @returns {Telegraf} Configured bot instance
 */
export function createBot(token) {
    const bot = new Telegraf(token);

    // Error handling
    bot.catch((err, ctx) => {
        console.error(`[ScheduleBot] Error for ${ctx.updateType}:`, err);
        ctx.reply(formatter.formatError(), { parse_mode: 'HTML' }).catch(() => { });
    });

    // ============= COMMANDS =============

    // /start - Welcome and group selection
    bot.command('start', async (ctx) => {
        const userId = ctx.from.id;
        const user = storage.getUser(userId);

        if (user && user.groupId) {
            // User already has a group, show main menu
            await ctx.reply(
                `${emoji.check} Ваша группа: <b>${user.groupName || user.groupCode}</b>\n\nВыберите действие:`,
                {
                    parse_mode: 'HTML',
                    ...getMainKeyboard(true, user.subscribed)
                }
            );
        } else {
            // New user, show welcome and group selection
            await ctx.reply(formatter.formatWelcome(), {
                parse_mode: 'HTML',
                ...getMainKeyboard(false)
            });
            await showGroupSelection(ctx, 0);
        }
    });

    // /help - Show help
    bot.command('help', async (ctx) => {
        const user = storage.getUser(ctx.from.id);
        await ctx.reply(formatter.formatHelp(), {
            parse_mode: 'HTML',
            ...getMainKeyboard(!!user?.groupId, user?.subscribed)
        });
    });

    // /group - Select or change group
    bot.command('group', async (ctx) => {
        await showGroupSelection(ctx, 0);
    });

    // /today - Show today's schedule
    bot.command('today', handleTodaySchedule);

    // /schedule - Show weekly schedule
    bot.command('schedule', handleWeekSchedule);

    // /subscribe - Enable daily notifications
    bot.command('subscribe', async (ctx) => {
        const userId = ctx.from.id;
        const user = storage.getUser(userId);

        if (!user || !user.groupId) {
            await ctx.reply(
                `${emoji.cross} Сначала выберите группу с помощью /group`,
                { parse_mode: 'HTML' }
            );
            return;
        }

        storage.subscribeUser(userId);
        await ctx.reply(formatter.formatSubscription(true), {
            parse_mode: 'HTML',
            ...getMainKeyboard(true, true)
        });
    });

    // /unsubscribe - Disable daily notifications
    bot.command('unsubscribe', async (ctx) => {
        const userId = ctx.from.id;
        const user = storage.getUser(userId);
        storage.unsubscribeUser(userId);
        await ctx.reply(formatter.formatSubscription(false), {
            parse_mode: 'HTML',
            ...getMainKeyboard(!!user?.groupId, false)
        });
    });

    // /time - Set notification time
    bot.command('time', async (ctx) => {
        const userId = ctx.from.id;
        const user = storage.getUser(userId);

        if (!user || !user.subscribed) {
            await ctx.reply(`${emoji.cross} Сначала включите рассылку в меню или командой /subscribe`, { parse_mode: 'HTML' });
            return;
        }

        await ctx.reply(formatter.formatTimeSettings(user.notifyTime), {
            parse_mode: 'HTML',
            ...getMainKeyboard(true, true)
        });
    });

    // ============= CALLBACK QUERIES (Inline Buttons) =============

    // Group selection pagination
    bot.action(/^groups_page_(\d+)$/, async (ctx) => {
        const page = parseInt(ctx.match[1], 10);
        await ctx.answerCbQuery();
        await showGroupSelection(ctx, page, true);
    });

    // Group selection
    bot.action(/^select_group_(.+)$/, async (ctx) => {
        const groupId = ctx.match[1];
        await ctx.answerCbQuery('Группа выбрана!');

        try {
            const group = await findGroupById(groupId);
            if (group) {
                storage.setUserGroup(ctx.from.id, group);
                await ctx.editMessageText(formatter.formatGroupSelected(group.fullName), { parse_mode: 'HTML' });

                // Show main menu with keyboard
                await ctx.reply(
                    'Выберите действие:',
                    getMainKeyboard(true, false)
                );
            } else {
                await ctx.reply(formatter.formatError('Группа не найдена'), { parse_mode: 'HTML' });
            }
        } catch (error) {
            console.error('[ScheduleBot] Error selecting group:', error);
            await ctx.reply(formatter.formatError(), { parse_mode: 'HTML' });
        }
    });

    // ============= TEXT MESSAGE HANDLER (Keyboard buttons & Group Search) =============

    bot.on(message('text'), async (ctx) => {
        const text = ctx.message.text;

        // Ignore commands
        if (text.startsWith('/')) return;

        // Handle keyboard button presses
        if (text.includes('Сегодня')) {
            return handleTodaySchedule(ctx);
        }
        if (text.includes('Неделя')) {
            return handleWeekSchedule(ctx);
        }
        if (text.includes('Выбрать группу') || text.includes('Сменить группу')) {
            return showGroupSelection(ctx, 0);
        }
        if (text.includes('Включить рассылку')) {
            const userId = ctx.from.id;
            const user = storage.getUser(userId);
            if (!user || !user.groupId) {
                await ctx.reply(`${emoji.cross} Сначала выберите группу`, { parse_mode: 'HTML' });
                return;
            }
            storage.subscribeUser(userId);
            await ctx.reply(formatter.formatSubscription(true), {
                parse_mode: 'HTML',
                ...getMainKeyboard(true, true)
            });
            return;
        }
        if (text.includes('Отключить рассылку')) {
            const userId = ctx.from.id;
            storage.unsubscribeUser(userId);
            const user = storage.getUser(userId);
            await ctx.reply(formatter.formatSubscription(false), {
                parse_mode: 'HTML',
                ...getMainKeyboard(!!user?.groupId, false)
            });
            return;
        }
        if (text.includes('Настроить время')) {
            const userId = ctx.from.id;
            const user = storage.getUser(userId);
            if (!user || !user.subscribed) {
                await ctx.reply(`${emoji.cross} Сначала включите рассылку`, { parse_mode: 'HTML' });
                return;
            }
            await ctx.reply(formatter.formatTimeSettings(user.notifyTime), {
                parse_mode: 'HTML',
                ...getMainKeyboard(true, true)
            });
            return;
        }
        if (text.includes('Помощь')) {
            const user = storage.getUser(ctx.from.id);
            await ctx.reply(formatter.formatHelp(), {
                parse_mode: 'HTML',
                ...getMainKeyboard(!!user?.groupId, user?.subscribed)
            });
            return;
        }

        // Handle time input (HH:MM or H:MM)
        const timeMatch = text.match(/^(\d{1,2}):(\d{2})$/);
        if (timeMatch) {
            const userId = ctx.from.id;
            const user = storage.getUser(userId);

            if (user && user.subscribed) {
                let hours = parseInt(timeMatch[1], 10);
                let mins = parseInt(timeMatch[2], 10);

                if (hours >= 0 && hours < 24 && mins >= 0 && mins < 60) {
                    const normalizedTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
                    storage.subscribeUser(userId, normalizedTime);
                    await ctx.reply(formatter.formatTimeUpdated(normalizedTime), {
                        parse_mode: 'HTML',
                        ...getMainKeyboard(true, true)
                    });
                    return;
                }
            }
        }

        // Treat as group search
        try {
            const results = await searchGroups(text);

            if (results.length === 0) {
                await ctx.reply(
                    `${emoji.search} Группы не найдены по запросу "<b>${text}</b>"\n\nПопробуйте другой запрос или выберите из списка:`,
                    {
                        parse_mode: 'HTML',
                        ...Markup.inlineKeyboard([[
                            Markup.button.callback('📋 Показать список групп', 'groups_page_0')
                        ]])
                    }
                );
            } else if (results.length === 1) {
                // Exact match - select immediately
                const group = results[0];
                storage.setUserGroup(ctx.from.id, group);
                await ctx.reply(formatter.formatGroupSelected(group.fullName), {
                    parse_mode: 'HTML',
                    ...getMainKeyboard(true, false)
                });
            } else {
                // Multiple matches - show as buttons
                const buttons = results.slice(0, 10).map(group =>
                    [Markup.button.callback(group.fullName, `select_group_${group.id}`)]
                );

                await ctx.reply(
                    `${emoji.search} Найдено ${results.length} групп по запросу "<b>${text}</b>":`,
                    {
                        parse_mode: 'HTML',
                        ...Markup.inlineKeyboard(buttons)
                    }
                );
            }
        } catch (error) {
            console.error('[ScheduleBot] Error searching groups:', error);
            await ctx.reply(formatter.formatError('Ошибка поиска групп'), { parse_mode: 'HTML' });
        }
    });

    return bot;
}

/**
 * Handle today's schedule request
 */
async function handleTodaySchedule(ctx) {
    const userId = ctx.from.id;
    const user = storage.getUser(userId);

    if (!user || !user.groupId) {
        await ctx.reply(
            `${emoji.cross} Сначала выберите группу`,
            {
                parse_mode: 'HTML',
                ...getMainKeyboard(false)
            }
        );
        return;
    }

    await ctx.reply(`${emoji.clock} Загружаю расписание...`);

    try {
        // Use new parser API that returns { day, currentWeek }
        const { day, currentWeek } = await getScheduleForDay(user.groupId, user.groupCode);
        const message = formatter.formatToday(day, currentWeek, user.groupName || user.groupCode);

        await ctx.reply(message, {
            parse_mode: 'HTML',
            ...getMainKeyboard(true, user.subscribed)
        });
    } catch (error) {
        console.error('[ScheduleBot] Error fetching today schedule:', error);
        await ctx.reply(formatter.formatError('Не удалось загрузить расписание. Попробуйте позже.'), { parse_mode: 'HTML' });
    }
}

/**
 * Handle weekly schedule request
 */
async function handleWeekSchedule(ctx) {
    const userId = ctx.from.id;
    const user = storage.getUser(userId);

    if (!user || !user.groupId) {
        await ctx.reply(
            `${emoji.cross} Сначала выберите группу`,
            {
                parse_mode: 'HTML',
                ...getMainKeyboard(false)
            }
        );
        return;
    }

    await ctx.reply(`${emoji.clock} Загружаю расписание...`);

    try {
        // Use new parser API that returns { schedule, currentWeek }
        const { schedule, currentWeek } = await getWeeklySchedule(user.groupId, user.groupCode);
        const message = formatter.formatSchedule(schedule, currentWeek, user.groupName || user.groupCode);

        // Split long messages if needed
        if (message.length > settings.messages.maxLength) {
            const parts = splitMessage(message);
            for (let i = 0; i < parts.length; i++) {
                const opts = i === parts.length - 1
                    ? { parse_mode: 'HTML', ...getMainKeyboard(true, user.subscribed) }
                    : { parse_mode: 'HTML' };
                await ctx.reply(parts[i], opts);
            }
        } else {
            await ctx.reply(message, {
                parse_mode: 'HTML',
                ...getMainKeyboard(true, user.subscribed)
            });
        }
    } catch (error) {
        console.error('[ScheduleBot] Error fetching schedule:', error);
        await ctx.reply(formatter.formatError('Не удалось загрузить расписание. Попробуйте позже.'), { parse_mode: 'HTML' });
    }
}

/**
 * Show group selection with pagination
 * @param {Context} ctx - Telegram context
 * @param {number} page - Page number (0-indexed)
 * @param {boolean} [edit=false] - Whether to edit existing message
 */
async function showGroupSelection(ctx, page, edit = false) {
    try {
        const groups = await fetchGroups();
        const perPage = settings.pagination.groupsPerPage;
        const totalPages = Math.ceil(groups.length / perPage);
        const currentPage = Math.min(page, totalPages - 1);

        const start = currentPage * perPage;
        const end = Math.min(start + perPage, groups.length);
        const pageGroups = groups.slice(start, end);

        // Create group buttons
        const buttons = pageGroups.map(group =>
            [Markup.button.callback(group.fullName, `select_group_${group.id}`)]
        );

        // Pagination buttons
        const navButtons = [];
        if (currentPage > 0) {
            navButtons.push(Markup.button.callback(`${emoji.back} Назад`, `groups_page_${currentPage - 1}`));
        }
        if (currentPage < totalPages - 1) {
            navButtons.push(Markup.button.callback(`Далее ${emoji.forward}`, `groups_page_${currentPage + 1}`));
        }
        if (navButtons.length > 0) {
            buttons.push(navButtons);
        }

        const text = formatter.formatGroupPrompt(groups.length) + `\n\nСтраница ${currentPage + 1}/${totalPages}`;

        if (edit) {
            await ctx.editMessageText(text, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
        } else {
            await ctx.reply(text, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(buttons)
            });
        }
    } catch (error) {
        console.error('[ScheduleBot] Error showing group selection:', error);
        await ctx.reply(formatter.formatError('Не удалось загрузить список групп'), { parse_mode: 'HTML' });
    }
}

/**
 * Split long message into parts
 * @param {string} message - Message to split
 * @returns {string[]} Array of message parts
 */
function splitMessage(message) {
    const maxLength = settings.messages.maxLength - 100; // Leave some margin
    const parts = [];
    let current = '';

    const lines = message.split('\n');
    for (const line of lines) {
        if ((current + '\n' + line).length > maxLength && current.length > 0) {
            parts.push(current.trim());
            current = line;
        } else {
            current += (current ? '\n' : '') + line;
        }
    }

    if (current.trim()) {
        parts.push(current.trim());
    }

    return parts;
}

export default { createBot };
