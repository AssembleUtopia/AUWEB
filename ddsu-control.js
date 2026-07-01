// ddsu-control.js
// AU-B001 DDSU runtime control surface.
// Reads ddsu-config.js and applies temporary console overrides.

const CONFIG_PATH = "./ddsu-config";

const LAYER_ALIASES = {
    shrapnel: "archiveShrapnel",
    archive: "archiveShrapnel",
    entropy: "archiveShrapnel",

    scar: "publicFragmentScar",
    public: "publicFragmentScar",
    fragment: "publicFragmentScar",
    hdd: "publicFragmentScar",

    glyph: "cursedGlyphRot",
    rot: "cursedGlyphRot",
    cursed: "cursedGlyphRot",

    secret: "secretPossession",
    possession: "secretPossession",

    mixed: "mixedHotspot",
    hotspot: "mixedHotspot"
};

const runtime = {
    enabledOverride: null,
    intensityOverride: null,
    layerWeightOverrides: {}
};

let cachedConfig = null;

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function loadConfigFromFile() {
    const resolved = require.resolve(CONFIG_PATH);
    delete require.cache[resolved];

    cachedConfig = require(CONFIG_PATH);
    return cachedConfig;
}

function getBaseConfig() {
    if (!cachedConfig) {
        return loadConfigFromFile();
    }

    return cachedConfig;
}

function resolveLayerName(name) {
    const key = String(name || "").trim();

    if (!key) return null;

    if (LAYER_ALIASES[key]) return LAYER_ALIASES[key];

    return key;
}

function getDDSUConfig() {
    const config = deepClone(getBaseConfig());

    if (runtime.enabledOverride !== null) {
        config.enabled = runtime.enabledOverride;
    }

    if (runtime.intensityOverride !== null) {
        config.intensity = runtime.intensityOverride;
    }

    Object.entries(runtime.layerWeightOverrides).forEach(([layerName, weight]) => {
        const resolved = resolveLayerName(layerName);

        if (
            resolved &&
            config.layers &&
            config.layers[resolved]
        ) {
            config.layers[resolved].weight = weight;
        }
    });

    return config;
}

function reloadDDSUConfig() {
    loadConfigFromFile();
    return getDDSUStatus();
}

function setDDSUEnabled(value) {
    runtime.enabledOverride = value === true;
    return getDDSUStatus();
}

function setDDSUIntensity(value) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
        throw new Error("DDSU intensity must be a number >= 0");
    }

    runtime.intensityOverride = number;
    return getDDSUStatus();
}

function setDDSULayerWeight(layerName, value) {
    const resolved = resolveLayerName(layerName);
    const number = Number(value);

    if (!resolved) {
        throw new Error("DDSU layer missing.");
    }

    if (!Number.isFinite(number) || number < 0) {
        throw new Error("DDSU layer weight must be a number >= 0");
    }

    const config = getDDSUConfig();

    if (!config.layers || !config.layers[resolved]) {
        throw new Error("Unknown DDSU layer: " + layerName);
    }

    runtime.layerWeightOverrides[resolved] = number;

    return getDDSUStatus();
}

function clearDDSUOverrides() {
    runtime.enabledOverride = null;
    runtime.intensityOverride = null;
    runtime.layerWeightOverrides = {};

    return getDDSUStatus();
}

function getDDSUStatus() {
    const config = getDDSUConfig();
    const lines = [];

    lines.push("DDSU STATUS");
    lines.push("Dream Distortion Signal Unit");
    lines.push("");
    lines.push("enabled: " + config.enabled);
    lines.push("intensity: " + config.intensity);
    lines.push("");

    lines.push("layers:");

    Object.entries(config.layers || {}).forEach(([name, layer]) => {
        lines.push(
            "  " +
            name +
            " | enabled=" +
            layer.enabled +
            " | weight=" +
            layer.weight
        );
    });

    lines.push("");

    lines.push("runtime overrides:");
    lines.push("  enabledOverride: " + runtime.enabledOverride);
    lines.push("  intensityOverride: " + runtime.intensityOverride);
    lines.push(
        "  layerWeightOverrides: " +
        JSON.stringify(runtime.layerWeightOverrides)
    );

    return lines.join("\n");
}

module.exports = {
    getDDSUConfig,
    getDDSUStatus,
    reloadDDSUConfig,
    setDDSUEnabled,
    setDDSUIntensity,
    setDDSULayerWeight,
    clearDDSUOverrides,
    resolveLayerName,
    LAYER_ALIASES
};