const fs = require("fs");
const { DREAM_FILE } = require("./config");

function loadDreams() {

    if (!fs.existsSync(DREAM_FILE))
        return [];

    try {

        return JSON.parse(
            fs.readFileSync(DREAM_FILE, "utf8")
        );

    } catch (err) {

        console.error(
            "Dream read error:",
            err.message
        );

        return [];

    }

}

function saveDreams(dreams) {

    fs.writeFileSync(
        DREAM_FILE,
        JSON.stringify(dreams, null, 2)
    );

}

module.exports = {
    loadDreams,
    saveDreams
};