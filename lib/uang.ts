export interface HasilValidasiNominal {
    valid: boolean;
    error: string | null;
    warning: string | null;
    absJumlahTagihan: number;
    absBelumBayar: number;
}

export function parseRupiah(
    input: number | string | null | undefined,
): number | null {
    if (input === null || input === undefined) return null;

    if (typeof input === "number") {
        if (!Number.isFinite(input)) return null;
        const rounded = Math.round(input);
        const normalized = Object.is(rounded, -0) ? 0 : rounded;
        return Number.isSafeInteger(normalized) ? normalized : null;
    }

    let str = String(input).trim();
    if (!str) return null;

    let isNegative = false;
    if (str.startsWith("(") && str.endsWith(")")) {
        isNegative = true;
        str = str.slice(1, -1).trim();
    } else if (str.startsWith("-")) {
        isNegative = true;
        str = str.slice(1).trim();
    }

    const currencyMatch = str.match(/^(?:rp|idr)\.?\s*/i);
    if (currencyMatch) {
        str = str.slice(currencyMatch[0].length).trim();
        if (!isNegative) {
            if (str.startsWith("(") && str.endsWith(")")) {
                isNegative = true;
                str = str.slice(1, -1).trim();
            } else if (str.startsWith("-")) {
                isNegative = true;
                str = str.slice(1).trim();
            }
        }
    }

    // Handle desimal Indonesia ",00" atau ",0" di akhir
    str = str.replace(/,\d+$/, "");

    // Hapus pemisah ribuan & spasi (contoh: "5.282.500" -> "5282500")
    str = str.replace(/[.\s]/g, "");

    if (!/^\d+$/.test(str)) {
        return null;
    }

    let result = parseInt(str, 10);
    if (isNaN(result)) return null;
    if (isNegative && result !== 0) result = -result;

    return Number.isSafeInteger(result) ? result : null;
}

/**
 * Mengembalikan nilai absolut nominal untuk seluruh operasi perhitungan & perbandingan.
 * Tanda negatif di database hanya dipertahankan sebagai representasi visual.
 */
export function nominalAbsolut(nilai: number | bigint): number {
    const num = Number(nilai);
    return num === 0 ? 0 : Math.abs(num);
}

/**
 * Memformat angka bulat ke string Rupiah berpemisah titik ribuan Indonesia.
 * Tanda negatif dipertahankan untuk tampilan visual (contoh: -10684646 -> "-10.684.646").
 */
export function formatRupiah(nilai: number | bigint | null | undefined): string {
    if (nilai === null || nilai === undefined || isNaN(Number(nilai))) {
        return "0";
    }

    const normalized = Object.is(nilai, -0) ? 0 : nilai;
    return new Intl.NumberFormat("id-ID").format(normalized);
}

/**
 * Menghasilkan pesan peringatan (warning) jika ada nominal yang bernilai negatif,
 * atau null jika seluruh nominal >= 0.
 * Digunakan baik pada pratinjau impor Excel maupun form input tagihan.
 */
export function cekPeringatanNominalNegatif(
    jumlahTagihan: number,
    belumBayar: number,
): string | null {
    const absJumlahTagihan = nominalAbsolut(jumlahTagihan);
    const absBelumBayar = nominalAbsolut(belumBayar);

    if (jumlahTagihan < 0 && belumBayar < 0) {
        return `Jumlah Tagihan (${formatRupiah(jumlahTagihan)}) dan Belum Bayar (${formatRupiah(belumBayar)}) bernilai negatif. Tanda negatif dipertahankan sebagai visual; perhitungan menggunakan nilai absolut.`;
    }

    if (jumlahTagihan < 0) {
        return `Jumlah Tagihan bernilai negatif (${formatRupiah(jumlahTagihan)}). Tanda negatif dipertahankan sebagai visual; perhitungan menggunakan nilai absolut (${formatRupiah(absJumlahTagihan)}).`;
    }

    if (belumBayar < 0) {
        return `Belum Bayar bernilai negatif (${formatRupiah(belumBayar)}). Tanda negatif dipertahankan sebagai visual; perhitungan menggunakan nilai absolut (${formatRupiah(absBelumBayar)}).`;
    }

    return null;
}

/**
 * Validasi nominal invoice menggunakan nilai absolut untuk operasi perbandingan,
 * disertai peringatan non-blocking apabila terdapat nominal negatif.
 */
export function validasiNominalInvoice(
    jumlahTagihan: number,
    belumBayar: number,
): HasilValidasiNominal {
    const absJumlahTagihan = nominalAbsolut(jumlahTagihan);
    const absBelumBayar = nominalAbsolut(belumBayar);

    if (absBelumBayar > absJumlahTagihan) {
        const hasNegative = jumlahTagihan < 0 || belumBayar < 0;
        const error = hasNegative
            ? `Nilai absolut Belum Bayar (${formatRupiah(absBelumBayar)}) tidak boleh melebihi nilai absolut Jumlah Tagihan (${formatRupiah(absJumlahTagihan)}).`
            : `Belum Bayar (${formatRupiah(belumBayar)}) tidak boleh melebihi Jumlah Tagihan (${formatRupiah(jumlahTagihan)}).`;

        return {
            valid: false,
            error,
            warning: null,
            absJumlahTagihan,
            absBelumBayar,
        };
    }

    return {
        valid: true,
        error: null,
        warning: cekPeringatanNominalNegatif(jumlahTagihan, belumBayar),
        absJumlahTagihan,
        absBelumBayar,
    };
}
