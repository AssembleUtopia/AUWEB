const { loadArchive, saveArchive } = require("./archive");
const {
    calculateDisclosure,
    classifyPresence
} = require("./classify");

function updateEncounter(cycle, entropy, patch) {

    const archive = loadArchive();

    const index = archive.findIndex(item =>
        item.cycle === cycle &&
        item.entropy === entropy
    );

    if (index === -1)
        return null;

    archive[index] = {
        ...archive[index],
        ...patch,
        updated_utc: new Date().toISOString()
    };

    archive[index].disclosure =
        calculateDisclosure(archive[index]);

    archive[index].presence =
        classifyPresence(archive[index]);

    saveArchive(archive);

    return archive[index];

}

module.exports = {
    updateEncounter
};