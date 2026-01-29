const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const app = express();
const PORT = 8080;

app.use(cors()); // Enable CORS for cross-origin navigation injection
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const CONFIG_PATH = path.join(__dirname, 'config', 'projects.json');

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`[Hub] ${req.method} ${req.url}`);
    next();
});

// Get list of projects
app.get('/api/projects', (req, res) => {
    fs.readFile(CONFIG_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Failed to read config' });
        res.json(JSON.parse(data));
    });
});

// Check if a project is online
app.get('/api/projects/:id/status', async (req, res) => {
    const projects = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    try {
        const url = new URL(project.url);

        let responded = false;
        const sendResponse = (online) => {
            if (!responded) {
                responded = true;
                res.json({ online });
            }
        };

        const request = http.request({
            host: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname || '/',
            method: 'HEAD',
            timeout: 2000
        }, (response) => {
            sendResponse(response.statusCode < 400 || response.statusCode === 404); // 404 still means service is up
        });

        request.on('error', (err) => {
            console.log(`[Status] ${project.id} unreachable: ${err.message}`);
            sendResponse(false);
        });

        request.on('timeout', () => {
            request.destroy();
            sendResponse(false);
        });
        request.end();
    } catch (e) {
        console.error(`Invalid URL for ${project.id}: ${project.url}`);
        res.json({ online: false });
    }
});

const runningProcesses = [];

// Function to launch a project
function launchProject(project) {
    console.log(`[Hub] Starting ${project.name} in ${project.cwd}...`);

    const child = spawn(project.startCommand, [], {
        cwd: path.resolve(__dirname, project.cwd),
        shell: true,
        stdio: 'inherit'
    });

    child.on('error', (err) => {
        console.error(`[Hub] Failed to start ${project.name}:`, err);
    });

    runningProcesses.push(child);
}

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('[Hub] Shutting down projects...');
    runningProcesses.forEach(proc => proc.kill());
    process.exit();
});

// Auto-launch all projects
async function autoLaunch() {
    console.log('Starting auto-launch for all projects...');
    try {
        const projects = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        for (const project of projects) {
            launchProject(project);
        }
    } catch (e) {
        console.error('Failed to auto-launch projects:', e);
    }
}

// Launch a project API
app.post('/api/projects/:id/launch', (req, res) => {
    const projects = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    launchProject(project);
    res.json({ success: true, message: `Launching ${project.name}` });
});

app.listen(PORT, () => {
    console.log(`Hub server running at http://localhost:${PORT}`);
    autoLaunch();
});
