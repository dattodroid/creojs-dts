import { getConfig, type DocsLevel } from "./config.js";

const DOCS_LEVEL: DocsLevel = getConfig().docsDetail;

export function createDocs(docs: any, extra: string[] = []): string[] | undefined {
    if (DOCS_LEVEL === "none") {
        return undefined;
    }
    return createDocsInternal(docs, extra);
}

export function createParamTags(parameters: any[]): string[] {
    if (DOCS_LEVEL !== "full") {
        return [];
    }
    return createParamTagsInternal(parameters);
}

function createDocsInternal(docs: any, extra: string[] = []): string[] | undefined {
    const summaryLines: string[] = [];
    const tagLines: string[] = [];
    const addLine = (value: any, prefix?: string) => {
        const text = formatDocText(value);
        if (!text) return;
        if (prefix?.startsWith("@")) {
            tagLines.push(`${prefix} ${text}`.trim());
        } else {
            summaryLines.push(prefix ? `${prefix} ${text}` : text);
        }
    };
    if (docs) {
        addLine(docs.purpose);
        addLine(docs.description);

        if (DOCS_LEVEL === "full") {
            if (Array.isArray(docs.notes)) {
                docs.notes.forEach((note: any) => addLine(note));
            }
            if (Array.isArray(docs.examples)) {
                docs.examples.forEach((example: any) => addLine(example, "@example"));
            }
            if (Array.isArray(docs["see-also"])) {
                docs["see-also"].forEach((item: any) => addLine(item, "@see"));
            }

            if (docs.return?.description) {
                addLine(docs.return.description, "@returns");
            }
        }
    }
    extra.forEach((line) => {
        if (!line) return;
        if (line.startsWith("@")) {
            tagLines.push(line);
        } else {
            summaryLines.push(line);
        }
    });
    const combined: string[] = [];
    if (summaryLines.length) {
        combined.push(...summaryLines);
    }
    if (summaryLines.length && tagLines.length) {
        combined.push("");
    }
    if (tagLines.length) {
        combined.push(...tagLines);
    }
    return combined.length ? [combined.join("\n")] : undefined;
}

function createParamTagsInternal(parameters: any[]): string[] {
    const tags: string[] = [];
    parameters.forEach((param: any) => {
        const info = param?.docs?.description ?? param?.docs?.purpose;
        const docText = formatDocText(info);
        if (docText) {
            tags.push(`@param ${param.name} ${docText}`);
        }
    });
    return tags;
}

function formatDocText(value: any): string {
    const withoutComments = removeBlockComments(flattenDocNode(value));
    const text = withoutComments.replace(/\s+/g, " ").trim();
    return text;
}

function removeBlockComments(value: string): string {
    if (!value) {
        return "";
    }
    return value.replace(/\/\*[\s\S]*?\*\//g, "");
}

function flattenDocNode(value: any): string {
    if (value == null) {
        return "";
    }
    if (typeof value === "string") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => flattenDocNode(item)).filter(Boolean).join(" ");
    }
    if (typeof value === "object") {
        if (typeof value.description === "string" && !value.children) {
            return value.description;
        }
        if (typeof value.text === "string") {
            return value.text;
        }
        if (typeof value.value === "string") {
            return value.value;
        }
        if (Array.isArray(value.children)) {
            return value.children.map((child: any) => flattenDocNode(child)).filter(Boolean).join(" ");
        }
    }
    return "";
}
