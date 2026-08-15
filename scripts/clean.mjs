import fs from "node:fs";
import path from "node:path";

//** Delete .d.ts files and package.json from project subfolder. */

const cwd = process.cwd();
const dir = path.resolve(cwd, process.argv[2] ?? "creojs");

const relative = path.relative(cwd, dir);

if (
    relative.startsWith("..") ||
    path.isAbsolute(relative)
) {
    throw new Error(`Folder must be inside project root: ${dir}`);
}

if (fs.existsSync(dir)) {
    fs.readdirSync(dir)
        .filter(file => file.endsWith(".d.ts") || file === "package.json")
        .forEach(file => fs.unlinkSync(path.join(dir, file)));
}