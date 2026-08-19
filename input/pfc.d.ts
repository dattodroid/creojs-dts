
/** -------------- OTK missing from IDL ----------------*/

/** Base classes to classes that represent Creo Parametric objects. */
declare interface pfcObject {
    getClassName(): string;
    isInstanceOf(className: string): boolean;
}

interface seq<T> {
    getarraysize(): number;
    get(idx: number): T;
    set(idx: number, value: T): void;
    removerange(frominc: number, toexcl: number): void;
    insert(idx: number, value: T): void;
    insertseq(idx: number, seq: seq<T>): void;
    toArray(): T[];
}

declare interface stringseq extends seq<string> { }
declare interface realseq extends seq<number> { }
declare interface intseq extends seq<number> { }
