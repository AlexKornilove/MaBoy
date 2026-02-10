async function loadProjects() {
    const response = await fetch('/api/projects');
    const projects = await response.json();
    const grid = document.getElementById('project-list');

    // Only clear once on initial load
    if (grid.children.length === 0) {
        grid.innerHTML = '';
        for (const project of projects) {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.id = `project-${project.id}`;
            grid.appendChild(card);
        }
    }

    for (const project of projects) {
        const card = document.getElementById(`project-${project.id}`);
        const statusResponse = await fetch(`/api/projects/${project.id}/status`);
        const { online } = await statusResponse.json();

        const isBot = project.type === 'bot' || !project.url || !project.url.startsWith('http');

        let actionButtons = '';
        if (online) {
            if (!isBot) {
                actionButtons += `<button class="btn-launch btn-open" onclick="window.open('${project.url}', '_blank')">Open</button>`;
            } else {
                actionButtons += `<button class="btn-launch btn-bot" disabled>Bot Online</button>`;
            }
            actionButtons += `<button class="btn-control btn-stop" onclick="stopProject('${project.id}')">Stop</button>`;
            actionButtons += `<button class="btn-control btn-restart" onclick="restartProject('${project.id}')">Restart</button>`;
        } else {
            actionButtons += `<button class="btn-launch btn-start" onclick="launchProject('${project.id}')">Start</button>`;
        }

        card.innerHTML = `
            <div class="project-info">
                <h3>${project.name}</h3>
                <p>${project.description}</p>
                <div class="project-meta">
                     <span class="status-badge ${online ? 'online' : 'offline'}">${online ? 'Online' : 'Offline'}</span>
                </div>
            </div>
            <div class="project-actions">
                ${actionButtons}
            </div>
        `;
    }
}

async function launchProject(id) {
    const response = await fetch(`/api/projects/${id}/launch`, { method: 'POST' });
    const result = await response.json();
    if (result.success) loadProjects();
}

async function stopProject(id) {
    const response = await fetch(`/api/projects/${id}/stop`, { method: 'POST' });
    const result = await response.json();
    if (result.success) loadProjects();
}

async function restartProject(id) {
    const card = document.getElementById(`project-${id}`);
    const badge = card.querySelector('.status-badge');
    const buttons = card.querySelectorAll('button');

    // Visual feedback
    badge.textContent = 'Restarting...';
    badge.className = 'status-badge restarting';
    buttons.forEach(btn => btn.disabled = true);

    try {
        const response = await fetch(`/api/projects/${id}/restart`, { method: 'POST' });
        const result = await response.json();
        if (result.success) {
            console.log(`Restarting ${id}...`);
            // The polling or next loadProjects will restore the card state
            setTimeout(loadProjects, 1500);
        } else {
            loadProjects(); // Restore state on failure
        }
    } catch (e) {
        console.error('Restart failed:', e);
        loadProjects();
    }
}

window.launchProject = launchProject;
window.stopProject = stopProject;
window.restartProject = restartProject;

// ... existing setupBackground ...

document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    setInterval(loadProjects, 10000);
});
