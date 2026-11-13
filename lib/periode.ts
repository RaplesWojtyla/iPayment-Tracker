const NAMA_BULAN_ID: Record<string, number> = {
    januari: 1,
    jan: 1,
    january: 1,
    februari: 2,
    pebruari: 2,
    feb: 2,
    february: 2,
    maret: 3,
    mar: 3,
    march: 3,
    april: 4,
    apr: 4,
    mei: 5,
    may: 5,
    juni: 6,
    jun: 6,
    june: 6,
    juli: 7,
    jul: 7,
    july: 7,
    agustus: 8,
    agu: 8,
    ags: 8,
    august: 8,
    aug: 8,
    september: 9,
    sep: 9,
    oktober: 10,
    okt: 10,
    october: 10,
    oct: 10,
    november: 11,
    nopember: 11,
    nov: 11,
    desember: 12,
    des: 12,
    december: 12,
    dec: 12,
}

const BULAN_LABEL_INDONESIA = [
    "",
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
]

export function normalisasiPeriode(
    input: Date | string | null | undefined,
): string | null {
    if (!input) return null

    if (input instanceof Date) {
        if (isNaN(input.getTime())) return null
        const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Jakarta",
            year: "numeric",
            month: "2-digit",
        })
        const ym = formatter.format(input) // format: "YYYY-MM"
        return `${ym}-01`
    }

    const str = String(input).trim()
    if (!str) return null

    // ISO YYYY-MM atau YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/)
    if (isoMatch) {
        const year = parseInt(isoMatch[1], 10)
        const month = parseInt(isoMatch[2], 10)
        if (month >= 1 && month <= 12 && year >= 1970 && year <= 2100) {
            return `${year}-${String(month).padStart(2, "0")}-01`
        }
    }

    // DD/MM/YYYY atau DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
    if (dmyMatch) {
        const month = parseInt(dmyMatch[2], 10)
        const year = parseInt(dmyMatch[3], 10)
        if (month >= 1 && month <= 12 && year >= 1970 && year <= 2100) {
            return `${year}-${String(month).padStart(2, "0")}-01`
        }
    }

    // "November 2026", "Nov 2026", "2026 Nov", "November, 2026"
    const clean = str.toLowerCase().replace(/[^a-z0-9\s]/g, " ")
    const tokens = clean.split(/\s+/).filter(Boolean)

    let year: number | null = null
    let month: number | null = null

    for (const token of tokens) {
        if (/^\d{4}$/.test(token)) {
            year = parseInt(token, 10)
        } else if (token in NAMA_BULAN_ID) {
            month = NAMA_BULAN_ID[token]
        }
    }

    if (year !== null && month !== null) {
        if (year >= 1970 && year <= 2100) {
            return `${year}-${String(month).padStart(2, "0")}-01`
        }
    }

    return null
}

/**
 * ISO "YYYY-MM-01" -> "November 2026".
 */
export function formatPeriodeIndonesia(periodeIso: string): string {
    if (!periodeIso) return ""
    const match = periodeIso.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/)
    if (!match) return periodeIso

    const year = match[1]
    const month = parseInt(match[2], 10)
    const namaBulan = BULAN_LABEL_INDONESIA[month] || match[2]
    return `${namaBulan} ${year}`
}
