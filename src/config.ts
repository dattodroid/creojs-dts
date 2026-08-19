import fs from "node:fs";
import path from "node:path";

export type DocsLevel = "none" | "basic" | "full";
export type EnumStyle = "enum" | "class";
export type InterfaceStaticStyle = "interface" | "namespace";

export interface GeneratorConfig {
    inputPath: string;
    outputFolder: string;
    splitBySourceFile: boolean;
    emitExports: boolean;
    typesAsInterfaces: boolean;
    docsDetail: DocsLevel;
    enumsAs: EnumStyle;
    interfaceStaticsAs: InterfaceStaticStyle;
}

const DEFAULT_CONFIG: GeneratorConfig = {
    inputPath: "input/idl",
    outputFolder: "creojs",
    splitBySourceFile: true,
    emitExports: false,
    typesAsInterfaces: true,
    docsDetail: "basic",
    enumsAs: "class",
    interfaceStaticsAs: "interface"
};

let cachedConfig: GeneratorConfig;

export const getConfig = (): GeneratorConfig =>
    (cachedConfig ??= loadConfig());

function loadConfig(): GeneratorConfig {
    const configPath = path.resolve("config.json");

    const parsed = JSON.parse(
        fs.readFileSync(configPath, "utf8")
    ) as Partial<GeneratorConfig>;

    const docsDetail = parsed.docsDetail ?? DEFAULT_CONFIG.docsDetail;

    if (!["none", "basic", "full"].includes(docsDetail)) {
        throw new Error(`Invalid docsDetail in config.json: ${docsDetail}`);
    }

    const enumsAs = parsed.enumsAs ?? DEFAULT_CONFIG.enumsAs;

    if (!["enum", "class"].includes(enumsAs)) {
        throw new Error(`Invalid enumsAs in config.json: ${enumsAs}`);
    }

    const interfaceStaticsAs =
        parsed.interfaceStaticsAs ?? DEFAULT_CONFIG.interfaceStaticsAs;

    if (!["interface", "namespace"].includes(interfaceStaticsAs)) {
        throw new Error(
            `Invalid interfaceStaticsAs in config.json: ${interfaceStaticsAs}`
        );
    }

    return {
        ...DEFAULT_CONFIG,
        ...parsed,
        docsDetail,
        enumsAs,
        interfaceStaticsAs
    };
}
