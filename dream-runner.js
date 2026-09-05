
const { generateDream } = require('./dream-engine');
// Mocking currentBroadcast since generateDream expects it for memory building
const currentBroadcast = { 
    internal_state: { last_cycle: 0, total_encounters: 0 } 
};
generateDream(currentBroadcast).then(() => {
    console.log('Dream process complete.');
    process.exit(0);
}).catch(err => {
    console.error('Dream failed:', err);
    process.exit(1);
});
