"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
    AlertCircleIcon,
    AlertTriangleIcon,
    ArrowRightIcon,
    Building2Icon,
    CheckCircle2Icon,
    CheckIcon,
    FileSpreadsheetIcon,
    RotateCcwIcon,
    UploadCloudIcon,
} from "lucide-react";
import { commitImportAction, previewImportAction } from "./actions";
import type { ImportPreviewResult } from "@/server/services/import";
import { formatPeriodeIndonesia } from "@/lib/periode";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface PicOption {
    id: string;
    name: string;
    email: string;
}

interface ImporClientProps {
    picUsers: PicOption[];
}

export function ImporClient({ picUsers }: ImporClientProps) {
    const [isPending, startTransition] = useTransition();
    const [selectedPicId, setSelectedPicId] = useState(picUsers[0]?.id || "");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
    const [conflictDecisions, setConflictDecisions] = useState<
        Record<string, "skip" | "transfer">
    >({});
    const [duplicateDecisions, setDuplicateDecisions] = useState<
        Record<
            string,
            | { decision: "merge"; targetClientId: string }
            | { decision: "separate" }
        >
    >({});

    const [commitSummary, setCommitSummary] = useState<{
        newAccountsInserted: number;
        accountsUpdated: number;
        accountsTransferred: number;
        accountsSkipped: number;
        invoicesUpserted: number;
    } | null>(null);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setErrorMsg(null);
        }
    };

    const handlePreviewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setErrorMsg("Pilih file Excel terlebih dahulu.");
            return;
        }

        setErrorMsg(null);
        const formData = new FormData();
        formData.set("picId", selectedPicId);
        formData.set("file", selectedFile);

        startTransition(async () => {
            const res = await previewImportAction(formData);
            if (res.error) {
                setErrorMsg(res.error);
            } else if (res.preview) {
                setPreview(res.preview);

                const initialConflicts: Record<string, "skip" | "transfer"> =
                    {};
                for (const c of res.preview.conflicts) {
                    initialConflicts[c.noAkun] = "skip";
                }
                setConflictDecisions(initialConflicts);

                const initialDuplicates: Record<
                    string,
                    | { decision: "merge"; targetClientId: string }
                    | { decision: "separate" }
                > = {};
                for (const d of res.preview.duplicateCandidates) {
                    initialDuplicates[d.namaNormal] = {
                        decision: "merge",
                        targetClientId: d.existingClientId,
                    };
                }
                setDuplicateDecisions(initialDuplicates);
            }
        });
    };

    const handleCommitSubmit = () => {
        if (!preview) return;
        setErrorMsg(null);

        startTransition(async () => {
            const res = await commitImportAction({
                picId: selectedPicId,
                parsedMaster: preview.parsedMaster,
                parsedTagihan: preview.parsedTagihan,
                conflictDecisions,
                duplicateDecisions,
            });

            if (res.error) {
                setErrorMsg(res.error);
            } else if (res.summary) {
                setCommitSummary(res.summary);
            }
        });
    };

    const handleReset = () => {
        setPreview(null);
        setCommitSummary(null);
        setSelectedFile(null);
        setErrorMsg(null);
    };

    const selectedPicObj = picUsers.find((u) => u.id === selectedPicId);
    const selectedPicLabel = selectedPicObj
        ? `${selectedPicObj.name || selectedPicObj.email} (${selectedPicObj.email})`
        : "Pilih PIC";

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    Impor Data Pelanggan (Excel)
                </h1>
                <p className="text-sm text-muted-foreground">
                    Impor buku kerja Excel berisi lembar{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                        Master_Pelanggan
                    </code>{" "}
                    dan opsional{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                        Data_Tagihan
                    </code>
                    .
                </p>
            </div>

            {errorMsg && (
                <Alert variant="destructive">
                    <AlertCircleIcon />
                    <AlertTitle>Terjadi Kesalahan</AlertTitle>
                    <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
            )}

            {/* Success Report */}
            {commitSummary && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                                <CheckCircle2Icon className="size-5" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <CardTitle>Impor Berhasil Disimpan</CardTitle>
                                <CardDescription>
                                    Seluruh data telah dimasukkan ke database
                                    dalam satu transaksi aman.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                            <div className="rounded-lg border border-border bg-muted/40 p-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase">
                                    Akun Baru
                                </p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">
                                    {commitSummary.newAccountsInserted}
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/40 p-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase">
                                    Akun Diperbarui
                                </p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">
                                    {commitSummary.accountsUpdated}
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/40 p-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase">
                                    PIC Dipindahkan
                                </p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">
                                    {commitSummary.accountsTransferred}
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/40 p-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase">
                                    Akun Dilewati
                                </p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">
                                    {commitSummary.accountsSkipped}
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/40 p-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase">
                                    Tagihan Masuk
                                </p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">
                                    {commitSummary.invoicesUpserted}
                                </p>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-wrap gap-2 border-t border-border pt-4">
                        <Button
                            nativeButton={false}
                            render={<Link href="/admin/akun-master" />}
                        >
                            Buka Daftar Akun Master
                            <ArrowRightIcon data-icon="inline-end" />
                        </Button>
                        <Button variant="outline" onClick={handleReset}>
                            <RotateCcwIcon data-icon="inline-start" />
                            Impor File Lain
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Upload Form */}
            {!preview && !commitSummary && (
                <Card className="max-w-xl">
                    <CardHeader>
                        <CardTitle>Unggah File Excel</CardTitle>
                        <CardDescription>
                            Pilih PIC tujuan dan file workbook untuk pratinjau.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePreviewSubmit}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="import-pic-select">
                                        Pilih Penanggung Jawab (PIC)
                                    </FieldLabel>
                                    <Select
                                        value={selectedPicId}
                                        onValueChange={(val) =>
                                            setSelectedPicId(val || "")
                                        }
                                    >
                                        <SelectTrigger
                                            id="import-pic-select"
                                            className="w-full"
                                        >
                                            <SelectValue>
                                                {selectedPicLabel}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {picUsers.map((u) => (
                                                    <SelectItem
                                                        key={u.id}
                                                        value={u.id}
                                                    >
                                                        {u.name || u.email} (
                                                        {u.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <FieldDescription>
                                        Akun di file ini akan otomatis
                                        ditetapkan ke PIC terpilih.
                                    </FieldDescription>
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="import-file-input">
                                        File Excel (.xlsx)
                                    </FieldLabel>
                                    <div className="relative cursor-pointer rounded-xl border border-dashed border-border p-6 text-center transition-colors hover:bg-muted/40">
                                        <input
                                            id="import-file-input"
                                            type="file"
                                            required
                                            accept=".xlsx,.xls"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 cursor-pointer opacity-0"
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground">
                                                <UploadCloudIcon className="size-5" />
                                            </div>
                                            <div className="text-sm font-medium text-foreground">
                                                {selectedFile
                                                    ? selectedFile.name
                                                    : "Pilih atau seret file Excel ke sini"}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Format .xlsx dengan sheet
                                                Master_Pelanggan
                                            </p>
                                        </div>
                                    </div>
                                </Field>

                                <Button
                                    type="submit"
                                    disabled={isPending || !selectedFile}
                                    className="w-full"
                                >
                                    {isPending ? (
                                        <Spinner data-icon="inline-start" />
                                    ) : (
                                        <FileSpreadsheetIcon data-icon="inline-start" />
                                    )}
                                    {isPending
                                        ? "Menganalisis File…"
                                        : "Lanjut ke Pratinjau (Dry-Run)"}
                                </Button>
                            </FieldGroup>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Skeleton Preview while analyzing */}
            {!preview && !commitSummary && isPending && (
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton
                                    key={i}
                                    className="h-18 w-full rounded-lg"
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pratinjau */}
            {preview && !commitSummary && (
                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader className="flex flex-col justify-between gap-2 border-b border-border pb-4 sm:flex-row sm:items-center">
                            <div className="flex flex-col gap-1">
                                <CardTitle>
                                    Pratinjau Impor (Dry-Run)
                                </CardTitle>
                                <CardDescription>
                                    PIC Tujuan:{" "}
                                    <span className="font-medium text-foreground">
                                        {preview.selectedPic.name} (
                                        {preview.selectedPic.email})
                                    </span>
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReset}
                            >
                                <RotateCcwIcon data-icon="inline-start" />
                                Unggah File Lain
                            </Button>
                        </CardHeader>

                        <CardContent className="pt-4">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                <div className="rounded-lg border border-border bg-muted/40 p-3">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">
                                        Total di File
                                    </p>
                                    <p className="mt-1 text-xl font-semibold text-foreground">
                                        {preview.totalAccountsInFile}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/40 p-3">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">
                                        Akun Baru
                                    </p>
                                    <p className="mt-1 text-xl font-semibold text-foreground">
                                        {preview.newAccountsCount}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/40 p-3">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">
                                        Akun Sudah Ada
                                    </p>
                                    <p className="mt-1 text-xl font-semibold text-foreground">
                                        {preview.existingAccountsCount}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/40 p-3">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">
                                        Konflik PIC
                                    </p>
                                    <p className="mt-1 text-xl font-semibold text-foreground">
                                        {preview.conflicts.length}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/40 p-3">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">
                                        Peringatan
                                    </p>
                                    <p className="mt-1 text-xl font-semibold text-foreground">
                                        {preview.warningRows.length}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-muted/40 p-3">
                                    <p className="text-xs font-medium text-muted-foreground uppercase">
                                        Baris Gagal
                                    </p>
                                    <p className="mt-1 text-xl font-semibold text-destructive">
                                        {preview.failedRows.length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Konflik PIC */}
                    {preview.conflicts.length > 0 && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                                        <AlertTriangleIcon className="size-4" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <CardTitle>
                                            Deteksi Konflik Kepemilikan PIC (
                                            {preview.conflicts.length})
                                        </CardTitle>
                                        <CardDescription>
                                            No. Akun di bawah ini sudah
                                            terdaftar di database tetapi
                                            dimiliki oleh PIC lain. Pilih apakah
                                            ingin melewati atau memindahkan
                                            kepemilikannya ke PIC terpilih.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <div className="overflow-hidden rounded-lg border border-border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                                <TableHead className="px-4">
                                                    No. Akun
                                                </TableHead>
                                                <TableHead className="px-4">
                                                    Client
                                                </TableHead>
                                                <TableHead className="px-4">
                                                    PIC Saat Ini
                                                </TableHead>
                                                <TableHead className="px-4">
                                                    PIC Tujuan
                                                </TableHead>
                                                <TableHead className="px-4 text-right">
                                                    Keputusan Admin
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {preview.conflicts.map((c) => {
                                                const decision =
                                                    conflictDecisions[
                                                        c.noAkun
                                                    ] || "skip";
                                                return (
                                                    <TableRow key={c.noAkun}>
                                                        <TableCell className="px-4 font-mono font-semibold">
                                                            {c.noAkun}
                                                        </TableCell>
                                                        <TableCell className="px-4">
                                                            {c.clientNama}
                                                        </TableCell>
                                                        <TableCell className="px-4">
                                                            <Badge variant="destructive">
                                                                {
                                                                    c.currentPicName
                                                                }
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="px-4">
                                                            <Badge variant="secondary">
                                                                {
                                                                    c.targetPicName
                                                                }
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="px-4 text-right">
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <Button
                                                                    type="button"
                                                                    size="xs"
                                                                    variant={
                                                                        decision ===
                                                                        "skip"
                                                                            ? "default"
                                                                            : "outline"
                                                                    }
                                                                    onClick={() =>
                                                                        setConflictDecisions(
                                                                            {
                                                                                ...conflictDecisions,
                                                                                [c.noAkun]:
                                                                                    "skip",
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    Lewati
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="xs"
                                                                    variant={
                                                                        decision ===
                                                                        "transfer"
                                                                            ? "default"
                                                                            : "outline"
                                                                    }
                                                                    onClick={() =>
                                                                        setConflictDecisions(
                                                                            {
                                                                                ...conflictDecisions,
                                                                                [c.noAkun]:
                                                                                    "transfer",
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    Pindahkan
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Kandidat Duplikasi Client */}
                    {preview.duplicateCandidates.length > 0 && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                                        <Building2Icon className="size-4" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <CardTitle>
                                            Kandidat Duplikat Nama Client (
                                            {preview.duplicateCandidates.length}
                                            )
                                        </CardTitle>
                                        <CardDescription>
                                            Nama client berikut mirip dengan
                                            data client yang sudah ada di
                                            database. Pilih apakah ingin
                                            menggabungkan ke data yang ada atau
                                            membuat client baru.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <div className="overflow-hidden rounded-lg border border-border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                                <TableHead className="px-4">
                                                    Nama di File Excel
                                                </TableHead>
                                                <TableHead className="px-4">
                                                    Nama Mirip di Database
                                                </TableHead>
                                                <TableHead className="px-4 text-center">
                                                    Jarak
                                                </TableHead>
                                                <TableHead className="px-4 text-right">
                                                    Keputusan Admin
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {preview.duplicateCandidates.map(
                                                (d) => {
                                                    const decision =
                                                        duplicateDecisions[
                                                            d.namaNormal
                                                        ]?.decision || "merge";
                                                    return (
                                                        <TableRow
                                                            key={d.namaNormal}
                                                        >
                                                            <TableCell className="px-4 font-medium">
                                                                <div>
                                                                    {d.rawName}
                                                                </div>
                                                                <div className="font-mono text-xs text-muted-foreground">
                                                                    norm:{" "}
                                                                    {
                                                                        d.namaNormal
                                                                    }
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-4 font-medium">
                                                                <div>
                                                                    {
                                                                        d.existingClientNama
                                                                    }
                                                                </div>
                                                                <div className="font-mono text-xs text-muted-foreground">
                                                                    norm:{" "}
                                                                    {
                                                                        d.existingClientNamaNormal
                                                                    }
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="px-4 text-center font-mono text-xs text-muted-foreground">
                                                                {d.distance}
                                                            </TableCell>
                                                            <TableCell className="px-4 text-right">
                                                                <div className="inline-flex items-center gap-1.5">
                                                                    <Button
                                                                        type="button"
                                                                        size="xs"
                                                                        variant={
                                                                            decision ===
                                                                            "merge"
                                                                                ? "default"
                                                                                : "outline"
                                                                        }
                                                                        onClick={() =>
                                                                            setDuplicateDecisions(
                                                                                {
                                                                                    ...duplicateDecisions,
                                                                                    [d.namaNormal]:
                                                                                        {
                                                                                            decision:
                                                                                                "merge",
                                                                                            targetClientId:
                                                                                                d.existingClientId,
                                                                                        },
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        Gabung
                                                                        ke DB
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        size="xs"
                                                                        variant={
                                                                            decision ===
                                                                            "separate"
                                                                                ? "default"
                                                                                : "outline"
                                                                        }
                                                                        onClick={() =>
                                                                            setDuplicateDecisions(
                                                                                {
                                                                                    ...duplicateDecisions,
                                                                                    [d.namaNormal]:
                                                                                        {
                                                                                            decision:
                                                                                                "separate",
                                                                                        },
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        Buat
                                                                        Baru
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                },
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Peringatan Nominal Negatif */}
                    {preview.warningRows.length > 0 && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                                        <AlertTriangleIcon className="size-4" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <CardTitle>
                                            Peringatan Nominal Negatif (
                                            {preview.warningRows.length})
                                        </CardTitle>
                                        <CardDescription>
                                            Baris-baris berikut memiliki nominal
                                            bernilai negatif. Data tetap akan
                                            disimpan beserta tanda negatifnya
                                            sebagai tampilan visual, sedangkan
                                            seluruh perhitungan menggunakan
                                            nilai absolut.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                                <TableHead className="px-4">
                                                    Sheet
                                                </TableHead>
                                                <TableHead className="px-4">
                                                    Baris
                                                </TableHead>
                                                <TableHead className="px-4">
                                                    No. Akun
                                                </TableHead>
                                                <TableHead className="px-4">
                                                    Periode
                                                </TableHead>
                                                <TableHead className="px-4">
                                                    Peringatan
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {preview.warningRows.map(
                                                (w, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="px-4 font-medium">
                                                            {w.sheet}
                                                        </TableCell>
                                                        <TableCell className="px-4 font-mono text-muted-foreground">
                                                            {w.row}
                                                        </TableCell>
                                                        <TableCell className="px-4 font-mono font-semibold">
                                                            {w.noAkun}
                                                        </TableCell>
                                                        <TableCell className="px-4 whitespace-nowrap">
                                                            {formatPeriodeIndonesia(
                                                                w.periode,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="px-4 text-muted-foreground">
                                                            {w.reason}
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Baris Gagal */}
                    {preview.failedRows.length > 0 && (
                        <Card>
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                                        <AlertCircleIcon className="size-4" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <CardTitle>
                                            Baris yang Gagal Divalidasi (
                                            {preview.failedRows.length})
                                        </CardTitle>
                                        <CardDescription>
                                            Baris-baris berikut memiliki
                                            kesalahan format dan akan otomatis
                                            dilewati saat penyimpanan.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                                <TableHead className="px-4">
                                                    Sheet
                                                </TableHead>
                                                <TableHead className="px-4">
                                                    Baris
                                                </TableHead>
                                                <TableHead className="px-4">
                                                    Alasan Kegagalan
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {preview.failedRows.map(
                                                (f, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="px-4 font-medium">
                                                            {f.sheet}
                                                        </TableCell>
                                                        <TableCell className="px-4 font-mono text-muted-foreground">
                                                            {f.row}
                                                        </TableCell>
                                                        <TableCell className="px-4 text-destructive">
                                                            {f.reason}
                                                        </TableCell>
                                                    </TableRow>
                                                ),
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Konfirmasi Transaksi */}
                    <Card>
                        <CardContent className="flex flex-col items-start justify-between gap-4 py-4 sm:flex-row sm:items-center">
                            <div className="flex flex-col gap-0.5">
                                <p className="font-semibold text-foreground">
                                    Siap untuk Menyimpan Data?
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Proses ini dijalankan dalam satu transaksi
                                    database.
                                </p>
                            </div>
                            <div className="flex w-full items-center gap-2 sm:w-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleReset}
                                    className="flex-1 sm:flex-initial"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleCommitSubmit}
                                    disabled={isPending}
                                    className="flex-1 sm:flex-initial"
                                >
                                    {isPending ? (
                                        <Spinner data-icon="inline-start" />
                                    ) : (
                                        <CheckIcon data-icon="inline-start" />
                                    )}
                                    {isPending
                                        ? "Menyimpan Transaksi…"
                                        : "Konfirmasi & Simpan Transaksi"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
