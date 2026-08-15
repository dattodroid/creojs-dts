import fs from "node:fs";
import path from "node:path";

export type DocsLevel = "none" | "basic" | "full";

export interface GeneratorConfig {
    inputPath: string;
    outputFolder: string;
    defaultOutputFile: string;
    perFileOutput: boolean;
    extraDtsPath: string;
    exportedEnabled: boolean;
    useInterfaces: boolean;
    docsLevel: DocsLevel;
}

const PATH_CONFIG: Pick<GeneratorConfig, "inputPath" | "outputFolder" | "defaultOutputFile" | "extraDtsPath"> = Object.freeze({
    inputPath: "input/idl",
    outputFolder: "creojs",
    defaultOutputFile: "index.d.ts",
    extraDtsPath: "input/extra.d.ts"
});

const defaultConfig: GeneratorConfig = {
    ...PATH_CONFIG,
    perFileOutput: true,
    exportedEnabled: false,
    useInterfaces: true,
    docsLevel: "basic"
};

let cachedConfig: GeneratorConfig | undefined;

export function getConfig(): GeneratorConfig {
    if (!cachedConfig) {
        cachedConfig = loadConfig();
    }
    return cachedConfig;
}

function loadConfig(): GeneratorConfig {
    const configPath = path.resolve("config.json");
    if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
    }

    const raw = fs.readFileSync(configPath, "utf8");
    let parsed: Partial<GeneratorConfig>;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Unable to parse config file at ${configPath}: ${reason}`);
    }

    return {
        ...PATH_CONFIG,
        perFileOutput: typeof parsed.perFileOutput === "boolean" ? parsed.perFileOutput : defaultConfig.perFileOutput,
        exportedEnabled: typeof parsed.exportedEnabled === "boolean" ? parsed.exportedEnabled : defaultConfig.exportedEnabled,
        useInterfaces: typeof parsed.useInterfaces === "boolean" ? parsed.useInterfaces : defaultConfig.useInterfaces,
        docsLevel: coerceDocsLevel(parsed.docsLevel)
    };
}

function coerceDocsLevel(value: any): DocsLevel {
    if (value === undefined || value === null) {
        return defaultConfig.docsLevel;
    }
    if (value === "none" || value === "basic" || value === "full") {
        return value;
    }
    throw new Error(`Invalid docsLevel in config.json: ${value}`);
}
