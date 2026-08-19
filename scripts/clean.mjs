import fs from "node:fs";
import path from "node:path";

//** Delete everything inside creojs subfolder, except .gitignore. */

const cwd = process.cwd();
const dir = "creojs";

const relative = path.relative(cwd, dir);

if (
    relative.startsWith("..") ||
    path.isAbsolute(relative)
) {
    throw new Error(`Folder must be inside project root: ${dir}`);
}

if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === ".gitignore") {
            continue;
        }

        const fullPath = path.join(dir, entry.name);
        fs.rmSync(fullPath, { recursive: true, force: true });
    }
}