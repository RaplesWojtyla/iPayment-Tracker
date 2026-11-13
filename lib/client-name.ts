export function normalisasiNama(nama: string): string {
    if (!nama) return "";

    return nama
        .toLowerCase()
        .replace(/[-/_]/g, " ")
        .replace(/[.,'"`()[\]{}!?:;]/g, " ")
        .replace(/\b(pt|cv|ud|pd|tbk)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    let s1 = a;
    let s2 = b;
    if (s1.length > s2.length) {
        s1 = b;
        s2 = a;
    }

    const n = s1.length;
    const m = s2.length;
    const prevRow = new Array<number>(n + 1);
    const currRow = new Array<number>(n + 1);

    for (let i = 0; i <= n; i++) {
        prevRow[i] = i;
    }

    for (let j = 1; j <= m; j++) {
        currRow[0] = j;
        const char2 = s2.charCodeAt(j - 1);

        for (let i = 1; i <= n; i++) {
            const cost = s1.charCodeAt(i - 1) === char2 ? 0 : 1;
            currRow[i] = Math.min(
                prevRow[i] + 1, // deletion
                currRow[i - 1] + 1, // insertion
                prevRow[i - 1] + cost, // substitution
            );
        }

        for (let i = 0; i <= n; i++) {
            prevRow[i] = currRow[i];
        }
    }

    return prevRow[n];
}

export function isMiripClient(
    namaNormalA: string,
    namaNormalB: string,
    maxDistance = 2,    
): boolean {
    if (!namaNormalA || !namaNormalB) return false;
    if (namaNormalA === namaNormalB) return false;
    const dist = levenshteinDistance(namaNormalA, namaNormalB);
    return dist > 0 && dist <= maxDistance;
}
