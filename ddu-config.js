// ddsu-config.js
// AU-B001 DDSU CONFIG
// Dream Distortion Signal Unit
//
// This file is the permanent hand-tuned control surface.
// Console commands may override some values temporarily,
// but this file is the canonical ritual configuration.

module.exports = {
    enabled: true,

    // Overall amount of DDSU damage.
    // 0.0 = clean dreams
    // 0.5 = restrained damage
    // 1.0 = normal DDSU
    // 1.5 = heavy damage
    // 2.0 = brutal damage
    intensity: 1.0,

    eventDensity: {
        // Lower number = more distortion events.
        charsPerEvent: 85,

        // Random extra wounds per dream before intensity multiplier.
        minExtraEvents: 4,
        maxExtraEvents: 12,

        // Final clamp after intensity multiplier.
        minEvents: 6,
        maxEvents: 42
    },

    hotspots: {
        enabled: true,

        // Local intensity variance spots.
        min: 2,
        max: 5,

        // How far events may scatter around a hotspot center.
        radiusMin: 12,
        radiusMax: 95,

        // Chance that an event is attracted to a hotspot.
        pullChance: 0.55
    },

    layers: {
        archiveShrapnel: {
            enabled: true,

            // Relative chance among enabled layers.
            weight: 0.25,

            // Must always look like entropy.
            // Must always start with }
            // Must always end with one of these casual symbols.
            minLength: 6,
            maxLength: 12,
            endings: ["%", "@", "#", "&", "_", "~", "^", ";", ":", "!"],

            // Sometimes add space after shard.
            trailingSpaceChance: 0.5
        },

        publicFragmentScar: {
            enabled: true,
            weight: 0.22,

            // Full-length dream-fragments.txt line,
            // damaged like HDD head erasure.
            eraseMin: 2,

            // Bigger divisor = fewer scars.
            // 10 means about one scar per 10 chars.
            eraseMaxDivisor: 10,

            runMin: 1,
            runMax: 4,

            blocks: ["█", "▓", "▇", "■"]
        },

        cursedGlyphRot: {
            enabled: true,
            weight: 0.25,

            clusterMin: 1,
            clusterMax: 7,
            doubleChance: 0.22,
            leadingSpaceChance: 0.5,

            // Especially cursed but still browser-safe symbols.
            symbols: [
                "�", "▓", "▒", "█", "▚", "▞", "◼", "◊",
                "⸸", "╳", "⌬", "⌁", "⟁", "⧖", "⛧", "☍",
                "☒", "※", "҂", "Ѯ", "۞", "ᛉ", "ᛝ", "⸮",
                "§", "¤", "†", "‡", "░", "▣", "◬", "⟟",
                "☠", "☢", "☣", "⛓", "⌖", "⍟", "⍰", "⎊",
                "♆", "Ť", "Ʊ", "Ǚ", "͒", "Ω", "Ѡ", "א", "ל",
                "פ", "ה", "ש", "ק", "இ", "۩", "ࠅ", "ઓ", "ણ",
                "ઍ", "ઋ", "ફ", "ૠ", "ૡ", "ૹ", "ଆ", "ଐ",
                "🜏", "⟟", "🜉", "🜊", "🜍", "🜓", "🜔", "🜞",
                "🜡", "🜩", "🜪", "🜱", "🜹", "🝎", "🝕", "🝗",
                "🝘", "🝝", "🝣", "🝥", "🝩", "🝪", "🝳", "🝢",
                "🝒", "🝐", "🝏", "🝋", "🝉", "🜲", "🜛", "🜀"
            ]
        },

        secretPossession: {
            enabled: true,
            weight: 0.20,

            // Secret lines are usually complete quoted intrusions,
            // but rare archive shrapnel may wound them.
            allowInternalShrapnel: true,
            internalShrapnelChance: 0.08,

            // Relative chance of selecting each dream-secret.txt block.
            blockWeights: {
                commands: 1.0,
                insults: 1.2,
                assassins: 0.8,
                shadow: 0.9,
                forest: 1.1
            },

            insults: {
                elongationChance: 0.34,
                minRepeats: 2,
                maxRepeats: 5
            },

            forest: {
                caseFlipChance: 0.38
            }
        },

        mixedHotspot: {
            enabled: true,
            weight: 0.08
        }
    }
};