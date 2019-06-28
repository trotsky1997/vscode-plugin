export class SafeStringUtil {
    // tslint:disable-next-line: max-classes-per-file
    public static NotFoundError = class extends Error {
        constructor(searchString: string) {
            super("\"" + searchString + "\" not found");
        }
    };

    public static indexOf(source: string, searchString: string, position = 0): number {
        const p = source.indexOf(searchString, position);
        if (p < 0) {
            throw new SafeStringUtil.NotFoundError(searchString);
        }
        return p;
    }

    public static lastIndexOf(source: string, searchString: string, position = 0): number {
        const p = source.lastIndexOf(searchString, position);
        if (p < 0) {
            throw new SafeStringUtil.NotFoundError(searchString);
        }
        return p;
    }

    public static substring(source: string, start: number, end?: number): string {
        if (start < 0 || end < 0) {
            throw new SafeStringUtil.NotFoundError(`index ${start}|${end}`);
        }
        return source.substring(start, end);
    }
}
