import "archiver";
import type { Transform, Readable } from "node:stream";
declare module "archiver" {
  // Archiver 8 uses named constructors; DefinitelyTyped still describes the v7 factory.
  export class ZipArchive extends Transform {
    constructor(options?: { zlib?: { level?: number } });
    append(source: string | Buffer | Readable, data: { name: string; store?: boolean }): this;
    finalize(): Promise<void>;
    abort(): this;
  }
}
