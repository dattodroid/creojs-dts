import fs from "node:fs";
import path from "node:path";
import { generate } from "./generator.js";
import { getConfig } from "./config.js";

Error.stackTraceLimit = Infinity;

const config = getConfig();
const input = path.resolve(config.inputPath);

const log = (msg: string) => console.log(`✓ ${msg}`);

const jsonFiles = getJsonFiles(input);

const declarations = jsonFiles.map(file => {
    const json = JSON.parse(fs.readFileSync(file, "utf8"));

    return {
        name: json.name ?? path.parse(file).name,
        file: path.basename(file),
        dts: generate(json).trimEnd()
    };
});

fs.mkdirSync(config.outputFolder, { recursive: true });

config.perFileOutput
    ? writePerFile(declarations)
    : writeCombined(declarations);

copy("input/package.json", config.outputFolder);

function writePerFile(files: typeof declarations) {
    files.forEach(file => {
        fs.writeFileSync(
            path.join(config.outputFolder, `${file.name}.d.ts`),
            `${file.dts}\n`
        );
    });

    const refs = files.map(
        file => `/// <reference path="./${file.name}.d.ts" />`
    );

    const extra = copy(config.extraDtsPath, config.outputFolder);

    if (extra) {
        refs.push(`/// <reference path="./${path.basename(extra)}" />`);
    }

    fs.writeFileSync(
        path.join(config.outputFolder, "index.d.ts"),
        `${refs.join("\n")}\n`
    );

    log(`Generated ${files.length} declaration files`);
}

function writeCombined(files: typeof declarations) {
    const extra = config.extraDtsPath && fs.existsSync(path.resolve(config.extraDtsPath))
        ? `\n\n${fs.readFileSync(path.resolve(config.extraDtsPath), "utf8").trim()}\n`
        : "\n";

    const content = files
        .map(file => `/* ${file.file} */\n${file.dts}`)
        .join("\n\n") + extra;

    const output =
        files.length === 1
            ? `${files[0].name}.d.ts`
            : config.defaultOutputFile;

    fs.writeFileSync(path.join(config.outputFolder, output), content);

    log(`Generated ${output}`);
}

function copy(source: string, destinationFolder: string) {
    if (!source) return;

    const src = path.resolve(source);

    if (!fs.existsSync(src)) return;

    const dst = path.join(destinationFolder, path.basename(src));

    fs.copyFileSync(src, dst);
    log(`Copied ${path.basename(src)}`);

    return dst;
}

function getJsonFiles(input: string) {
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

    if (stat.isDirectory()) {
        const files = fs.readdirSync(input)
            .filter(file => file.endsWith(".json"))
            .sort()
            .map(file => path.join(input, file));

        if (!files.length) {
            throw new Error(`No JSON files found in ${input}`);
        }

        return files;
    }

    throw new Error("Input must be a file or directory");
}
