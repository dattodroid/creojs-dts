import fs from "node:fs";
import path from "node:path";

export type DocsLevel = "none" | "basic" | "full";

export interface GeneratorConfig {
    inputPath: string;
    outputFolder: string;
    defaultOutputFile: string;
    extraDtsPath: string;
    perFileOutput: boolean;
    exportedEnabled: boolean;
    useInterfaces: boolean;
    docsLevel: DocsLevel;
}

const DEFAULT_CONFIG: GeneratorConfig = {
    inputPath: "input/idl",
    outputFolder: "creojs",
    defaultOutputFile: "index.d.ts",
    extraDtsPath: "input/extra.d.ts",
    perFileOutput: true,
    exportedEnabled: false,
    useInterfaces: true,
    docsLevel: "basic"
};

let cachedConfig: GeneratorConfig;

export const getConfig = (): GeneratorConfig =>
    (cachedConfig ??= loadConfig());

function loadConfig(): GeneratorConfig {
    const configPath = path.resolve("config.json");

    const parsed = JSON.parse(
        fs.readFileSync(configPath, "utf8")
    ) as Partial<GeneratorConfig>;

    const docsLevel = parsed.docsLevel ?? DEFAULT_CONFIG.docsLevel;

    if (!["none", "basic", "full"].includes(docsLevel)) {
        throw new Error(`Invalid docsLevel in config.json: ${docsLevel}`);
    }

    return {
        ...DEFAULT_CONFIG,
        ...parsed,
        docsLevel
    };
}
