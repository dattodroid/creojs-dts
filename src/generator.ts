import { ModuleDeclarationKind, Project, VariableDeclarationKind } from "ts-morph";
import { createDocs, createParamTags } from "./docs.js";
import { getConfig } from "./config.js";

const { exportedEnabled: EXPORTED_ENABLED, useInterfaces: USE_INTERFACES } = getConfig();

interface ParameterMapResult {
    list: any[];
    docTags: string[];
}

export function generate(idl: any): string {
    const project = new Project({ useInMemoryFileSystem: true });
    const source_file = project.createSourceFile(`${idl.name}.d.ts`, "", { overwrite: true });
    for (const decl of idl.declarations ?? []) {
        switch (decl.kind) {
            case "interface":
                if (USE_INTERFACES) {
                    generateInterface(source_file, decl);
                } else {
                    generateClass(source_file, decl);
                }
                break;
            case "enum": generateEnum(source_file, decl); break;
            case "sequence": generateSequence(source_file, decl); break;
            case "union": generateUnion(source_file, decl); break;
            case "array":
            case "matrix":
                generateArrayLike(source_file, decl);
                break;
            case "method":
                generateStandaloneMethod(source_file, decl);
                break;
        }
    }
    return source_file.getFullText();
}

function generateInterface(file: any, decl: any) {
    const interface_name = normalizeTypeName(decl.name);
    if (interface_name === "pfcObject") return;
    const parents = (decl.parents ?? [])
        .map((p: any) => normalizeRef(p.$ref))
        .filter((name: string | undefined): name is string => Boolean(name));
    const methods = (decl.methods ?? []).map((m: any) => {
        const param_info = mapParameters(m.parameters ?? []);
        return {
            name: m.name,
            returnType: resolveReturnType(m.returnType),
            parameters: param_info.list,
            docs: createDocs(m.docs, param_info.docTags),
            isStatic: m.static === true
        };
    });

    const instance_methods = methods
        .filter((method: any) => method.isStatic !== true)
        .map(({ isStatic: _ignored, ...rest }: any) => rest);
    const static_methods = methods.filter((method: any) => method.isStatic === true);


    const interface_def: any = {
        isExported: EXPORTED_ENABLED,
        hasDeclareKeyword: true,
        name: interface_name,
        docs: createDocs(decl.docs),
        properties: (decl.properties ?? []).map((p: any) => ({
            name: p.name,
            type: resolveType(p.type),
            hasQuestionToken: p.optional === true,
            isReadonly: p.readonly === true,
            docs: createDocs(p.docs)
        })),
        methods: instance_methods
    };

    if (parents.length > 0) {
        interface_def.extends = parents;
    }

    file.addInterface(interface_def);

    /** Define static methods as functions in a namespace with the same name as the interface */
    // if (static_methods.length > 0) {
    //     const namespace_declaration = file.addModule({
    //         name: interface_name,
    //         isExported: EXPORTED_ENABLED,
    //         hasDeclareKeyword: true,
    //         declarationKind: ModuleDeclarationKind.Namespace
    //     });
    //     for (const method of static_methods) {
    //         namespace_declaration.addFunction({
    //             name: method.name,
    //             returnType: method.returnType,
    //             parameters: method.parameters,
    //             docs: method.docs
    //         });
    //     }
    // }

    /** separate interface for the static side */

    if (static_methods.length > 0) {
        const static_interface_name = `${interface_name}Static`;

        file.addInterface({
            isExported: false,
            hasDeclareKeyword: false,
            name: static_interface_name,
            methods: static_methods.map((method: any) => ({
                name: method.name,
                returnType: method.returnType,
                parameters: method.parameters,
                docs: method.docs
            }))
        });

        file.addVariableStatement({
            isExported: EXPORTED_ENABLED,
            declarationKind: VariableDeclarationKind.Const,
            hasDeclareKeyword: true,
            declarations: [
                {
                    name: interface_name,
                    type: static_interface_name
                }
            ]
        });
    }
}


function generateClass(file: any, decl: any) {
    const class_name = normalizeTypeName(decl.name);
    if (class_name === "pfcObject") return;
    const parents = (decl.parents ?? [])
        .map((p: any) => normalizeRef(p.$ref))
        .filter((name: string | undefined): name is string => Boolean(name));
    const methods = (decl.methods ?? []).map((m: any) => {
        const param_info = mapParameters(m.parameters ?? []);
        return {
            name: m.name,
            returnType: resolveReturnType(m.returnType),
            parameters: param_info.list,
            docs: createDocs(m.docs, param_info.docTags),
            isStatic: m.static === true
        };
    });

    const class_def: any = {
        isExported: EXPORTED_ENABLED,
        hasDeclareKeyword: true,
        name: class_name,
        docs: createDocs(decl.docs),
        properties: (decl.properties ?? []).map((p: any) => ({
            name: p.name,
            type: resolveType(p.type),
            hasQuestionToken: p.optional === true,
            isReadonly: p.readonly === true,
            docs: createDocs(p.docs)
        })),
        methods
    };

    if (parents.length > 0) {
        class_def.extends = parents[0];
    }
    if (parents.length > 1) {
        class_def.implements = parents.slice(1);
    }

    file.addClass(class_def);
}

