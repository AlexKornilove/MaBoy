const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const { spawn } = require('child_process');
const crossSpawn = require('cross-spawn');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const SCRIPTS_DIR = path.join(__dirname, '../scripts');
const TEMP_DIR = path.join(__dirname, '../temp');

if (!fs.existsSync(SCRIPTS_DIR)) fs.mkdirSync(SCRIPTS_DIR);
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

app.use(express.static(path.join(__dirname, '../client')));
app.use(express.json());

const CONFIG_PATH = path.join(__dirname, 'config.json');
let config = {
    ahkPath: 'AutoHotkey.exe'
};

function loadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        } catch (e) {
            console.error('Error loading config:', e);
        }
    }
}

function saveConfig() {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

loadConfig();

let runningScripts = new Map(); // fileName -> process

// Improved Instrumentation logic
function instrumentScript(fileName, content) {
    const lines = content.split('\n');
    let inBlockComment = false;

    // Check if it's V2
    const versionMatch = content.match(/; @version\s+(V\d+(?:\.\d+)?)/i);
    const isV2 = versionMatch && versionMatch[1].toUpperCase().startsWith('V2');

    const instrumentedLines = lines.map((line, index) => {
        const lineNumber = index + 1;
        const trimmed = line.trim();

        if (trimmed.startsWith('/*')) inBlockComment = true;
        if (inBlockComment) {
            if (trimmed.endsWith('*/')) inBlockComment = false;
            return line;
        }

        // Don't instrument empty lines, comments, or directives
        if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) {
            return line;
        }

        // Use FileAppend to * (stdout) to report line info
        if (isV2) {
            // AHK V2 syntax
            return `FileAppend("AHK_LINE_INFO:${fileName}:${lineNumber}\\n", "*")\n${line}`;
        } else {
            // AHK V1.1 syntax
            return `FileAppend, AHK_LINE_INFO:${fileName}:${lineNumber}\`n, *\n${line}`;
        }
    });

    return instrumentedLines.join('\n');
}

function getScripts() {
    if (!fs.existsSync(SCRIPTS_DIR)) return [];
    return fs.readdirSync(SCRIPTS_DIR)
        .filter(f => f.endsWith('.ahk'))
        .map(f => {
            const filePath = path.join(SCRIPTS_DIR, f);
            const content = fs.readFileSync(filePath, 'utf8');
            const versionMatch = content.match(/; @version\s+(V\d+(?:\.\d+)?)/i);
            const version = versionMatch ? versionMatch[1].toUpperCase() : 'V1.1';

            return {
                name: f,
                status: runningScripts.has(f) ? 'active' : 'inactive',
                version: version
            };
        });
}

// Watch for script changes
const watcher = chokidar.watch(SCRIPTS_DIR, { persistent: true });
watcher.on('all', () => {
    io.emit('scripts_changed', getScripts());
});

io.on('connection', (socket) => {
    console.log('Client connected');
    socket.emit('scripts_changed', getScripts());

    socket.on('run_script', (fileName) => {
        if (runningScripts.has(fileName)) return;

        const filePath = path.join(SCRIPTS_DIR, fileName);
        const content = fs.readFileSync(filePath, 'utf8');
        const instrumentedContent = instrumentScript(fileName, content);
        const tempPath = path.join(TEMP_DIR, `_${fileName}`);

        fs.writeFileSync(tempPath, instrumentedContent);

        // Run AHK script with /ErrorStdOut to capture FileAppend to stdout
        // Check for AutoHotkey in config, PATH or common locations
        let ahkPath = config.ahkPath || 'AutoHotkey.exe';
        const commonPaths = [
            'C:\\Program Files\\AutoHotkey\\AutoHotkey.exe',
            'C:\\Program Files (x86)\\AutoHotkey\\AutoHotkey.exe'
        ];

        if (ahkPath === 'AutoHotkey.exe') { // Only search if default
            for (const p of commonPaths) {
                if (fs.existsSync(p)) {
                    ahkPath = p;
                    break;
                }
            }
        }

        console.log(`Starting script: ${fileName} using ${ahkPath}`);

        try {
            const child = crossSpawn(ahkPath, ['/ErrorStdOut', tempPath]);

            child.on('error', (err) => {
                console.error(`Failed to start script ${fileName}:`, err);
                runningScripts.delete(fileName);
                io.emit('scripts_changed', getScripts());
                socket.emit('error_message', `Failed to start AutoHotkey: ${err.message}. Make sure AutoHotkey is installed and in PATH.`);
            });

            if (child.pid) {
                runningScripts.set(fileName, child);
                io.emit('scripts_changed', getScripts());

                child.stdout?.on('data', (data) => {
                    const str = data.toString();
                    // Parse line info
                    const matches = str.matchAll(/AHK_LINE_INFO:(.+):(\d+)/g);
                    for (const match of matches) {
                        const [_, name, line] = match;
                        io.emit('line_info', { fileName: name, lineNumber: parseInt(line) });
                    }
                });

                child.stderr?.on('data', (data) => {
                    console.error(`[${fileName} stderr]: ${data}`);
                });

                child.on('close', (code) => {
                    console.log(`Script ${fileName} exited with code ${code}`);
                    runningScripts.delete(fileName);
                    io.emit('scripts_changed', getScripts());
                });
            }
        } catch (err) {
            console.error(`Spawn exception for ${fileName}:`, err);
            socket.emit('error_message', `Spawn exception: ${err.message}`);
        }
    });

    socket.on('stop_script', (fileName) => {
        const child = runningScripts.get(fileName);
        if (child) {
            child.kill();
            runningScripts.delete(fileName);
            io.emit('scripts_changed', getScripts());
        }
    });

    socket.on('save_script', ({ fileName, content }) => {
        const filePath = path.join(SCRIPTS_DIR, fileName);
        fs.writeFileSync(filePath, content);

        // If it was running, we might want to restart? Logic for that is usually separate.
        socket.emit('script_saved', { fileName });
    });

    socket.on('get_script_content', (fileName) => {
        const filePath = path.join(SCRIPTS_DIR, fileName);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            socket.emit('script_content', { fileName, content });
        }
    });

    socket.on('get_config', () => {
        socket.emit('config_data', config);
    });

    socket.on('update_config', (newConfig) => {
        config = { ...config, ...newConfig };
        saveConfig();
        socket.emit('config_saved', config);
    });

    socket.on('delete_script', (fileName) => {
        const filePath = path.join(SCRIPTS_DIR, fileName);
        if (fs.existsSync(filePath)) {
            // Stop if running
            const child = runningScripts.get(fileName);
            if (child) {
                child.kill();
                runningScripts.delete(fileName);
            }
            fs.unlinkSync(filePath);
            console.log(`Deleted script: ${fileName}`);
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
