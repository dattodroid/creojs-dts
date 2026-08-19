import { ModuleDeclarationKind, Project, VariableDeclarationKind } from "ts-morph";
import { createDocs, createParamTags } from "./docs.js";
import { getConfig } from "./config.js";

const {
    emitExports: EXPORTED_ENABLED,
    typesAsInterfaces: USE_INTERFACES,
    enumsAs: ENUM_STYLE,
    interfaceStaticsAs: INTERFACE_STATIC_STYLE
} = getConfig();

interface ParameterMapResult {
    list: any[];
    docTags: string[];
}

export class DTSGenerator {
    static readonly SUPPORTED_PREFIXES = ["pfc", "wfc", "uifc"] as const;
    private readonly modulePrefix: string;

    constructor(modulePrefix: string) {
        this.modulePrefix = modulePrefix;
    }

    generate(idl: any): string {
        const project = new Project({ useInMemoryFileSystem: true });
        const source_file = project.createSourceFile(`${idl.name}.d.ts`, "", { overwrite: true });
        for (const decl of idl.declarations ?? []) {
            switch (decl.kind) {
                case "interface":
                    if (USE_INTERFACES) {
                        this.generateInterface(source_file, decl);
                    } else {
                        this.generateClass(source_file, decl);
                    }
                    break;
                case "enum": this.generateEnum(source_file, decl); break;
                case "sequence": this.generateSequence(source_file, decl); break;
                case "union": this.generateUnion(source_file, decl); break;
                case "array":
                case "matrix":
                    this.generateArrayLike(source_file, decl);
                    break;
                case "method":
                    this.generateStandaloneMethod(source_file, decl);
                    break;
            }
        }
        return source_file.getFullText();
    }

