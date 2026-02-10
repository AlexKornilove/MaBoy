class App {
    constructor() {
        this.activeTaskId = null;
        this.saveTimeout = null;
        this.draggedItem = null;
        this.init();
    }

    async init() {
        this.cacheElements();
        this.bindEvents();
        await store.init();
        this.render();
    }

    cacheElements() {
        this.el = {
            categoriesContainer: document.getElementById('categories-container'),
            workspace: document.getElementById('workspace'),
            activeTaskPane: document.getElementById('active-task-pane'),
            emptyWorkspace: document.getElementById('empty-workspace'),
            taskContentEditor: document.getElementById('task-content-editor'),
            taskCategoryLabel: document.getElementById('task-category-label'),

            addCategoryBtn: document.getElementById('add-category-btn'),
            addTaskBtn: document.getElementById('add-task-btn'),

            modalContainer: document.getElementById('modal-container'),
            modalInput: document.getElementById('modal-input'),
            modalConfirm: document.getElementById('modal-confirm'),
            modalCancel: document.getElementById('modal-cancel'),
            modalTitle: document.getElementById('modal-title'),

            taskStatusToggle: document.getElementById('task-status-toggle'),
            toolbarImageBtn: document.getElementById('toolbar-image-btn'),
            mediaUploadInput: document.getElementById('media-upload-input'),

            fontSizeSelect: document.getElementById('editor-font-size-select'),
            pageFormatSelect: document.getElementById('editor-page-format-select'),

            tableBtn: document.getElementById('toolbar-table-btn'),
            checklistBtn: document.getElementById('toolbar-checklist-btn'),
            footnoteBtn: document.getElementById('toolbar-footnote-btn'),

            dashboardView: document.getElementById('dashboard-view'),
            dashboardStats: document.getElementById('dashboard-stats'),
            allTasksList: document.getElementById('all-tasks-list'),

            resizer: document.getElementById('sidebar-resizer'),
            sidebar: document.getElementById('sidebar'),
            fontControls: document.querySelectorAll('.font-controls'),
            taskTitleInput: document.getElementById('task-title-input'),
            documentViewport: document.getElementById('document-viewport'),
            headingSelect: document.getElementById('editor-heading-select'),
            textColorInput: document.getElementById('toolbar-text-color'),
            highlightColorInput: document.getElementById('toolbar-highlight-color')
        };
        this.isTitleFocused = false;
        this.selectedHr = null;
        this.lastActiveTableCell = null;
        this.activeTable = null;
        this.rowToolbar = null;
        this.colToolbar = null;
    }

    bindEvents() {
        document.getElementById('home-btn')?.addEventListener('click', () => {
            this.activeTaskId = null;
            this.render();
        });

        this.el.addTaskBtn.addEventListener('click', () => this.handleQuickAddTask());
        this.el.addCategoryBtn.addEventListener('click', () => this.handleNewCategory());
        this.el.taskStatusToggle.addEventListener('click', () => this.handleToggleActiveTaskStatus());

        this.el.taskTitleInput.addEventListener('input', () => {
            this.debounceSave(true); // Faster sync for title
        });

        this.el.taskTitleInput.addEventListener('focus', () => this.isTitleFocused = true);
        this.el.taskTitleInput.addEventListener('blur', () => this.isTitleFocused = false);

        // Prevent Enter in title (single-line behavior)
        this.el.taskTitleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.el.taskContentEditor.focus();
            }
        });

        this.el.taskContentEditor.addEventListener('input', () => {
            this.debounceSave();
        });

        this.el.taskContentEditor.addEventListener('dragover', (e) => e.preventDefault());
        this.el.taskContentEditor.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files.length > 0) this.handleFileUpload(files[0]);
        });

        this.el.taskContentEditor.addEventListener('click', (e) => {
            if (e.target.classList.contains('checklist-checkbox')) {
                const item = e.target.closest('.checklist-item');
                item.classList.toggle('checked');
                this.saveActiveTask();
            }


            // Focus media wrapper on click to enable backspace deletion
            const wrapper = e.target.closest('.resizable-media-wrapper');
            if (wrapper) {
                // Focus the wrapper
                wrapper.focus();
            }
        });

        this.el.taskContentEditor.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                if (document.activeElement.classList.contains('resizable-media-wrapper')) {
                    e.preventDefault();
                    document.activeElement.remove();
                    this.saveActiveTask();
                }
            }
        });

        this.el.toolbarImageBtn.addEventListener('click', () => this.el.mediaUploadInput.click());
        this.el.mediaUploadInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) this.handleFileUpload(e.target.files[0]);
        });

        this.el.tableBtn?.addEventListener('click', () => this.handleInsertTable());
        this.el.checklistBtn?.addEventListener('click', () => this.handleInsertChecklist());
        this.el.footnoteBtn?.addEventListener('click', () => this.handleInsertFootnote());

        this.el.fontSizeSelect?.addEventListener('change', (e) => {
            document.execCommand('fontSize', false, e.target.value);
        });

        this.el.headingSelect?.addEventListener('change', (e) => {
            document.execCommand('formatBlock', false, e.target.value || 'P');
        });

        this.el.textColorInput?.addEventListener('input', (e) => {
            this.el.taskContentEditor.focus();
            document.execCommand('foreColor', false, e.target.value);
        });

        this.el.highlightColorInput?.addEventListener('input', (e) => {
            this.el.taskContentEditor.focus();
            document.execCommand('hiliteColor', false, e.target.value);
        });

        this.el.pageFormatSelect?.addEventListener('change', (e) => {
            if (this.activeTaskId) {
                store.updateTask(this.activeTaskId, { pageFormat: e.target.value });
            }
        });

        this.el.modalCancel.addEventListener('click', () => this.el.modalContainer.classList.add('hidden'));

        window.addEventListener('store-updated', () => this.render());

        this.el.fontControls.forEach(group => {
            group.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (btn) {
                    const size = btn.dataset.size;
                    const setting = group.dataset.setting;
                    store.updateSettings({ [setting]: size });
                }
            });
        });
        this.initToolbarScrolling();
        this.initDragAndDrop();
        this.initResizer();
        this.initMediaResizers();
        this.initTableControls();
        this.initHrControls();
    }

    initToolbarScrolling() {
        const toolbar = document.querySelector('#editor-toolbar');
        if (!toolbar) return;
        toolbar.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                toolbar.scrollLeft += e.deltaY;
            }
        });
    }

    updateToolbarState() {
        const buttons = document.querySelectorAll('#editor-toolbar button[data-command]');
        buttons.forEach(btn => {
            const command = btn.dataset.command;
            try {
                const isActive = document.queryCommandState(command);
                btn.classList.toggle('active', isActive);
            } catch (e) { }
        });

        // Also update selects if possible
        const headingSelect = document.getElementById('editor-heading-select');
        if (headingSelect) {
            const val = document.queryCommandValue('formatBlock');
            headingSelect.value = (val === 'p' || val === 'div' || !val) ? '' : val.toUpperCase();
        }

        const fontSizeSelect = document.getElementById('editor-font-size-select');
        if (fontSizeSelect) {
            const val = document.queryCommandValue('fontSize');
            if (val) fontSizeSelect.value = val;
        }
    }

    initTableControls() {
        const rowToolbar = document.createElement('div');
        rowToolbar.className = 'table-controls-toolbar row-controls';
        rowToolbar.innerHTML = `
            <button class="table-control-btn" data-action="add-row" title="Добавить строку"><i class="fa-solid fa-plus"></i></button>
            <button class="table-control-btn" data-action="del-row" title="Удалить строку"><i class="fa-solid fa-minus"></i></button>
        `;
        document.body.appendChild(rowToolbar);
        this.rowToolbar = rowToolbar;

        const colToolbar = document.createElement('div');
        colToolbar.className = 'table-controls-toolbar col-controls';
        colToolbar.innerHTML = `
            <button class="table-control-btn" data-action="del-col" title="Удалить колонку"><i class="fa-solid fa-minus"></i></button>
            <button class="table-control-btn" data-action="add-col" title="Добавить колонку"><i class="fa-solid fa-plus"></i></button>
            <button class="table-control-btn danger" data-action="del-table" title="Удалить таблицу"><i class="fa-solid fa-trash-can"></i></button>
        `;
        document.body.appendChild(colToolbar);
        this.colToolbar = colToolbar;

        const positionToolbars = (table) => {
            if (!table) return;
            const rect = table.getBoundingClientRect();

            // Row controls: Bottom-Left
            rowToolbar.style.left = rect.left + 'px'; // Align with left edge
            rowToolbar.style.top = (rect.bottom + 10) + 'px'; // Below the table
            rowToolbar.classList.add('visible');

            // Col controls: Top-Right
            colToolbar.style.left = (rect.right + 10) + 'px'; // Offset slightly right
            colToolbar.style.top = rect.top + 'px'; // At the top
            colToolbar.classList.add('visible');
        };

        const hideToolbars = () => {
            rowToolbar.classList.remove('visible');
            colToolbar.classList.remove('visible');
        };

        const handleTableAction = (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            let cell = this.lastActiveTableCell;
            let table = this.activeTable;

            // If we have a stored table but no selected cell (or cell is from another table)
            if (table && (!cell || !table.contains(cell))) {
                // Fallback: use first cell of last row for row actions, or last cell of first row for col actions
                // Actually, the logic below handles insertion indices.
            } else if (cell) {
                table = cell.closest('table');
            }

            if (!table) return;

            const row = cell ? cell.closest('tr') : table.rows[table.rows.length - 1];
            const rowIndex = row ? row.rowIndex : table.rows.length - 1;
            const cellIndex = cell ? cell.cellIndex : (row ? row.cells.length - 1 : 0);

            e.preventDefault();
            e.stopPropagation();

            switch (btn.dataset.action) {
                case 'add-row':
                    const newRow = table.insertRow(rowIndex + 1);
                    const refRow = table.rows[rowIndex] || table.rows[0];
                    for (let i = 0; i < refRow.cells.length; i++) {
                        newRow.insertCell(i).innerHTML = '<br>';
                    }
                    break;
                case 'del-row':
                    if (table.rows.length > 1) table.deleteRow(rowIndex);
                    else table.remove();
                    break;
                case 'add-col':
                    for (let i = 0; i < table.rows.length; i++) {
                        table.rows[i].insertCell(cellIndex + 1).innerHTML = '<br>';
                    }
                    break;
                case 'del-col':
                    if (table.rows[0].cells.length > 1) {
                        for (let i = 0; i < table.rows.length; i++) {
                            table.rows[i].deleteCell(cellIndex);
                        }
                    } else {
                        table.remove();
                    }
                    break;
                case 'del-table':
                    table.remove();
                    hideToolbars();
                    break;
            }
            this.saveActiveTask();
            // Reposition toolbars immediately if table still exists
            if (document.contains(table)) {
                setTimeout(() => positionToolbars(table), 0);
            } else {
                hideToolbars();
            }
        };

        rowToolbar.addEventListener('click', handleTableAction);
        colToolbar.addEventListener('click', handleTableAction);

        // Track active cell and show/hide toolbars
        document.addEventListener('selectionchange', () => {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            let node = selection.anchorNode;
            if (node.nodeType === 3) node = node.parentNode;

            const cell = node.closest('td, th');
            const editorStart = node.closest('#task-content-editor');

            if (editorStart && (cell || node.closest('table'))) {
                const table = cell ? cell.closest('table') : node.closest('table');
                this.activeTable = table;
                this.lastActiveTableCell = cell;
                positionToolbars(table);
            } else {
                setTimeout(() => {
                    const activeEl = document.activeElement;
                    if (!activeEl.closest('.table-controls-toolbar')) {
                        hideToolbars();
                        this.activeTable = null;
                    }
                }, 100);
            }

            this.updateToolbarState();
        });
    }

    initHrControls() {
        this.el.taskContentEditor.addEventListener('click', (e) => {
            if (e.target.tagName === 'HR') {
                if (this.selectedHr) this.selectedHr.classList.remove('focused');
                this.selectedHr = e.target;
                this.selectedHr.classList.add('focused');
                // Ensure editor has focus to catch keydown
                // Actually if we focus editor, the selection might move. 
                // HR isn't focusable by default. Let's make it so?
                // Or just rely on the variable.
            } else {
                if (this.selectedHr) {
                    this.selectedHr.classList.remove('focused');
                    this.selectedHr = null;
                }
            }
        });

        this.el.taskContentEditor.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                if (this.selectedHr) {
                    e.preventDefault();
                    this.selectedHr.remove();
                    this.selectedHr = null;
                    this.saveActiveTask();
                }
            }
        });
    }

    // TASK ACTIONS
    async handleQuickAddTask() {
        const categories = store.getCategories();
        if (categories.length === 0) await store.addCategory('Входящие');
        const targetCat = categories.find(c => c.id === 'default') || categories[0];
        const task = await store.addTask(targetCat.id);
        this.selectTask(task.id);
    }

    async handleToggleActiveTaskStatus() {
        if (!this.activeTaskId) return;
        const task = store.getTasks().find(t => t.id === this.activeTaskId);
        if (!task) return;
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        await store.updateTask(this.activeTaskId, { status: newStatus });
    }

    async handleFileUpload(file) {
        try {
            const url = await store.uploadMedia(file);
            const type = file.type.startsWith('image/') ? 'img' : 'video';
            const html = type === 'img'
                ? `<div class="resizable-media-wrapper" contenteditable="false" tabindex="0" ondragstart="return false;"><img src="${url}"><div class="resizer-handle"></div></div>`
                : `<div class="resizable-media-wrapper" contenteditable="false" tabindex="0" ondragstart="return false;"><video src="${url}" controls ondragstart="return false;"></video><div class="resizer-handle"></div></div>`;

            this.el.taskContentEditor.focus();
            document.execCommand('insertHTML', false, html + '<p><br></p>');
            this.saveActiveTask();
        } catch (e) {
            console.error('Upload failed', e);
            alert('Ошибка загрузки файла');
        }
    }

    // EDITOR ELEMENTS
    handleInsertTable() {
        const html = `
            <table class="editor-table">
                <tr><th>Заголовок</th><th>Заголовок</th></tr>
                <tr><td>Текст</td><td>Текст</td></tr>
            </table>
            <p><br></p>
        `;
        this.el.taskContentEditor.focus();
        document.execCommand('insertHTML', false, html);
        this.saveActiveTask();
    }

    handleInsertChecklist() {
        const html = `
            <div class="checklist-item">
                <div class="checklist-checkbox" contenteditable="false"></div>
                <div class="checklist-text">Новый пункт</div>
            </div>
            <p><br></p>
        `;
        this.el.taskContentEditor.focus();
        document.execCommand('insertHTML', false, html);
        this.saveActiveTask();
    }

    handleInsertFootnote() {
        const noteId = Date.now().toString().slice(-4);
        const html = `<a href="#fn-${noteId}" id="ref-${noteId}" class="footnote-ref" contenteditable="false">[${noteId}]</a>`;
        this.el.taskContentEditor.focus();
        document.execCommand('insertHTML', false, html);
        this.saveActiveTask();
    }

    // RENDERING
    selectTask(id) {
        this.activeTaskId = id;
        if (this.el.documentViewport) {
            this.el.documentViewport.scrollTop = 0;
        }
        this.render();
    }

    render() {
        this.applySettings();
        this.renderSidebar();
        this.renderWorkspace();
    }

    applySettings() {
        const settings = store.data.settings;
        if (!settings) return;
        const uiMap = { small: '12px', medium: '14px', large: '18px', xlarge: '22px' };
        document.documentElement.style.setProperty('--ui-font-size', uiMap[settings.uiFontSize || 'medium']);

        this.el.fontControls.forEach(group => {
            const setting = group.dataset.setting;
            const activeSize = settings[setting];
            group.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.size === activeSize);
            });
        });
    }

    renderSidebar() {
        const categories = [...store.getCategories()].sort((a, b) => (a.order || 0) - (b.order || 0));
        const allTasks = [...store.getTasks()].sort((a, b) => (a.order || 0) - (b.order || 0));

        this.el.categoriesContainer.innerHTML = '';

        categories.forEach(cat => {
            const group = document.createElement('div');
            group.className = `category-group ${cat.collapsed ? 'collapsed' : ''}`;
            group.draggable = true;
            group.dataset.id = cat.id;
            group.dataset.type = 'category';

            const catTasks = allTasks.filter(t => t.categoryId === cat.id);

            group.innerHTML = `
                <div class="category-item" onclick="app.toggleCategory('${cat.id}')">
                    <span class="category-toggle">▾</span>
                    <span class="category-name">${cat.name}</span>
                    <div class="category-actions">
                        <button class="cat-action-btn" onclick="event.stopPropagation(); app.handleAddTaskTo('${cat.id}')" title="Добавить задачу">+</button>
                        <button class="cat-action-btn" onclick="event.stopPropagation(); app.handleEditCategory('${cat.id}')" title="Настройки">⚙️</button>
                        <button class="cat-action-btn danger" onclick="event.stopPropagation(); app.handleDeleteCategory('${cat.id}')" title="Удалить">×</button>
                    </div>
                </div>
                <div class="task-list-nested">
                    ${catTasks.map(t => `
                        <div class="sidebar-task-item ${t.id === this.activeTaskId ? 'active' : ''} ${t.status === 'done' ? 'done' : ''}" 
                             draggable="true" data-id="${t.id}" data-type="task"
                             onclick="event.stopPropagation(); app.selectTask('${t.id}')">
                            <div class="sidebar-completion-box" onclick="app.handleToggleTaskStatus('${t.id}', event)"></div>
                            <span class="task-title-text">${this.stripHtml(t.title)}</span>
                            <div class="task-actions">
                                <button class="task-action-btn" onclick="event.stopPropagation(); app.handleRenameTask('${t.id}')" title="Переименовать">✎</button>
                                <button class="task-action-btn danger" onclick="event.stopPropagation(); app.handleDeleteTask('${t.id}')" title="Удалить">×</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            this.el.categoriesContainer.appendChild(group);
        });

        // Uncategorized tasks
        const uncategorizedTasks = allTasks.filter(t => !categories.find(c => c.id === t.categoryId));
        if (uncategorizedTasks.length > 0) {
            const group = document.createElement('div');
            group.className = 'category-group';
            group.innerHTML = `
                <div class="category-item"><span class="category-name">Без категории</span></div>
                <div class="task-list-nested">
                    ${uncategorizedTasks.map(t => `
                        <div class="sidebar-task-item ${t.id === this.activeTaskId ? 'active' : ''} ${t.status === 'done' ? 'done' : ''}" 
                             draggable="true" data-id="${t.id}" data-type="task"
                             onclick="event.stopPropagation(); app.selectTask('${t.id}')">
                            <div class="sidebar-completion-box" onclick="app.handleToggleTaskStatus('${t.id}', event)"></div>
                            <span class="task-title-text">${this.stripHtml(t.title)}</span>
                            <div class="task-actions">
                                <button class="task-action-btn" onclick="event.stopPropagation(); app.handleRenameTask('${t.id}')" title="Переименовать">✎</button>
                                <button class="task-action-btn danger" onclick="event.stopPropagation(); app.handleDeleteTask('${t.id}')" title="Удалить">×</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            this.el.categoriesContainer.appendChild(group);
        }
    }

    renderWorkspace() {
        if (!this.activeTaskId) {
            this.el.activeTaskPane.classList.add('hidden');
            this.el.emptyWorkspace.classList.add('hidden');
            this.el.dashboardView.classList.remove('hidden');
            this.renderDashboard();
            return;
        }

        const task = store.getTasks().find(t => t.id === this.activeTaskId);
        if (!task) { this.activeTaskId = null; return this.renderWorkspace(); }

        this.el.dashboardView.classList.add('hidden');
        this.el.emptyWorkspace.classList.add('hidden');
        this.el.activeTaskPane.classList.remove('hidden');

        const format = task.pageFormat || 'format-free';
        this.el.workspace.className = format;
        if (this.el.pageFormatSelect) this.el.pageFormatSelect.value = format;

        if (this.el.pageFormatSelect) this.el.pageFormatSelect.value = format;

        if (!this.isTitleFocused) {
            this.el.taskTitleInput.innerHTML = task.title || '';
        }

        // Only update innerHTML if focus is NOT inside the editor (to prevent video reset/cursor jump)
        if (!this.el.taskContentEditor.contains(document.activeElement)) {
            this.el.taskContentEditor.innerHTML = task.content || '';
        }

        this.el.taskStatusToggle.classList.toggle('done', task.status === 'done');
        const category = store.getCategories().find(c => c.id === task.categoryId);
        this.el.taskCategoryLabel.innerText = category ? category.name : 'Без категории';
    }

    renderDashboard() {
        const tasks = store.getTasks();
        this.el.dashboardStats.innerText = `Всего задач: ${tasks.length}`;
        this.el.allTasksList.innerHTML = tasks.map(task => {
            const snippet = this.stripHtml(task.content).substring(0, 100);
            return `
                <div class="dashboard-task-card ${task.status === 'done' ? 'done' : ''}" onclick="app.selectTask('${task.id}')">
                    <div class="task-card-info">
                        <div class="task-card-title">${this.stripHtml(task.title)}</div>
                        <div class="task-card-meta">${snippet}${snippet.length >= 100 ? '...' : ''}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    stripHtml(html) {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    // DRAG AND DROP
    initDragAndDrop() {
        const container = this.el.categoriesContainer;

        container.addEventListener('dragstart', (e) => {
            const item = e.target.closest('[draggable="true"]');
            if (item) {
                this.draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.setData('text/plain', item.dataset.id);
            }
        });

        container.addEventListener('dragend', () => {
            this.draggedItem?.classList.remove('dragging');
            this.draggedItem = null;
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const target = e.target.closest('[draggable="true"]');
            if (target && target !== this.draggedItem) {
                target.classList.add('drag-over');
            }
        });

        container.addEventListener('dragleave', (e) => {
            const target = e.target.closest('[draggable="true"]');
            target?.classList.remove('drag-over');
        });

        container.addEventListener('drop', async (e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            const target = e.target.closest('[draggable="true"]');

            if (!target || !id) return;

            const type = this.draggedItem.dataset.type;
            const targetId = target.dataset.id;
            const targetType = target.dataset.type;

            if (type === 'category' && targetType === 'category') {
                const cats = store.getCategories();
                const fromIdx = cats.findIndex(c => c.id === id);
                let toIdx = cats.findIndex(c => c.id === targetId);

                // If moving down, the index needs adjustment because removal shifts subsequent items
                // But simplified: we want to insert AFTER the target.
                // 1. Remove item
                const [moved] = cats.splice(fromIdx, 1);
                // 2. Find target index again (it might have shifted if fromIdx < toIdx)
                toIdx = cats.findIndex(c => c.id === targetId);
                // 3. Insert +1 (after)
                cats.splice(toIdx + 1, 0, moved);

                const reorderItems = cats.map((c, i) => ({ id: c.id, order: i }));
                await store.reorder('categories', reorderItems);
                this.render();
            } else if (type === 'task') {
                const tasks = store.getTasks();
                const fromTask = tasks.find(t => t.id === id);
                let newCatId = fromTask.categoryId;
                let targetOrder = 0;

                if (targetType === 'category') {
                    // Drop on category -> Move to category, append to end (or top?)
                    // Let's append to top (order 0) or end? User said "under".
                    // If dropping ON category header, maybe just minimal order?
                    newCatId = targetId;
                    // We don't have accurate 'after' logic for category header drop, usually means "into"
                    // But we can reset order to 0 to put it at top, or max to put at bottom
                    targetOrder = 0; // Default to top of new category
                } else if (targetType === 'task') {
                    const toTask = tasks.find(t => t.id === targetId);
                    newCatId = toTask.categoryId;
                    targetOrder = (toTask.order || 0) + 1; // Insert AFTER target
                }

                fromTask.categoryId = newCatId;
                fromTask.order = targetOrder;

                // We need to re-normalize orders in that category to avoid collisions
                // Simple approach: get all tasks in that category, sort by order, splice in, re-assign
                const catTasks = tasks.filter(t => t.categoryId === newCatId && t.id !== id).sort((a, b) => (a.order || 0) - (b.order || 0));

                if (targetType === 'task') {
                    // Find index of target in specific category list
                    const targetIndex = catTasks.findIndex(t => t.id === targetId);
                    // Insert after
                    catTasks.splice(targetIndex + 1, 0, fromTask);
                } else {
                    // Dropped on category -> Add to top
                    catTasks.unshift(fromTask);
                }

                // Update all orders
                const reorderItems = catTasks.map((t, i) => ({ id: t.id, order: i, categoryId: newCatId }));
                await store.reorder('tasks', reorderItems);
                this.render();
            }
        });
    }

    handleAddTaskTo(catId) {
        store.addTask(catId).then(t => this.selectTask(t.id));
    }

    async handleToggleTaskStatus(id, e) {
        if (e) e.stopPropagation();
        const task = store.getTasks().find(t => t.id === id);
        if (!task) return;
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        await store.updateTask(id, { status: newStatus });
    }

    handleRenameTask(id) {
        const task = store.getTasks().find(t => t.id === id);
        this.openModal('Переименовать задачу', task.title, (val, emoji) => {
            const newTitle = emoji ? `${emoji} ${val}` : val;
            store.updateTask(id, { title: newTitle });
            if (this.activeTaskId === id) {
                this.el.taskTitleInput.innerText = newTitle;
            }
        });
    }

    handleDeleteTask(id) {
        if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
            store.deleteTask(id);
            if (this.activeTaskId === id) this.activeTaskId = null;
        }
    }

    handleDeleteCategory(id) {
        if (confirm('Удалить категорию? Задачи из неё будут перемещены во "Входящие".')) {
            store.deleteCategory(id);
            // After deletion, store-updated will trigger render
        }
    }

    // MODALS & HELPERS
    handleNewCategory() {
        this.openModal('Новая категория', '', (val, emoji) => {
            store.addCategory(emoji ? `${emoji} ${val}` : val);
        });
    }

    handleEditCategory(id) {
        const cat = store.getCategories().find(c => c.id === id);
        this.openModal('Настройки категории', cat.name, (val, emoji) => {
            store.updateCategory(id, { name: emoji ? `${emoji} ${val}` : val });
        }, true); // Allow delete in modal
    }

    openModal(title, initialValue, onConfirm, showDelete = false) {
        this.el.modalTitle.innerText = title;
        this.el.modalInput.value = initialValue;
        this.el.modalContainer.classList.remove('hidden');
        this.el.modalInput.focus();

        let selectedEmoji = '';
        const emojiBtn = document.createElement('button');
        emojiBtn.className = 'modal-emoji-trigger';
        emojiBtn.innerText = '😀';
        emojiBtn.onclick = (e) => this.showEmojiPicker(e, (em) => {
            selectedEmoji = em;
            emojiBtn.innerText = em;
        });

        const inputGroup = this.el.modalInput.parentElement;
        const oldBtn = inputGroup.querySelector('.modal-emoji-trigger');
        if (oldBtn) oldBtn.remove();
        inputGroup.appendChild(emojiBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'danger-icon-btn';
        deleteBtn.innerText = 'Удалить';
        deleteBtn.style.display = showDelete ? 'block' : 'none';
        deleteBtn.onclick = () => {
            if (confirm('Вы уверены?')) {
                const id = store.getCategories().find(c => c.name === initialValue)?.id;
                if (id) store.deleteCategory(id);
                this.el.modalContainer.classList.add('hidden');
            }
        };

        const confirmHandler = () => {
            const val = this.el.modalInput.value.trim();
            if (val) onConfirm(val, selectedEmoji);
            this.el.modalContainer.classList.add('hidden');
            this.el.modalConfirm.removeEventListener('click', confirmHandler);
        };

        this.el.modalConfirm.addEventListener('click', confirmHandler, { once: true });
    }

    showEmojiPicker(e, onSelect) {
        e.stopPropagation();
        document.getElementById('temp-emoji-picker')?.remove();
        const picker = document.createElement('div');
        picker.id = 'temp-emoji-picker';
        picker.className = 'premium-picker';
        picker.style.position = 'fixed';
        picker.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
        picker.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';

        ['✅', '📌', '🔥', '⭐️', '🎯', '🚀', '🛠', '💡', '📅', '📝', '📂', '📉', '😀', '😂', '🤔', '😎', '👍', '🚩'].forEach(emoji => {
            const btn = document.createElement('button');
            btn.innerText = emoji;
            btn.onclick = () => { onSelect(emoji); picker.remove(); };
            picker.appendChild(btn);
        });
        document.body.appendChild(picker);
        setTimeout(() => window.addEventListener('click', () => picker.remove(), { once: true }), 0);
    }

    debounceSave(fast = false) {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveActiveTask(), fast ? 200 : 1000);
    }

    async saveActiveTask() {
        if (!this.activeTaskId) return;
        const title = this.el.taskTitleInput.innerHTML.trim() || 'Без названия';
        console.log('[DEBUG] Saving active task. Title (HTML):', title);
        const content = this.el.taskContentEditor.innerHTML;
        await store.updateTask(this.activeTaskId, { title, content });
        // The store-updated listener will handle the sidebar update
    }

    initResizer() {
        let isResizing = false;
        this.el.resizer.addEventListener('mousedown', () => isResizing = true);
        window.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const width = Math.max(150, Math.min(600, e.clientX));
            this.el.sidebar.style.width = width + 'px';
        });
        window.addEventListener('mouseup', () => isResizing = false);
    }

    initMediaResizers() {
        this.el.workspace.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resizer-handle')) {
                e.preventDefault();
                e.stopPropagation();

                document.body.classList.add('is-resizing'); // Enable CSS shield
                const wrapper = e.target.closest('.resizable-media-wrapper');
                wrapper.classList.add('resizing');
                const startX = e.clientX;
                const startWidth = wrapper.offsetWidth;

                const onMove = (mv) => {
                    mv.preventDefault();
                    const newWidth = startWidth + (mv.clientX - startX);
                    if (newWidth > 50) {
                        wrapper.style.width = newWidth + 'px';
                    }
                };

                const onUp = (up) => {
                    up.preventDefault();
                    up.stopPropagation();
                    document.body.classList.remove('is-resizing'); // Disable CSS shield
                    wrapper.classList.remove('resizing');
                    document.removeEventListener('mousemove', onMove, true);
                    document.removeEventListener('mouseup', onUp, true);
                    this.saveActiveTask();
                };

                document.addEventListener('mousemove', onMove, true);
                document.addEventListener('mouseup', onUp, true);
            }
        }, true);
    }

    toggleCategory(id) {
        const cat = store.getCategories().find(c => c.id === id);
        if (cat) store.updateCategory(id, { collapsed: !cat.collapsed });
    }
}
const app = new App();
