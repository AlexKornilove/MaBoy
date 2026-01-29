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

        card.innerHTML = `
            <div class="project-info">
                <h3>${project.name}</h3>
                <p>${project.description}</p>
                <div class="project-meta">
                     <span class="status-badge ${online ? 'online' : 'offline'}">${online ? 'Online' : 'Offline'}</span>
                </div>
            </div>
            <div class="project-actions">
                <button class="btn-launch ${online ? 'btn-open' : 'btn-start'}"
                        onclick="${online ? `window.open('${project.url}', '_blank')` : `launchProject('${project.id}')`}">
                    ${online ? 'Open Project' : 'Launch Project'}
                </button>
            </div>
        `;
    }
}

async function launchProject(id) {
    const response = await fetch(`/api/projects/${id}/launch`, { method: 'POST' });
    const result = await response.json();
    if (result.success) {
        // Immediate refresh after launch attempt
        loadProjects();
    }
}
window.launchProject = launchProject;

// ... existing setupBackground ...

document.addEventListener('DOMContentLoaded', () => {
    loadProjects();

    // Poll every 5 seconds for status updates
    setInterval(loadProjects, 5000);
});
