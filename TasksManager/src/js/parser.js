class Parser {
    static parseCommand(text) {
        if (!text || !text.trim()) return null;

        const result = {
            title: '',
            project: null,
            contexts: [],
            priority: 0,
            deadline: null
        };

        // RegEx patterns
        const projectRegex = /#(\w+|[\u0400-\u04FF]+)/g;
        const contextRegex = /@(\w+|[\u0400-\u04FF]+)/g;
        const priorityRegex = /!([1-3])/g;

        // Extract project
        const projectMatch = text.match(projectRegex);
        if (projectMatch) {
            result.project = projectMatch[0].substring(1);
        }

        // Extract contexts
        const contextMatches = text.matchAll(contextRegex);
        for (const match of contextMatches) {
            result.contexts.push(match[1]);
        }

        // Extract priority
        const priorityMatch = text.match(priorityRegex);
        if (priorityMatch) {
            result.priority = parseInt(priorityMatch[1]);
        }

        // Title is everything else cleaned up
        result.title = text
            .replace(projectRegex, '')
            .replace(contextRegex, '')
            .replace(priorityRegex, '')
            .replace(/\s+/g, ' ')
            .trim();

        return result;
    }
}