function generateStandaloneMethod(file: any, decl: any) {
    const param_info = mapParameters(decl.parameters ?? []);
    file.addFunction({
        name: `pfc${decl.name}`,
        returnType: resolveReturnType(decl.returnType),
        parameters: param_info.list,
        docs: createDocs(decl.docs, param_info.docTags),
        hasDeclareKeyword: true,
        isExported: EXPORTED_ENABLED
    });
}

function mapParameters(parameters: any[]): ParameterMapResult {
    const list = parameters.map((param: any) => ({
        name: normalizeParameterName(param.name),
        type: resolveType(param.type),
        hasQuestionToken: param.optional === true || param.defaultValue !== undefined
    }));
    const doc_tags = createParamTags(parameters);
    return { list, docTags: doc_tags };
}

function generateEnum(file: any, decl: any) {
    file.addEnum({
        isExported: EXPORTED_ENABLED,
        hasDeclareKeyword: true,
        name: normalizeTypeName(decl.name),
        docs: createDocs(decl.docs),
        members: decl.values.map((v: any) => resolveEnumMember(v))
    });
}

function generateSequence(file: any, decl: any) {
    file.addTypeAlias({
        isExported: EXPORTED_ENABLED,
        hasDeclareKeyword: true,
        name: normalizeTypeName(decl.name),
        type: `${resolveType(decl.type)}[]`,
        docs: createDocs(decl.docs)
    });
}

function generateArrayLike(file: any, decl: any) {
    file.addTypeAlias({
        isExported: EXPORTED_ENABLED,
        hasDeclareKeyword: true,
        name: normalizeTypeName(decl.name),
        type: resolveArrayType(resolveType(decl.type), decl.dimensions),
        docs: createDocs(decl.docs)
    });
}

function generateUnion(file: any, decl: any) {
    const union_name = normalizeTypeName(decl.name);
    const discriminant = decl.switchName ? normalizeTypeName(decl.switchName) : undefined;
    const members = (decl.values ?? []).map((value: any) => {
        const member_name = value.name ?? "Value";
        const member_type = resolveType(value.type);
        return {
            name: member_name,
            type: member_type,
            isReadonly: true,
            docs: createDocs(value.docs)
        };
    });

    const properties = [
        ...(discriminant
            ? [
                {
                    name: "discr",
                    type: discriminant,
                    isReadonly: true
                }
            ]
            : []),
        ...members
    ];

    const definition: any = {
        isExported: EXPORTED_ENABLED,
        hasDeclareKeyword: true,
        name: union_name,
        docs: createDocs(decl.docs),
        properties
    };

    if (USE_INTERFACES) {
        file.addInterface(definition);
    } else {
        file.addClass(definition);
    }
}

function resolveArrayType(baseType: string, dimensions?: number[]): string {
    const dims = Array.isArray(dimensions) ? dimensions : [];
    if (!dims.length) {
        return `${baseType}[]`;
    }
    return buildTupleType(baseType, dims);
}

function buildTupleType(baseType: string, dimensions: number[]): string {
    if (!dimensions.length) {
        return baseType;
    }
    const [raw_size, ...rest] = dimensions;
    const size = typeof raw_size === "number" ? raw_size : Number.parseInt(String(raw_size ?? 0), 10);
    const inner_type = buildTupleType(baseType, rest);
    const length = Number.isFinite(size) ? Math.trunc(size) : 0;
    if (length <= 0) {
        return `${inner_type}[]`;
    }
    const parts = Array.from({ length }, () => inner_type).join(", ");
    return `[${parts}]`;
}

function resolveEnumMember(item: any) {
    if (typeof item === "string") {
        return { name: item };
    }
    const name = item?.value ?? item?.name ?? "unknown";
    return { name, docs: createDocs(item?.docs) };
}

function resolveType(type: any): string {
    if (typeof type === "string") {
        switch (type) {
            case "xreal":
            case "xint":
            case "double":
            case "float":
            case "int":
            case "long":
            case "short":
                return "number";
            case "xbool": return "boolean";
            case "xstring": return "string";
            case "void": return "void";
            case "xintsequence_ptr": return "number[]";
            case "xstringsequence_ptr": return "string[]";
            default: return type;
        }
    }
    if (type?.$ref) {
        return normalizeRef(type?.$ref)!;
    }
    return "any";
}

function resolveReturnType(type: any): string {
    return (!type) ? "void" : resolveType(type);
}

function normalizeParameterName(name: string): string {
    return (name) ? name : "value";
    // return name;.charAt(0).toLowerCase() + name.slice(1);
}

function normalizeTypeName(name: string): string {
    return name.startsWith("pfc") ? name : `pfc${name}`;
}

function normalizeRef(ref: string): string | undefined {
    if (!ref) return undefined;
    const r = ref.split("::")[1];
    return normalizeTypeName(r);
}

