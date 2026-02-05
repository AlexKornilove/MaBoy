
import { fetchSchedule } from './src/parsers/schedule.js';
import { formatDay } from './src/utils/formatter.js';

async function verify() {
    try {
        console.log("Fetching schedule...");
        const result = await fetchSchedule(null, '3.092.2.24');

        console.log('\n=== Schedule Verification (Empty Slots) ===');
        result.schedule.forEach(day => {
            console.log(formatDay(day));
            console.log('\n');
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

verify();
