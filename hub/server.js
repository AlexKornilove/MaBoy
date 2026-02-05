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

// Log significant requests only (ignore polling spam)
app.use((req, res, next) => {
    const skipLogging = req.url.includes('/status') || req.url === '/api/projects';
    if (!skipLogging) {
        console.log(`[Hub] ${req.method} ${req.url}`);
    }
    next();
});

// Get list of projects
app.get('/api/projects', (req, res) => {
    fs.readFile(CONFIG_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Failed to read config' });
        res.json(JSON.parse(data));
    });
});


// Map to track running processes by project ID
const runningProcesses = new Map();

// Function to launch a project
function launchProject(project) {
    if (runningProcesses.has(project.id)) {
        console.log(`[Hub] ${project.name} is already running.`);
        return;
    }

    console.log(`[Hub] Starting ${project.name} in ${project.cwd}...`);

    const child = spawn(project.startCommand, [], {
        cwd: path.resolve(__dirname, project.cwd),
        shell: true,
        stdio: 'inherit'
    });

    child.on('error', (err) => {
        console.error(`[Hub] Failed to start ${project.name}:`, err);
        runningProcesses.delete(project.id);
    });

    child.on('exit', (code) => {
        console.log(`[Hub] ${project.name} exited with code ${code}`);
        runningProcesses.delete(project.id);
    });

    runningProcesses.set(project.id, child);
}

// Function to stop a project
function stopProject(projectId) {
    const child = runningProcesses.get(projectId);
    if (!child) return Promise.resolve(false);

    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.log(`[Hub] Stop timeout for ${projectId}, forcing cleanup`);
            runningProcesses.delete(projectId);
            resolve(true);
        }, 5000);

        child.on('exit', () => {
            clearTimeout(timeout);
            runningProcesses.delete(projectId);
            resolve(true);
        });

        console.log(`[Hub] Stopping project ${projectId} (PID: ${child.pid})...`);
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', child.pid, '/f', '/t']);
        } else {
            child.kill();
        }
    });
}

// Check if a project is online
app.get('/api/projects/:id/status', async (req, res) => {
    const projects = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Check if process is running in our map
    const isProcessRunning = runningProcesses.has(project.id);

    try {
        // If it's a bot, use the process state as status
        if (project.type === 'bot' || !project.url || !project.url.startsWith('http')) {
            return res.json({ online: isProcessRunning });
        }

        // For web projects, still check the URL if it's supposed to be running
        if (!isProcessRunning) {
            return res.json({ online: false });
        }

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
            sendResponse(response.statusCode < 400 || response.statusCode === 404);
        });

        request.on('error', () => sendResponse(false));
        request.on('timeout', () => { request.destroy(); sendResponse(false); });
        request.end();
    } catch (e) {
        res.json({ online: isProcessRunning });
    }
});

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('[Hub] Shutting down projects...');
    for (const [id, proc] of runningProcesses) {
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', proc.pid, '/f', '/t']);
        } else {
            proc.kill();
        }
    }
    setTimeout(() => process.exit(), 500); // Allow time for taskkill
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

// Stop a project API
app.post('/api/projects/:id/stop', async (req, res) => {
    const success = await stopProject(req.params.id);
    res.json({ success, message: success ? `Stopped ${req.params.id}` : `Project ${req.params.id} not running` });
});

// Restart a project API
app.post('/api/projects/:id/restart', async (req, res) => {
    const projects = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    await stopProject(project.id);
    // Use a larger timeout to ensure ports are freed and OS handles cleanup
    setTimeout(() => {
        launchProject(project);
        res.json({ success: true, message: `Restarted ${project.name}` });
    }, 2000);
});

app.listen(PORT, () => {
    console.log(`Hub server running at http://localhost:${PORT}`);
    autoLaunch();
});
