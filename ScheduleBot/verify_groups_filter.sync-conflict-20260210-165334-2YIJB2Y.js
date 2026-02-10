
import { fetchGroups } from './src/parsers/groups.js';

async function verify() {
    try {
        console.log("Fetching groups...");
        const groups = await fetchGroups();

        const practiceGroups = groups.filter(g => g.fullName.toLowerCase().includes('практика'));

        console.log(`Total groups found: ${groups.length}`);
        console.log(`Practice groups found after filter: ${practiceGroups.length}`);

        if (practiceGroups.length > 0) {
            console.log("Samples of remaining practice groups:");
            practiceGroups.slice(0, 5).forEach(g => console.log(` - ${g.fullName}`));
        } else {
            console.log("VERIFIED: No groups with 'Практика' found in the list.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

verify();
