const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8081;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'maboy_data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

const COMPLETED_CAT_ID = 'system-completed';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOADS_DIR));

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const readData = () => {
    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (!data.categories) data.categories = [{ id: 'default', name: 'Входящие', collapsed: false, order: 0 }];

        // Ensure "Completed" category exists by name if ID missing, or just ensure it exists
        if (!data.categories.find(c => c.id === COMPLETED_CAT_ID)) {
            data.categories.push({ id: COMPLETED_CAT_ID, name: 'Выполненные', collapsed: false, order: 1000 });
        }

        if (!data.tasks) data.tasks = [];
        if (!data.settings) data.settings = { uiFontSize: 'medium', pageFormat: 'format-free' };
        return data;
    } catch (e) {
        return {
            categories: [
                { id: 'default', name: 'Входящие', collapsed: false, order: 0 },
                { id: COMPLETED_CAT_ID, name: 'Выполненные', collapsed: false, order: 1000 }
            ],
            tasks: [],
            settings: { uiFontSize: 'medium', pageFormat: 'format-free' }
        };
    }
};

const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
writeData(readData());

// SETTINGS
app.patch('/api/settings', (req, res) => {
    const data = readData();
    data.settings = { ...data.settings, ...req.body };
    writeData(data);
    res.json(data.settings);
});

// UPLOAD API (Simple Base64 handler for GIF/Images)
app.post('/api/upload', (req, res) => {
    const { name, data, type } = req.body;
    if (!data) return res.status(400).json({ error: 'No data' });

    const fileName = `${Date.now()}-${name}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    const buffer = Buffer.from(data, 'base64');

    fs.writeFileSync(filePath, buffer);
    res.json({ url: `/uploads/${fileName}` });
});

// CATEGORIES
app.get('/api/data', (req, res) => res.json(readData()));

app.post('/api/categories', (req, res) => {
    const data = readData();
    const newCat = { id: Date.now().toString(), name: req.body.name || 'Новая категория', collapsed: false };
    data.categories.push(newCat);
    writeData(data);
    res.json(newCat);
});

app.patch('/api/categories/:id', (req, res) => {
    const data = readData();
    const cat = data.categories.find(c => c.id === req.params.id);
    if (cat) {
        Object.assign(cat, req.body);
        writeData(data);
        res.json(cat);
    } else res.status(404).json({ error: 'Category not found' });
});

app.delete('/api/categories/:id', (req, res) => {
    const data = readData();
    // Move tasks to default before deleting
    data.tasks.forEach(t => {
        if (t.categoryId === req.params.id) t.categoryId = 'default';
    });
    data.categories = data.categories.filter(c => c.id !== req.params.id);
    writeData(data);
    res.json({ success: true });
});

// REORDER API
app.post('/api/reorder', (req, res) => {
    const { type, items } = req.body; // type: 'categories' | 'tasks', items: [{id, order, categoryId?}]
    const data = readData();

    if (type === 'categories') {
        items.forEach(item => {
            const cat = data.categories.find(c => c.id === item.id);
            if (cat) cat.order = item.order;
        });
    } else if (type === 'tasks') {
        items.forEach(item => {
            const task = data.tasks.find(t => t.id === item.id);
            if (task) {
                task.order = item.order;
                if (item.categoryId) task.categoryId = item.categoryId;
            }
        });
    }

    writeData(data);
    res.json({ success: true });
});

// TASKS
app.post('/api/tasks', (req, res) => {
    const data = readData();
    const newTask = {
        id: Date.now().toString(),
        title: req.body.title || 'Новая задача',
        content: '',
        status: req.body.status || 'todo',
        categoryId: req.body.categoryId || 'default',
        order: data.tasks.length,
        media: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    data.tasks.push(newTask);
    writeData(data);
    res.json(newTask);
});

app.patch('/api/tasks/:id', (req, res) => {
    const data = readData();
    const index = data.tasks.findIndex(t => t.id === req.params.id);
    if (index !== -1) {
        const oldStatus = data.tasks[index].status;
        const newStatus = req.body.status || oldStatus;

        data.tasks[index] = { ...data.tasks[index], ...req.body, updatedAt: new Date().toISOString() };

        // Auto-move logic
        if (newStatus === 'done' && oldStatus !== 'done') {
            data.tasks[index].categoryId = COMPLETED_CAT_ID;
        } else if (newStatus === 'todo' && oldStatus === 'done') {
            // Move back to default or keep there? Let's move to default if it was in completed
            if (data.tasks[index].categoryId === COMPLETED_CAT_ID) {
                data.tasks[index].categoryId = 'default';
            }
        }

        writeData(data);
        res.json(data.tasks[index]);
    } else res.status(404).end();
});

app.delete('/api/tasks/:id', (req, res) => {
    const data = readData();
    data.tasks = data.tasks.filter(t => t.id !== req.params.id);
    writeData(data);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`MaBoy Server running at http://localhost:${PORT}`));
