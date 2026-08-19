// Corrected simplified DTS generator
import fs from "node:fs";
import path from "node:path";
import { DTSGenerator } from "./generator.js";
import { getConfig, type GeneratorConfig } from "./config.js";

Error.stackTraceLimit = Infinity;
const log = (msg: string) => console.log(`✓ ${msg}`);

const SUPPORTED_MODULES = new Set(
    DTSGenerator.SUPPORTED_PREFIXES as readonly string[]
);

interface DeclarationFile {
    file: string;
    fullPath: string;
    dts: string;
    module: string;
}

const config = getConfig();
run(config);

function run(config: GeneratorConfig): void {
    const files = loadDeclarations(path.resolve(config.inputPath));

    fs.mkdirSync(config.outputFolder, { recursive: true });

    const refs = config.splitBySourceFile
        ? writePerFile(files, config)
        : writeCombined(files, config);

    addCreojsDts(refs, config.outputFolder);

    fs.writeFileSync(path.join(config.outputFolder, "index.d.ts"), refs.join("\n") + "\n");

    copy("input/package.json", config.outputFolder);

    log(`Generated ${files.length} declaration files`);
}

function loadDeclarations(input: string): DeclarationFile[] {
    return getJsonFiles(input).map(fullPath => {
        const json = JSON.parse(fs.readFileSync(fullPath, "utf8"));
        const module = path.basename(path.dirname(fullPath));
        return {
            file: path.basename(fullPath),
            fullPath,
            module: module,
            dts: new DTSGenerator(module).generate(json).trimEnd()
        };
    });
}

function writePerFile(files: DeclarationFile[], config: GeneratorConfig): string[] {
    const refs: string[] = [];

    for (const file of files) {
        if (!SUPPORTED_MODULES.has(file.module)) continue;

        const outDir = path.join(config.outputFolder, file.module);
        fs.mkdirSync(outDir, { recursive: true });

        const base = path.parse(file.file).name;

        fs.writeFileSync(
            path.join(outDir, `${base}.d.ts`),
            `/* ${file.file} */\n${file.dts}${readExtra(file.module)}\n`
        );

        refs.push(`/// <reference path="./${file.module}/${base}.d.ts" />`);
    }

    return refs;
}

function writeCombined(files: DeclarationFile[], config: GeneratorConfig): string[] {
    const refs: string[] = [];
    const groups = new Map<string, DeclarationFile[]>();

    for (const file of files) {
        if (!SUPPORTED_MODULES.has(file.module)) continue;

        const group = groups.get(file.module);

        if (group) group.push(file);
        else groups.set(file.module, [file]);
    }

    for (const [prefix, group] of groups) {
        const content = group
            .map(file => `/* ${file.file} */\n${file.dts}`)
            .join("\n\n");

        fs.writeFileSync(
            path.join(config.outputFolder, `${prefix}.d.ts`),
            content + readExtra(prefix) + "\n"
        );

        refs.push(`/// <reference path="./${prefix}.d.ts" />`);
    }

    return refs;
}

function readExtra(prefix: string): string {
    const file = path.resolve("input", `${prefix}.d.ts`);

    return fs.existsSync(file)
        ? `\n\n${fs.readFileSync(file, "utf8").trimEnd()}`
        : "";
}

function addCreojsDts(refs: string[], outputFolder: string): void {
    const source = "input/creojs.d.ts";

    if (!fs.existsSync(path.resolve(source))) return;

    copy(source, outputFolder);
    refs.push('/// <reference path="./creojs.d.ts" />');
}

function getJsonFiles(input: string): string[] {
    if (!fs.existsSync(input)) {
        throw new Error(`Input not found: ${input}`);
    }

    const stat = fs.statSync(input);

    if (stat.isFile()) {
        if (!input.endsWith(".json")) {
            throw new Error("Input must be a JSON file");
        }

        return [input];
    }

    const files = walk(input);

    if (!files.length) {
        throw new Error(`No JSON files found in ${input}`);
    }

    return files.sort((a, b) => a.localeCompare(b));
}

function walk(dir: string): string[] {
    const files: string[] = [];

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...walk(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".json")) {
            files.push(fullPath);
        }
    }

    return files;
}

function copy(source: string, outputFolder: string): void {
    const src = path.resolve(source);

    if (!fs.existsSync(src)) return;

    fs.copyFileSync(src, path.join(outputFolder, path.basename(src)));
    log(`Copied ${path.basename(src)}`);
}