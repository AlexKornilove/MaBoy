(function () {
    // Avoid multiple injections
    if (window.__PROJECT_HUB_NAV__) return;
    window.__PROJECT_HUB_NAV__ = true;

    const HUB_URL = 'http://localhost:8080';
    const PROJECTS_CONFIG_URL = `${HUB_URL}/api/projects`;

    // Add a simple favicon to stop 404 if not present
    if (!document.querySelector('link[rel*="icon"]')) {
        const link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = `${HUB_URL}/favicon.ico`;
        document.getElementsByTagName('head')[0].appendChild(link);
    }

    async function initNav() {
        console.log('[HubNav] Initializing navigation...');
        // Load projects to build the menu
        let projects = [];
        try {
            const resp = await fetch(PROJECTS_CONFIG_URL, { mode: 'cors' });
            if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
            projects = await resp.json();
        } catch (e) {
            console.error('[HubNav] Failed to load project list:', e);
            // Fallback: minimal menu if hub is unreachable
        }

        // Create Shadow DOM container to avoid style leaks
        const host = document.createElement('div');
        host.id = 'project-hub-nav-host';
        document.body.prepend(host);
        const shadow = host.attachShadow({ mode: 'open' });

        // Add Styles
        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: block;
                width: 100vw;
                height: 50px;
                min-height: 50px;
                z-index: 2147483647; 
                flex-shrink: 0; /* Don't shrink in flex parents */
                font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .nav-bar {
                position: relative;
                background: #0f172a; /* Solid background for predictability */
                border-bottom: 2px solid rgba(56, 189, 248, 0.3);
                height: 100%;
                display: flex;
                align-items: center;
                padding: 0 24px;
                gap: 24px;
                color: #fff;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .hub-link {
                font-weight: 600;
                color: #38bdf8;
                text-decoration: none;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: transform 0.2s;
            }
            .hub-link:hover {
                transform: scale(1.05);
                color: #7dd3fc;
            }
            .projects-list {
                display: flex;
                gap: 20px;
                list-style: none;
                margin: 0;
                padding: 0;
                overflow-x: auto;
            }
            .projects-list::-webkit-scrollbar { display: none; }
            .project-item a {
                color: #94a3b8;
                text-decoration: none;
                font-size: 0.85rem;
                transition: color 0.2s;
                white-space: nowrap;
            }
            .project-item a:hover {
                color: #fff;
            }
            .nav-bar::after {
                content: '';
                flex: 1;
            }
        `;
        shadow.appendChild(style);

        // Add HTML
        const nav = document.createElement('nav');
        nav.className = 'nav-bar';

        let projectsHtml = projects.map(p => `
            <li class="project-item">
                <a href="${p.url}">${p.name}</a>
            </li>
        `).join('');

        nav.innerHTML = `
            <a href="${HUB_URL}" class="hub-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                HUB
            </a>
            <ul class="projects-list">
                ${projectsHtml}
            </ul>
        `;
        shadow.appendChild(nav);
        // Dispatch event to notifying the page that nav is ready
        window.dispatchEvent(new CustomEvent('hub-nav-ready', { detail: { height: 50 } }));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        initNav();
    }
})();
