let socket;
let editor;
let selectedScript = null;
let currentScripts = [];
let decorations = [];

async function init() {
    // Wait for Socket.io to load (handle fallback delay)
    let attempts = 0;
    while (typeof io === 'undefined' && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (typeof io === 'undefined') {
        console.error('Socket.io failed to load');
        document.body.insertAdjacentHTML('afterbegin', '<div style="background:red;color:white;padding:10px;text-align:center;position:fixed;top:0;width:100%;z-index:9999;">Error: Socket.io library not found. Please check your internet or server.</div>');
        return;
    }

    socket = io();
    initSocketEvents();
    socket.emit('get_config');

    // Initialize Monaco Editor if not already initialized
    if (!window.monaco) {
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });
        require(['vs/editor/editor.main'], function () {
            setupEditor();
        });
    } else {
        setupEditor();
    }
}

function setupEditor() {
    const container = document.getElementById('monaco-container');
    if (!container || editor) return;

    editor = monaco.editor.create(container, {
        value: '',
        language: 'autohotkey',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: true }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        saveScript();
    });
}

document.addEventListener('DOMContentLoaded', init);

// UI Elements
const scriptList = document.getElementById('script-list');
const activeScriptName = document.getElementById('active-script-name');
const runBtn = document.getElementById('run-btn');
const stopBtn = document.getElementById('stop-btn');
const restartBtn = document.getElementById('restart-btn');
const saveBtn = document.getElementById('save-btn');
const addScriptBtn = document.getElementById('add-script-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const ahkPathInput = document.getElementById('ahk-path');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const filePicker = document.getElementById('file-picker');
const newScriptModal = document.getElementById('new-script-modal');
const closeNewScript = document.getElementById('close-new-script');
const newScriptNameInput = document.getElementById('new-script-name');
const newScriptVersionSelect = document.getElementById('new-script-version');
const createScriptBtn = document.getElementById('create-script-btn');

// Socket Events
function initSocketEvents() {
    if (!socket) return;
    socket.on('scripts_changed', (scripts) => {
        currentScripts = scripts;
        renderScriptList();
        updateButtonStates();
    });

    socket.on('script_content', ({ fileName, content }) => {
        if (selectedScript === fileName && editor) {
            editor.setValue(content);
            updateButtonStates();
        }
    });

    socket.on('script_saved', ({ fileName }) => {
        console.log(`Script ${fileName} saved successfully`);
    });

    socket.on('line_info', ({ fileName, lineNumber }) => {
        if (selectedScript === fileName) {
            highlightLine(lineNumber);
        }
    });

    socket.on('error_message', (msg) => {
        alert('Server Error: ' + msg);
    });

    socket.on('config_data', (config) => {
        ahkPathInput.value = config.ahkPath;
    });

    socket.on('config_saved', () => {
        settingsModal.style.display = 'none';
    });
}

function renderScriptList() {
    scriptList.innerHTML = '';
    currentScripts.forEach(script => {
        const item = document.createElement('div');
        item.className = 'script-item' + (selectedScript === script.name ? ' selected' : '');
        item.innerHTML = `
            <div class="script-status ${script.status}"></div>
            <div class="script-name">${script.name}</div>
            <div class="script-version-badge">${script.version || 'V1.1'}</div>
            <div class="script-item-actions">
                <i class="fas fa-trash delete-btn" title="Delete Script"></i>
            </div>
        `;

        // Clicks
        item.onclick = (e) => {
            if (e.target.classList.contains('delete-btn')) {
                deleteScript(script.name);
            } else {
                selectScript(script.name);
            }
        };
        scriptList.appendChild(item);
    });
}

function selectScript(fileName) {
    selectedScript = fileName;
    activeScriptName.textContent = fileName;
    if (socket) socket.emit('get_script_content', fileName);
    renderScriptList();
    updateButtonStates();
    clearHighlight();
}

function updateButtonStates() {
    const script = currentScripts.find(s => s.name === selectedScript);
    const isActive = script?.status === 'active';

    runBtn.disabled = !selectedScript || isActive || !socket;
    stopBtn.disabled = !selectedScript || !isActive || !socket;
    restartBtn.disabled = !selectedScript || !socket;
    saveBtn.disabled = !selectedScript || !socket;
}

function saveScript() {
    if (!selectedScript || !socket || !editor) return;
    socket.emit('save_script', {
        fileName: selectedScript,
        content: editor.getValue()
    });
}

runBtn.onclick = () => {
    if (selectedScript && socket) socket.emit('run_script', selectedScript);
};

stopBtn.onclick = () => {
    if (selectedScript && socket) socket.emit('stop_script', selectedScript);
};

restartBtn.onclick = () => {
    if (selectedScript && socket) {
        socket.emit('stop_script', selectedScript);
        setTimeout(() => socket.emit('run_script', selectedScript), 300);
    }
};

saveBtn.onclick = saveScript;

addScriptBtn.onclick = () => {
    if (!socket) return alert('Cannot connect to server');
    newScriptNameInput.value = 'new_script.ahk';
    newScriptModal.style.display = 'block';
};

createScriptBtn.onclick = () => {
    const name = newScriptNameInput.value.trim();
    const version = newScriptVersionSelect.value;

    if (name && name.endsWith('.ahk')) {
        const content = `; @version ${version}\n; New AHK Script\n` +
            (version === 'V2' ? 'MsgBox("Hello World!")' : 'MsgBox, Hello World!');

        socket.emit('save_script', { fileName: name, content: content });
        newScriptModal.style.display = 'none';
    } else {
        alert('Please enter a valid filename ending in .ahk');
    }
};

closeNewScript.onclick = () => {
    newScriptModal.style.display = 'none';
};

function deleteScript(fileName) {
    if (confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
        socket.emit('delete_script', fileName);
        if (selectedScript === fileName) {
            selectedScript = null;
            editor.setValue('');
            activeScriptName.textContent = 'Select a script';
            updateButtonStates();
        }
    }
}

// Settings logic
settingsBtn.onclick = () => {
    settingsModal.style.display = 'block';
};

closeSettings.onclick = () => {
    settingsModal.style.display = 'none';
};

window.onclick = (event) => {
    if (event.target == settingsModal) {
        settingsModal.style.display = 'none';
    }
    if (event.target == newScriptModal) {
        newScriptModal.style.display = 'none';
    }
};

saveSettingsBtn.onclick = () => {
    const path = ahkPathInput.value.trim();
    socket.emit('update_config', { ahkPath: path });
};

filePicker.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        // We can't get the full path, but we can help the user if they pick it
        // and it's in a standard location, or just show the filename
        // A better way is to inform the user.
        alert('Browser security prevents getting the full path automatically. Please copy the full path to AutoHotkey.exe and paste it into the input field.');
    }
};

function highlightLine(lineNumber) {
    clearHighlight();
    decorations = editor.deltaDecorations([], [
        {
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
                isWholeLine: true,
                className: 'active-line-highlight',
                glyphMarginClassName: 'active-line-glyph'
            }
        }
    ]);
    // Optionally scroll to line
    // editor.revealLineInCenter(lineNumber);
}

function clearHighlight() {
    if (decorations.length > 0) {
        decorations = editor.deltaDecorations(decorations, []);
    }
}