    private generateInterface(file: any, decl: any) {
        const interface_name = this.normalizeTypeName(decl.name);
        if (interface_name === "pfcObject") return;
        const parents = (decl.parents ?? [])
            .map((p: any) => this.normalizeRef(p.$ref))
            .filter((name: string | undefined): name is string => Boolean(name));
        const methods = (decl.methods ?? []).map((m: any) => {
            const param_info = this.mapParameters(m.parameters ?? []);
            return {
                name: m.name,
                returnType: this.resolveReturnType(m.returnType),
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
                type: this.resolveType(p.type),
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

        if (static_methods.length > 0) {
            if (INTERFACE_STATIC_STYLE === "namespace") {
                // Define static methods as functions in a namespace with the
                // same name as the interface.
                const namespace_declaration = file.addModule({
                    name: interface_name,
                    isExported: EXPORTED_ENABLED,
                    hasDeclareKeyword: true,
                    declarationKind: ModuleDeclarationKind.Namespace
                });

                for (const method of static_methods) {
                    namespace_declaration.addFunction({
                        name: method.name,
                        returnType: method.returnType,
                        parameters: method.parameters,
                        docs: method.docs
                    });
                }
            } else {
                // Separate interface for the static side, plus a const
                // binding for the instance type.
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
    }

    private generateClass(file: any, decl: any) {
        const class_name = this.normalizeTypeName(decl.name);
        if (class_name === "pfcObject") return;
        const parents = (decl.parents ?? [])
            .map((p: any) => this.normalizeRef(p.$ref))
            .filter((name: string | undefined): name is string => Boolean(name));
        const methods = (decl.methods ?? []).map((m: any) => {
            const param_info = this.mapParameters(m.parameters ?? []);
            return {
                name: m.name,
                returnType: this.resolveReturnType(m.returnType),
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
                type: this.resolveType(p.type),
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

    private generateStandaloneMethod(file: any, decl: any) {
        const param_info = this.mapParameters(decl.parameters ?? []);
        file.addFunction({
            name: `${this.modulePrefix}${decl.name}`,
            returnType: this.resolveReturnType(decl.returnType),
            parameters: param_info.list,
            docs: createDocs(decl.docs, param_info.docTags),
            hasDeclareKeyword: true,
            isExported: EXPORTED_ENABLED
        });
    }

    private mapParameters(parameters: any[]): ParameterMapResult {
        const list = parameters.map((param: any) => ({
            name: this.normalizeParameterName(param.name),
            type: this.resolveType(param.type),
            hasQuestionToken: param.optional === true || param.defaultValue !== undefined
        }));
        const doc_tags = createParamTags(parameters);
        return { list, docTags: doc_tags };
    }

    private generateEnum(file: any, decl: any) {
        if (ENUM_STYLE === "class") {
            const enumTypeName = this.normalizeTypeName(decl.name);
            const members = decl.values.map((v: unknown) => this.resolveEnumMember(v));

            file.addClass({
                isExported: EXPORTED_ENABLED,
                hasDeclareKeyword: true,
                name: enumTypeName,
                docs: createDocs(decl.docs),
                /**
                 * Enum-like objects expose a string() instance method on the
                 * underlying value type, mirroring the CreoJS runtime pattern:
                 *
                 *   declare class pfcFeatureType {
                 *     string(): string;
                 *     static readonly FEATTYPE_ANALYSIS: pfcFeatureType;
                 *     // ...
                 *   }
                 */
                methods: [
                    {
                        name: "string",
                        returnType: "string",
                        parameters: [],
                        docs: []
                    }
                ],
                properties: members.map(
                    (member: { name: string; docs?: string[] }) => ({
                        name: member.name,
                        type: enumTypeName,
                        isReadonly: true,
                        isStatic: true,
                        docs: member.docs
                    })
                )
            });
        }
        else {
        file.addEnum({
            isExported: EXPORTED_ENABLED,
            hasDeclareKeyword: true,
            name: this.normalizeTypeName(decl.name),
            docs: createDocs(decl.docs),
            members: decl.values.map((v: unknown) => this.resolveEnumMember(v))
        });
        }
    }

    private generateSequence(file: any, decl: any) {
        file.addTypeAlias({
            isExported: EXPORTED_ENABLED,
            hasDeclareKeyword: true,
            name: this.normalizeTypeName(decl.name),
            type: `${this.resolveType(decl.type)}[]`,
            docs: createDocs(decl.docs)
        });
    }

    private generateArrayLike(file: any, decl: any) {
        file.addTypeAlias({
            isExported: EXPORTED_ENABLED,
            hasDeclareKeyword: true,
            name: this.normalizeTypeName(decl.name),
            type: this.resolveArrayType(this.resolveType(decl.type), decl.dimensions),
            docs: createDocs(decl.docs)
        });
    }

    private generateUnion(file: any, decl: any) {
        const union_name = this.normalizeTypeName(decl.name);
        const discriminant = decl.switchName ? this.normalizeTypeName(decl.switchName) : undefined;
        const members = (decl.values ?? []).map((value: any) => {
            const member_name = value.name ?? "Value";
            const member_type = this.resolveType(value.type);
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

    private resolveArrayType(baseType: string, dimensions?: number[]): string {
        const dims = Array.isArray(dimensions) ? dimensions : [];
        if (!dims.length) {
            return `${baseType}[]`;
        }
        return this.buildTupleType(baseType, dims);
    }

    private buildTupleType(baseType: string, dimensions: number[]): string {
        if (!dimensions.length) {
            return baseType;
        }
        const [raw_size, ...rest] = dimensions;
        const size = typeof raw_size === "number" ? raw_size : Number.parseInt(String(raw_size ?? 0), 10);
        const inner_type = this.buildTupleType(baseType, rest);
        const length = Number.isFinite(size) ? Math.trunc(size) : 0;
        if (length <= 0) {
            return `${inner_type}[]`;
        }
        const parts = Array.from({ length }, () => inner_type).join(", ");
        return `[${parts}]`;
    }

    private resolveEnumMember(item: any) {
        if (typeof item === "string") {
            return { name: item };
        }
        const name = item?.value ?? item?.name ?? "unknown";
        return { name, docs: createDocs(item?.docs) };
    }

    private resolveType(type: any): string {
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
            return this.normalizeRef(type?.$ref)!;
        }
        return "any";
    }

    private resolveReturnType(type: any): string {
        return (!type) ? "void" : this.resolveType(type);
    }

    private normalizeParameterName(name: string): string {
        return (name) ? name : "value";
        // return name;.charAt(0).toLowerCase() + name.slice(1);
    }

    private normalizeRef(ref: string): string | undefined {
        if (!ref) return undefined;
        const [module, refType] = ref.split("::");
        const module_prefix = findMatchingPrefix(module);
        return this.normalizeTypeName(refType, module_prefix);
    }

    private normalizeTypeName(name: string, prefixOverride?: string): string {
        const prefix = (prefixOverride) ? prefixOverride : this.modulePrefix;
        return findMatchingPrefix(name) !== undefined ? name : `${prefix}${name}`;
    }
}

function findMatchingPrefix(value: string): string | undefined {
    return DTSGenerator.SUPPORTED_PREFIXES.find(prefix => value.startsWith(prefix));
}