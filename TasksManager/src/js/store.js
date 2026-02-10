class Store {
    constructor() {
        this.data = { categories: [], tasks: [], settings: { uiFontSize: 'medium', editorFontSize: 'medium' } };
    }

    async init() {
        const resp = await fetch('/api/data');
        this.data = await resp.json();
        return this.data;
    }

    // CATEGORIES
    async addCategory(name) {
        const resp = await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const cat = await resp.json();
        this.data.categories.push(cat);
        this._notify();
        return cat;
    }

    async updateCategory(id, updates) {
        const resp = await fetch(`/api/categories/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        const updated = await resp.json();
        const idx = this.data.categories.findIndex(c => c.id === id);
        if (idx !== -1) this.data.categories[idx] = updated;
        this._notify();
    }

    async deleteCategory(id) {
        await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        // Move tasks to default locally
        this.data.tasks.forEach(t => {
            if (t.categoryId === id) t.categoryId = 'default';
        });
        this.data.categories = this.data.categories.filter(c => c.id !== id);
        this._notify();
    }

    // TASKS
    async addTask(categoryId, title = 'Новая задача') {
        const resp = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId, title })
        });
        const task = await resp.json();
        this.data.tasks.push(task);
        this._notify();
        return task;
    }

    async updateTask(id, updates) {
        const resp = await fetch(`/api/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        const updated = await resp.json();
        const idx = this.data.tasks.findIndex(t => t.id === id);
        if (idx !== -1) this.data.tasks[idx] = updated;
        this._notify();
        return updated;
    }

    async uploadMedia(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const resp = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: file.name,
                            data: reader.result.split(',')[1],
                            type: file.type
                        })
                    });
                    const result = await resp.json();
                    if (result.url) resolve(result.url);
                    else reject(new Error('Upload failed'));
                } catch (e) {
                    reject(e);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async deleteTask(id) {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        this.data.tasks = this.data.tasks.filter(t => t.id !== id);
        this._notify();
    }

    async updateSettings(updates) {
        const resp = await fetch('/api/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        this.data.settings = await resp.json();
        this._notify();
    }

    async reorder(type, items) {
        await fetch('/api/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, items })
        });
        // Update local state is complex, better to just let it sit or re-render if needed.
        // Actually for D&D, we usually update UI immediately, then sync.
        // We'll trust the caller to update local data if needed for immediate feedback.
    }

    _notify() {
        window.dispatchEvent(new CustomEvent('store-updated', { detail: this.data }));
    }

    getCategories() { return this.data.categories; }
    getTasks() { return this.data.tasks; }
    getTasksByCategoryId(catId) { return this.data.tasks.filter(t => t.categoryId === catId); }
}

const store = new Store();
