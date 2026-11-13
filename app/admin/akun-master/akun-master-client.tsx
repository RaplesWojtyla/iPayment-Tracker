"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    AlertCircleIcon,
    ArrowRightLeftIcon,
    Building2Icon,
    CheckCircle2Icon,
    ChevronLeftIcon,
    ChevronRightIcon,
    MoreHorizontalIcon,
    PencilIcon,
    PlusIcon,
    PowerIcon,
    SearchIcon,
    UserCheckIcon,
    UsersIcon,
} from "lucide-react";
import {
    createAccountAction,
    createClientAction,
    mergeClientsAction,
    moveAccountClientAction,
    setAccountAktifAction,
    setAccountPicAction,
    updateClientAction,
} from "./actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AccountItem {
    id: string;
    noAkun: string;
    aktif: boolean;
    lastCheckedAt: Date | null;
    createdAt: Date;
    clientId: string;
    clientNama: string;
    picId: string | null;
    picName: string | null;
    picEmail: string | null;
}

interface ClientItem {
    id: string;
    nama: string;
    namaNormal: string;
    kontakEmail: string | null;
    kontakWhatsapp: string | null;
    createdAt: Date;
    accountCount: number;
}

interface DropdownOption {
    id: string;
    nama: string;
}

interface UserOption {
    id: string;
    name: string;
    email: string;
}

interface AkunMasterClientProps {
    tab: "akun" | "client";
    accountsData: {
        data: AccountItem[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
    clientsData: {
        data: ClientItem[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
    picUsers: UserOption[];
    allClients: DropdownOption[];
}

export function AkunMasterClient({
    tab: initialTab,
    accountsData,
    clientsData,
    picUsers,
    allClients,
}: AkunMasterClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isNavigating, startNavTransition] = useTransition();

    const activeTab =
        (searchParams.get("tab") as "akun" | "client") || initialTab || "akun";
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Filter states
    const [accountSearch, setAccountSearch] = useState(
        searchParams.get("search") || "",
    );
    const [clientSearch, setClientSearch] = useState(
        searchParams.get("csearch") || "",
    );

    // Modals
    const [modalAddAccount, setModalAddAccount] = useState(false);
    const [modalAddClient, setModalAddClient] = useState(false);
    const [modalEditClient, setModalEditClient] = useState<ClientItem | null>(
        null,
    );
    const [modalMergeClient, setModalMergeClient] =
        useState<ClientItem | null>(null);
    const [modalMoveAccount, setModalMoveAccount] =
        useState<AccountItem | null>(null);
    const [modalSetPic, setModalSetPic] = useState<AccountItem | null>(null);

    // Confirm AlertDialogs
    const [confirmToggleAccount, setConfirmToggleAccount] =
        useState<AccountItem | null>(null);
    const [confirmMergeOpen, setConfirmMergeOpen] = useState(false);

    // Form states
    const [newNoAkun, setNewNoAkun] = useState("");
    const [newAccountClientId, setNewAccountClientId] = useState(
        allClients[0]?.id || "",
    );
    const [newAccountPicId, setNewAccountPicId] = useState("none");

    const [newClientNama, setNewClientNama] = useState("");
    const [newClientEmail, setNewClientEmail] = useState("");
    const [newClientWhatsapp, setNewClientWhatsapp] = useState("");

    const [editClientNama, setEditClientNama] = useState("");
    const [editClientEmail, setEditClientEmail] = useState("");
    const [editClientWhatsapp, setEditClientWhatsapp] = useState("");

    const [mergeTargetClientId, setMergeTargetClientId] = useState("");
    const [moveTargetClientId, setMoveTargetClientId] = useState("");
    const [singlePicId, setSinglePicId] = useState("none");
    const [bulkPicId, setBulkPicId] = useState("none");

    const updateQueryParams = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [k, v] of Object.entries(updates)) {
            if (v === null || v === "") {
                params.delete(k);
            } else {
                params.set(k, v);
            }
        }
        startNavTransition(() => {
            router.push(`/admin/akun-master?${params.toString()}`);
        });
    };

    const handleTabChange = (newTab: string) => {
        setErrorMsg(null);
        setSuccessMsg(null);
        updateQueryParams({ tab: newTab, page: "1" });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeTab === "akun") {
            updateQueryParams({ search: accountSearch.trim(), page: "1" });
        } else {
            updateQueryParams({ csearch: clientSearch.trim(), cpage: "1" });
        }
    };

    // Selection helpers
    const allSelected =
        accountsData.data.length > 0 &&
        accountsData.data.every((a) => selectedAccountIds.includes(a.id));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedAccountIds([]);
        } else {
            setSelectedAccountIds(accountsData.data.map((a) => a.id));
        }
    };

    const toggleSelectAccount = (id: string) => {
        setSelectedAccountIds((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id],
        );
    };

    // Action Handlers
    const handleCreateAccount = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        startTransition(async () => {
            const res = await createAccountAction({
                noAkun: newNoAkun,
                clientId: newAccountClientId,
                picId: newAccountPicId === "none" ? null : newAccountPicId,
            });
            if (res.error) {
                setErrorMsg(res.error);
            } else {
                setSuccessMsg(`Akun "${newNoAkun}" berhasil ditambahkan.`);
                setModalAddAccount(false);
                setNewNoAkun("");
                setNewAccountPicId("none");
            }
        });
    };

    const handleBulkSetPic = () => {
        if (selectedAccountIds.length === 0) return;
        setErrorMsg(null);
        setSuccessMsg(null);

        startTransition(async () => {
            const res = await setAccountPicAction({
                accountIds: selectedAccountIds,
                picId: bulkPicId === "none" ? null : bulkPicId,
            });
            if (res.error) {
                setErrorMsg(res.error);
            } else {
                setSuccessMsg(
                    `Berhasil memperbarui PIC untuk ${res.count} akun.`,
                );
                setSelectedAccountIds([]);
                setBulkPicId("none");
            }
        });
    };

    const handleSingleSetPic = (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalSetPic) return;
        setErrorMsg(null);
        setSuccessMsg(null);

        startTransition(async () => {
            const res = await setAccountPicAction({
                accountIds: [modalSetPic.id],
                picId: singlePicId === "none" ? null : singlePicId,
            });
            if (res.error) {
                setErrorMsg(res.error);
            } else {
                setSuccessMsg(
                    `PIC untuk akun ${modalSetPic.noAkun} berhasil diperbarui.`,
                );
                setModalSetPic(null);
            }
        });
    };

    const handleMoveAccount = (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalMoveAccount || !moveTargetClientId) return;
        setErrorMsg(null);
        setSuccessMsg(null);

        startTransition(async () => {
            const res = await moveAccountClientAction({
                accountId: modalMoveAccount.id,
                targetClientId: moveTargetClientId,
            });
            if (res.error) {
                setErrorMsg(res.error);
            } else {
                setSuccessMsg(
                    `Akun ${modalMoveAccount.noAkun} berhasil dipindahkan.`,
                );
                setModalMoveAccount(null);
            }
        });
    };

    const handleConfirmToggleAccountAktif = () => {
        if (!confirmToggleAccount) return;
        const acc = confirmToggleAccount;
        setConfirmToggleAccount(null);
        setErrorMsg(null);
        setSuccessMsg(null);

        startTransition(async () => {
            const res = await setAccountAktifAction({
                accountId: acc.id,
                aktif: !acc.aktif,
            });
            if (res.error) {
                setErrorMsg(res.error);
            } else {
                setSuccessMsg(
                    `Akun ${acc.noAkun} berhasil ${
                        !acc.aktif ? "diaktifkan" : "dinonaktifkan"
                    }.`,
                );
            }
        });
    };

    const handleCreateClient = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        startTransition(async () => {
            const res = await createClientAction({
                nama: newClientNama,
                kontakEmail: newClientEmail,
                kontakWhatsapp: newClientWhatsapp,
            });
            if (res.error) {
                setErrorMsg(res.error);
            } else {
                setSuccessMsg(`Client "${newClientNama}" berhasil ditambahkan.`);
                setModalAddClient(false);
                setNewClientNama("");
                setNewClientEmail("");
                setNewClientWhatsapp("");
            }
        });
    };

    const handleUpdateClient = (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalEditClient) return;
        setErrorMsg(null);
        setSuccessMsg(null);

        startTransition(async () => {
            const res = await updateClientAction({
                id: modalEditClient.id,
                nama: editClientNama,
                kontakEmail: editClientEmail,
                kontakWhatsapp: editClientWhatsapp,
            });
            if (res.error) {
                setErrorMsg(res.error);
            } else {
                setSuccessMsg(`Data client "${editClientNama}" diperbarui.`);
                setModalEditClient(null);
            }
        });
    };

    const handleRequestMergeClient = (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalMergeClient || !mergeTargetClientId) return;
        setConfirmMergeOpen(true);
    };

    const handleConfirmMergeClient = () => {
        if (!modalMergeClient || !mergeTargetClientId) return;
        setConfirmMergeOpen(false);
        setErrorMsg(null);
        setSuccessMsg(null);

        const target = allClients.find((c) => c.id === mergeTargetClientId);

        startTransition(async () => {
            const res = await mergeClientsAction({
                sourceClientId: modalMergeClient.id,
                targetClientId: mergeTargetClientId,
            });
            if (res.error) {
                setErrorMsg(res.error);
            } else {
                setSuccessMsg(
                    `Berhasil menggabungkan client. ${res.count} akun dipindahkan ke "${target?.nama}".`,
                );
                setModalMergeClient(null);
            }
        });
    };

    // Label helpers for SelectValue
    const picFilterVal = searchParams.get("pic") || "all";
    const picFilterLabel =
        picFilterVal === "all"
            ? "Semua PIC"
            : picFilterVal === "unassigned"
              ? "Belum ada PIC"
              : (() => {
                    const u = picUsers.find((x) => x.id === picFilterVal);
                    return u ? `PIC: ${u.name || u.email}` : "Semua PIC";
                })();

    const clientFilterVal = searchParams.get("client") || "all";
    const clientFilterLabel =
        clientFilterVal === "all"
            ? "Semua Client"
            : allClients.find((c) => c.id === clientFilterVal)?.nama ||
              "Semua Client";

    const aktifFilterVal = searchParams.get("aktif") || "all";
    const aktifFilterLabel =
        aktifFilterVal === "true"
            ? "Aktif"
            : aktifFilterVal === "false"
              ? "Nonaktif"
              : "Semua Status";

    const getPicLabel = (id: string) => {
        if (id === "none") return "(Kosongkan / Tanpa PIC)";
        const u = picUsers.find((x) => x.id === id);
        return u ? u.name || u.email : "Pilih PIC";
    };

    const getClientLabel = (id: string) =>
        allClients.find((c) => c.id === id)?.nama || "Pilih Client";

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        Akun Master & Client
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Kelola data pelanggan, akun portal, dan penetapan PIC.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {activeTab === "akun" ? (
                        <Button onClick={() => setModalAddAccount(true)}>
                            <PlusIcon data-icon="inline-start" />
                            Tambah Akun
                        </Button>
                    ) : (
                        <Button onClick={() => setModalAddClient(true)}>
                            <PlusIcon data-icon="inline-start" />
                            Tambah Client
                        </Button>
                    )}
                </div>
            </div>

            {errorMsg && (
                <Alert variant="destructive">
                    <AlertCircleIcon />
                    <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
            )}

            {successMsg && (
                <Alert>
                    <CheckCircle2Icon />
                    <AlertDescription>{successMsg}</AlertDescription>
                </Alert>
            )}

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList variant="line">
                    <TabsTrigger value="akun">
                        <UsersIcon />
                        Daftar Akun & PIC
                        <Badge variant="secondary">{accountsData.total}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="client">
                        <Building2Icon />
                        Daftar Client
                        <Badge variant="secondary">{clientsData.total}</Badge>
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Akun Content */}
                <TabsContent value="akun" className="mt-4 flex flex-col gap-4">
                    <Card className="p-4">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                        >
                            <InputGroup>
                                <InputGroupAddon align="inline-start">
                                    <SearchIcon />
                                </InputGroupAddon>
                                <InputGroupInput
                                    type="text"
                                    value={accountSearch}
                                    onChange={(e) =>
                                        setAccountSearch(e.target.value)
                                    }
                                    placeholder="Cari No. Akun / Client…"
                                />
                            </InputGroup>

                            <Select
                                value={picFilterVal}
                                onValueChange={(val) =>
                                    updateQueryParams({
                                        pic:
                                            !val || val === "all" ? null : val,
                                        page: "1",
                                    })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue>{picFilterLabel}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="all">
                                            Semua PIC
                                        </SelectItem>
                                        <SelectItem value="unassigned">
                                            Belum ada PIC
                                        </SelectItem>
                                        {picUsers.map((u) => (
                                            <SelectItem key={u.id} value={u.id}>
                                                PIC: {u.name || u.email}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>

                            <Select
                                value={clientFilterVal}
                                onValueChange={(val) =>
                                    updateQueryParams({
                                        client:
                                            !val || val === "all" ? null : val,
                                        page: "1",
                                    })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue>
                                        {clientFilterLabel}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="all">
                                            Semua Client
                                        </SelectItem>
                                        {allClients.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.nama}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>

                            <Select
                                value={aktifFilterVal}
                                onValueChange={(val) =>
                                    updateQueryParams({
                                        aktif:
                                            !val || val === "all" ? null : val,
                                        page: "1",
                                    })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue>
                                        {aktifFilterLabel}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="all">
                                            Semua Status
                                        </SelectItem>
                                        <SelectItem value="true">
                                            Aktif
                                        </SelectItem>
                                        <SelectItem value="false">
                                            Nonaktif
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </form>

                        {selectedAccountIds.length > 0 && (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2">
                                <div className="text-sm font-medium text-foreground">
                                    <Badge variant="default" className="mr-2">
                                        {selectedAccountIds.length}
                                    </Badge>
                                    akun dipilih
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={bulkPicId}
                                        onValueChange={(val) =>
                                            setBulkPicId(val || "none")
                                        }
                                    >
                                        <SelectTrigger className="w-52 bg-background">
                                            <SelectValue>
                                                {bulkPicId === "none"
                                                    ? "Pilih PIC Baru…"
                                                    : getPicLabel(bulkPicId)}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="none">
                                                    (Kosongkan / Tanpa PIC)
                                                </SelectItem>
                                                {picUsers.map((u) => (
                                                    <SelectItem
                                                        key={u.id}
                                                        value={u.id}
                                                    >
                                                        {u.name || u.email}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        onClick={handleBulkSetPic}
                                        disabled={isPending}
                                    >
                                        {isPending && (
                                            <Spinner data-icon="inline-start" />
                                        )}
                                        Terapkan PIC
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card className="overflow-hidden p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableHead className="w-10 px-4">
                                        <Checkbox
                                            checked={allSelected}
                                            onCheckedChange={toggleSelectAll}
                                            aria-label="Pilih semua akun"
                                        />
                                    </TableHead>
                                    <TableHead className="px-4">
                                        No. Akun
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Client
                                    </TableHead>
                                    <TableHead className="px-4">PIC</TableHead>
                                    <TableHead className="px-4">
                                        Status
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Terakhir Dicek
                                    </TableHead>
                                    <TableHead className="px-4 text-right">
                                        Aksi
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isNavigating ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="px-4">
                                                <Skeleton className="size-4 rounded" />
                                            </TableCell>
                                            <TableCell className="px-4">
                                                <Skeleton className="h-4 w-24" />
                                            </TableCell>
                                            <TableCell className="px-4">
                                                <Skeleton className="h-4 w-40" />
                                            </TableCell>
                                            <TableCell className="px-4">
                                                <Skeleton className="h-5 w-24 rounded-full" />
                                            </TableCell>
                                            <TableCell className="px-4">
                                                <Skeleton className="h-5 w-16 rounded-full" />
                                            </TableCell>
                                            <TableCell className="px-4">
                                                <Skeleton className="h-4 w-24" />
                                            </TableCell>
                                            <TableCell className="px-4 text-right">
                                                <Skeleton className="ml-auto size-7 rounded-md" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : accountsData.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="p-0">
                                            <Empty className="py-12">
                                                <EmptyHeader>
                                                    <EmptyMedia variant="icon">
                                                        <UsersIcon />
                                                    </EmptyMedia>
                                                    <EmptyTitle>
                                                        Tidak ada akun ditemukan
                                                    </EmptyTitle>
                                                    <EmptyDescription>
                                                        Coba ubah filter atau
                                                        kata kunci pencarian
                                                        Anda.
                                                    </EmptyDescription>
                                                </EmptyHeader>
                                            </Empty>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    accountsData.data.map((acc) => {
                                        const isSelected =
                                            selectedAccountIds.includes(acc.id);
                                        return (
                                            <TableRow
                                                key={acc.id}
                                                data-state={
                                                    isSelected
                                                        ? "selected"
                                                        : undefined
                                                }
                                            >
                                                <TableCell className="px-4">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() =>
                                                            toggleSelectAccount(
                                                                acc.id,
                                                            )
                                                        }
                                                        aria-label={`Pilih akun ${acc.noAkun}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="px-4 font-mono font-medium text-foreground">
                                                    {acc.noAkun}
                                                </TableCell>
                                                <TableCell className="px-4 font-medium text-foreground">
                                                    {acc.clientNama}
                                                </TableCell>
                                                <TableCell className="px-4">
                                                    {acc.picName ? (
                                                        <Badge variant="secondary">
                                                            {acc.picName}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">
                                                            Belum ada PIC
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="px-4">
                                                    <Badge
                                                        variant={
                                                            acc.aktif
                                                                ? "outline"
                                                                : "destructive"
                                                        }
                                                    >
                                                        {acc.aktif
                                                            ? "Aktif"
                                                            : "Nonaktif"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="px-4 text-xs text-muted-foreground">
                                                    {acc.lastCheckedAt
                                                        ? new Date(
                                                              acc.lastCheckedAt,
                                                          ).toLocaleDateString(
                                                              "id-ID",
                                                              {
                                                                  day: "numeric",
                                                                  month: "short",
                                                                  year: "numeric",
                                                              },
                                                          )
                                                        : "Belum dicek"}
                                                </TableCell>
                                                <TableCell className="px-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger
                                                            render={
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    aria-label={`Aksi untuk ${acc.noAkun}`}
                                                                />
                                                            }
                                                        >
                                                            <MoreHorizontalIcon />
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align="end"
                                                            className="w-44"
                                                        >
                                                            <DropdownMenuGroup>
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        setModalSetPic(
                                                                            acc,
                                                                        );
                                                                        setSinglePicId(
                                                                            acc.picId ||
                                                                                "none",
                                                                        );
                                                                    }}
                                                                >
                                                                    <UserCheckIcon />
                                                                    <span>
                                                                        Atur PIC
                                                                    </span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        setModalMoveAccount(
                                                                            acc,
                                                                        );
                                                                        setMoveTargetClientId(
                                                                            acc.clientId,
                                                                        );
                                                                    }}
                                                                >
                                                                    <ArrowRightLeftIcon />
                                                                    <span>
                                                                        Pindah
                                                                        Client
                                                                    </span>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuGroup>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuGroup>
                                                                <DropdownMenuItem
                                                                    variant={
                                                                        acc.aktif
                                                                            ? "destructive"
                                                                            : "default"
                                                                    }
                                                                    onClick={() =>
                                                                        setConfirmToggleAccount(
                                                                            acc,
                                                                        )
                                                                    }
                                                                >
                                                                    <PowerIcon />
                                                                    <span>
                                                                        {acc.aktif
                                                                            ? "Nonaktifkan"
                                                                            : "Aktifkan"}
                                                                    </span>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuGroup>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>

                        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
                            <div>
                                Menampilkan{" "}
                                <span className="font-medium text-foreground">
                                    {accountsData.total > 0
                                        ? (accountsData.page - 1) *
                                              accountsData.pageSize +
                                          1
                                        : 0}
                                </span>{" "}
                                –{" "}
                                <span className="font-medium text-foreground">
                                    {Math.min(
                                        accountsData.page *
                                            accountsData.pageSize,
                                        accountsData.total,
                                    )}
                                </span>{" "}
                                dari{" "}
                                <span className="font-medium text-foreground">
                                    {accountsData.total}
                                </span>{" "}
                                akun
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    onClick={() =>
                                        updateQueryParams({
                                            page: String(accountsData.page - 1),
                                        })
                                    }
                                    disabled={
                                        accountsData.page <= 1 || isNavigating
                                    }
                                    aria-label="Halaman sebelumnya"
                                >
                                    <ChevronLeftIcon />
                                </Button>
                                <span className="text-xs font-medium text-foreground">
                                    Halaman {accountsData.page} dari{" "}
                                    {Math.max(1, accountsData.totalPages)}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    onClick={() =>
                                        updateQueryParams({
                                            page: String(accountsData.page + 1),
                                        })
                                    }
                                    disabled={
                                        accountsData.page >=
                                            accountsData.totalPages ||
                                        isNavigating
                                    }
                                    aria-label="Halaman berikutnya"
                                >
                                    <ChevronRightIcon />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* Tab 2: Client Content */}
                <TabsContent
                    value="client"
                    className="mt-4 flex flex-col gap-4"
                >
                    <Card className="p-4">
                        <form onSubmit={handleSearchSubmit} className="max-w-md">
                            <InputGroup>
                                <InputGroupAddon align="inline-start">
                                    <SearchIcon />
                                </InputGroupAddon>
                                <InputGroupInput
                                    type="text"
                                    value={clientSearch}
                                    onChange={(e) =>
                                        setClientSearch(e.target.value)
                                    }
                                    placeholder="Cari nama client / PT…"
                                />
                            </InputGroup>
                        </form>
                    </Card>

                    <Card className="overflow-hidden p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableHead className="px-4">
                                        Nama Client
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Nama Normal
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Kontak Email
                                    </TableHead>
                                    <TableHead className="px-4">
                                        Kontak WhatsApp
                                    </TableHead>
                                    <TableHead className="px-4 text-center">
                                        Jml Akun
                                    </TableHead>
                                    <TableHead className="px-4 text-right">
                                        Aksi
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isNavigating ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="px-4">
                                                <Skeleton className="h-4 w-44" />
                                            </TableCell>
                                            <TableCell className="px-4">
                                                <Skeleton className="h-4 w-32" />
                                            </TableCell>
                                            <TableCell className="px-4">
                                                <Skeleton className="h-4 w-36" />
                                            </TableCell>
                                            <TableCell className="px-4">
                                                <Skeleton className="h-4 w-28" />
                                            </TableCell>
                                            <TableCell className="px-4 text-center">
                                                <Skeleton className="mx-auto h-5 w-10 rounded-full" />
                                            </TableCell>
                                            <TableCell className="px-4 text-right">
                                                <Skeleton className="ml-auto size-7 rounded-md" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : clientsData.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="p-0">
                                            <Empty className="py-12">
                                                <EmptyHeader>
                                                    <EmptyMedia variant="icon">
                                                        <Building2Icon />
                                                    </EmptyMedia>
                                                    <EmptyTitle>
                                                        Tidak ada client
                                                        ditemukan
                                                    </EmptyTitle>
                                                    <EmptyDescription>
                                                        Coba ubah kata kunci
                                                        pencarian atau tambahkan
                                                        client baru.
                                                    </EmptyDescription>
                                                </EmptyHeader>
                                            </Empty>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    clientsData.data.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell className="px-4 font-medium text-foreground">
                                                {c.nama}
                                            </TableCell>
                                            <TableCell className="px-4 font-mono text-xs text-muted-foreground">
                                                {c.namaNormal}
                                            </TableCell>
                                            <TableCell className="px-4 text-xs text-muted-foreground">
                                                {c.kontakEmail || "—"}
                                            </TableCell>
                                            <TableCell className="px-4 text-xs text-muted-foreground">
                                                {c.kontakWhatsapp || "—"}
                                            </TableCell>
                                            <TableCell className="px-4 text-center">
                                                <Badge variant="secondary">
                                                    {c.accountCount}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        render={
                                                            <Button
                                                                variant="ghost"
                                                                size="icon-sm"
                                                                aria-label={`Aksi untuk ${c.nama}`}
                                                            />
                                                        }
                                                    >
                                                        <MoreHorizontalIcon />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        align="end"
                                                        className="w-40"
                                                    >
                                                        <DropdownMenuGroup>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setModalEditClient(
                                                                        c,
                                                                    );
                                                                    setEditClientNama(
                                                                        c.nama,
                                                                    );
                                                                    setEditClientEmail(
                                                                        c.kontakEmail ||
                                                                            "",
                                                                    );
                                                                    setEditClientWhatsapp(
                                                                        c.kontakWhatsapp ||
                                                                            "",
                                                                    );
                                                                }}
                                                            >
                                                                <PencilIcon />
                                                                <span>
                                                                    Ubah
                                                                </span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setModalMergeClient(
                                                                        c,
                                                                    );
                                                                    const firstOther =
                                                                        allClients.find(
                                                                            (
                                                                                item,
                                                                            ) =>
                                                                                item.id !==
                                                                                c.id,
                                                                        );
                                                                    setMergeTargetClientId(
                                                                        firstOther?.id ||
                                                                            "",
                                                                    );
                                                                }}
                                                            >
                                                                <ArrowRightLeftIcon />
                                                                <span>
                                                                    Gabung
                                                                </span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuGroup>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
                            <div>
                                Menampilkan{" "}
                                <span className="font-medium text-foreground">
                                    {clientsData.total > 0
                                        ? (clientsData.page - 1) *
                                              clientsData.pageSize +
                                          1
                                        : 0}
                                </span>{" "}
                                –{" "}
                                <span className="font-medium text-foreground">
                                    {Math.min(
                                        clientsData.page * clientsData.pageSize,
                                        clientsData.total,
                                    )}
                                </span>{" "}
                                dari{" "}
                                <span className="font-medium text-foreground">
                                    {clientsData.total}
                                </span>{" "}
                                client
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    onClick={() =>
                                        updateQueryParams({
                                            cpage: String(clientsData.page - 1),
                                        })
                                    }
                                    disabled={
                                        clientsData.page <= 1 || isNavigating
                                    }
                                    aria-label="Halaman sebelumnya"
                                >
                                    <ChevronLeftIcon />
                                </Button>
                                <span className="text-xs font-medium text-foreground">
                                    Halaman {clientsData.page} dari{" "}
                                    {Math.max(1, clientsData.totalPages)}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    onClick={() =>
                                        updateQueryParams({
                                            cpage: String(clientsData.page + 1),
                                        })
                                    }
                                    disabled={
                                        clientsData.page >=
                                            clientsData.totalPages ||
                                        isNavigating
                                    }
                                    aria-label="Halaman berikutnya"
                                >
                                    <ChevronRightIcon />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Dialog Tambah Akun */}
            <Dialog open={modalAddAccount} onOpenChange={setModalAddAccount}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tambah Akun Baru</DialogTitle>
                        <DialogDescription>
                            Daftarkan No. Akun portal ke client dan PIC.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateAccount}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="add-no-akun">
                                    No. Akun (Portal)
                                </FieldLabel>
                                <Input
                                    id="add-no-akun"
                                    type="text"
                                    required
                                    value={newNoAkun}
                                    onChange={(e) =>
                                        setNewNoAkun(e.target.value)
                                    }
                                    placeholder="Contoh: 00102938"
                                    className="font-mono"
                                />
                                <FieldDescription>
                                    Angka nol di depan akan selalu
                                    dipertahankan.
                                </FieldDescription>
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="add-account-client">
                                    Pilih Client
                                </FieldLabel>
                                <Select
                                    value={newAccountClientId}
                                    onValueChange={(val) =>
                                        setNewAccountClientId(val || "")
                                    }
                                >
                                    <SelectTrigger
                                        id="add-account-client"
                                        className="w-full"
                                    >
                                        <SelectValue>
                                            {getClientLabel(newAccountClientId)}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {allClients.map((c) => (
                                                <SelectItem
                                                    key={c.id}
                                                    value={c.id}
                                                >
                                                    {c.nama}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="add-account-pic">
                                    Penanggung Jawab (PIC) — Opsional
                                </FieldLabel>
                                <Select
                                    value={newAccountPicId}
                                    onValueChange={(val) =>
                                        setNewAccountPicId(val || "none")
                                    }
                                >
                                    <SelectTrigger
                                        id="add-account-pic"
                                        className="w-full"
                                    >
                                        <SelectValue>
                                            {getPicLabel(newAccountPicId)}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="none">
                                                (Belum Ada PIC)
                                            </SelectItem>
                                            {picUsers.map((u) => (
                                                <SelectItem
                                                    key={u.id}
                                                    value={u.id}
                                                >
                                                    {u.name || u.email}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setModalAddAccount(false)}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending && (
                                        <Spinner data-icon="inline-start" />
                                    )}
                                    {isPending ? "Menyimpan…" : "Simpan Akun"}
                                </Button>
                            </DialogFooter>
                        </FieldGroup>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Tambah Client */}
            <Dialog open={modalAddClient} onOpenChange={setModalAddClient}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tambah Client Baru</DialogTitle>
                        <DialogDescription>
                            Tambahkan perusahaan atau entitas pelanggan baru.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateClient}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="add-client-nama">
                                    Nama Perusahaan / PT
                                </FieldLabel>
                                <Input
                                    id="add-client-nama"
                                    type="text"
                                    required
                                    value={newClientNama}
                                    onChange={(e) =>
                                        setNewClientNama(e.target.value)
                                    }
                                    placeholder="Contoh: PT. Sumber Makmur Abadi"
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="add-client-email">
                                    Kontak Email (Opsional)
                                </FieldLabel>
                                <Input
                                    id="add-client-email"
                                    type="email"
                                    value={newClientEmail}
                                    onChange={(e) =>
                                        setNewClientEmail(e.target.value)
                                    }
                                    placeholder="finance@sumbermakmur.com"
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="add-client-wa">
                                    Kontak WhatsApp (Opsional)
                                </FieldLabel>
                                <Input
                                    id="add-client-wa"
                                    type="text"
                                    value={newClientWhatsapp}
                                    onChange={(e) =>
                                        setNewClientWhatsapp(e.target.value)
                                    }
                                    placeholder="Format 62812… tanpa +"
                                />
                            </Field>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setModalAddClient(false)}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending && (
                                        <Spinner data-icon="inline-start" />
                                    )}
                                    {isPending ? "Menyimpan…" : "Simpan Client"}
                                </Button>
                            </DialogFooter>
                        </FieldGroup>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Ubah Client */}
            <Dialog
                open={Boolean(modalEditClient)}
                onOpenChange={(open) => {
                    if (!open) setModalEditClient(null);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ubah Data Client</DialogTitle>
                        <DialogDescription>
                            Perbarui nama atau informasi kontak client.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdateClient}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="edit-client-nama">
                                    Nama Perusahaan / PT
                                </FieldLabel>
                                <Input
                                    id="edit-client-nama"
                                    type="text"
                                    required
                                    value={editClientNama}
                                    onChange={(e) =>
                                        setEditClientNama(e.target.value)
                                    }
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="edit-client-email">
                                    Kontak Email
                                </FieldLabel>
                                <Input
                                    id="edit-client-email"
                                    type="email"
                                    value={editClientEmail}
                                    onChange={(e) =>
                                        setEditClientEmail(e.target.value)
                                    }
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="edit-client-wa">
                                    Kontak WhatsApp
                                </FieldLabel>
                                <Input
                                    id="edit-client-wa"
                                    type="text"
                                    value={editClientWhatsapp}
                                    onChange={(e) =>
                                        setEditClientWhatsapp(e.target.value)
                                    }
                                    placeholder="62812… tanpa +"
                                />
                            </Field>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setModalEditClient(null)}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending && (
                                        <Spinner data-icon="inline-start" />
                                    )}
                                    {isPending
                                        ? "Menyimpan…"
                                        : "Perbarui Client"}
                                </Button>
                            </DialogFooter>
                        </FieldGroup>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog Gabung Client (Merge) */}
            <Dialog
                open={Boolean(modalMergeClient)}
                onOpenChange={(open) => {
                    if (!open) setModalMergeClient(null);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRightLeftIcon />
                            Gabungkan Client (Merge)
                        </DialogTitle>
                        <DialogDescription>
                            Pindahkan seluruh akun dari client sumber ke client
                            tujuan.
                        </DialogDescription>
                    </DialogHeader>

                    {modalMergeClient && (
                        <>
                            <Alert variant="destructive">
                                <AlertCircleIcon />
                                <AlertTitle>Perhatian</AlertTitle>
                                <AlertDescription>
                                    Seluruh{" "}
                                    <strong>
                                        {modalMergeClient.accountCount} akun
                                    </strong>{" "}
                                    milik{" "}
                                    <strong>{modalMergeClient.nama}</strong>{" "}
                                    akan dipindahkan ke client tujuan. Client
                                    sumber akan dihapus permanen.
                                </AlertDescription>
                            </Alert>

                            <form onSubmit={handleRequestMergeClient}>
                                <FieldGroup>
                                    <Field>
                                        <FieldLabel htmlFor="merge-target-client">
                                            Pilih Client Tujuan
                                        </FieldLabel>
                                        <Select
                                            value={mergeTargetClientId}
                                            onValueChange={(val) =>
                                                setMergeTargetClientId(
                                                    val || "",
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="merge-target-client"
                                                className="w-full"
                                            >
                                                <SelectValue>
                                                    {getClientLabel(
                                                        mergeTargetClientId,
                                                    )}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    {allClients
                                                        .filter(
                                                            (c) =>
                                                                c.id !==
                                                                modalMergeClient.id,
                                                        )
                                                        .map((c) => (
                                                            <SelectItem
                                                                key={c.id}
                                                                value={c.id}
                                                            >
                                                                {c.nama}
                                                            </SelectItem>
                                                        ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setModalMergeClient(null)
                                            }
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            disabled={
                                                isPending ||
                                                !mergeTargetClientId
                                            }
                                        >
                                            {isPending && (
                                                <Spinner data-icon="inline-start" />
                                            )}
                                            Gabungkan Client
                                        </Button>
                                    </DialogFooter>
                                </FieldGroup>
                            </form>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog Set PIC Single */}
            <Dialog
                open={Boolean(modalSetPic)}
                onOpenChange={(open) => {
                    if (!open) setModalSetPic(null);
                }}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCheckIcon />
                            Atur PIC Akun
                        </DialogTitle>
                        <DialogDescription>
                            Tetapkan penanggung jawab untuk akun terpilih.
                        </DialogDescription>
                    </DialogHeader>

                    {modalSetPic && (
                        <>
                            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                                <p className="text-xs text-muted-foreground">
                                    No. Akun
                                </p>
                                <p className="font-mono font-semibold text-foreground">
                                    {modalSetPic.noAkun}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Client: {modalSetPic.clientNama}
                                </p>
                            </div>

                            <form onSubmit={handleSingleSetPic}>
                                <FieldGroup>
                                    <Field>
                                        <FieldLabel htmlFor="single-pic-select">
                                            Pilih PIC Baru
                                        </FieldLabel>
                                        <Select
                                            value={singlePicId}
                                            onValueChange={(val) =>
                                                setSinglePicId(val || "none")
                                            }
                                        >
                                            <SelectTrigger
                                                id="single-pic-select"
                                                className="w-full"
                                            >
                                                <SelectValue>
                                                    {getPicLabel(singlePicId)}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="none">
                                                        (Kosongkan / Tanpa PIC)
                                                    </SelectItem>
                                                    {picUsers.map((u) => (
                                                        <SelectItem
                                                            key={u.id}
                                                            value={u.id}
                                                        >
                                                            {u.name || u.email}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setModalSetPic(null)}
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isPending}
                                        >
                                            {isPending && (
                                                <Spinner data-icon="inline-start" />
                                            )}
                                            {isPending
                                                ? "Menyimpan…"
                                                : "Simpan PIC"}
                                        </Button>
                                    </DialogFooter>
                                </FieldGroup>
                            </form>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dialog Move Account */}
            <Dialog
                open={Boolean(modalMoveAccount)}
                onOpenChange={(open) => {
                    if (!open) setModalMoveAccount(null);
                }}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRightLeftIcon />
                            Pindahkan Akun ke Client Lain
                        </DialogTitle>
                        <DialogDescription>
                            Pilih client tujuan untuk akun ini.
                        </DialogDescription>
                    </DialogHeader>

                    {modalMoveAccount && (
                        <>
                            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                                <p className="text-xs text-muted-foreground">
                                    No. Akun
                                </p>
                                <p className="font-mono font-semibold text-foreground">
                                    {modalMoveAccount.noAkun}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Client Saat Ini:{" "}
                                    {modalMoveAccount.clientNama}
                                </p>
                            </div>

                            <form onSubmit={handleMoveAccount}>
                                <FieldGroup>
                                    <Field>
                                        <FieldLabel htmlFor="move-target-client">
                                            Pilih Client Tujuan
                                        </FieldLabel>
                                        <Select
                                            value={moveTargetClientId}
                                            onValueChange={(val) =>
                                                setMoveTargetClientId(val || "")
                                            }
                                        >
                                            <SelectTrigger
                                                id="move-target-client"
                                                className="w-full"
                                            >
                                                <SelectValue>
                                                    {getClientLabel(
                                                        moveTargetClientId,
                                                    )}
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    {allClients.map((c) => (
                                                        <SelectItem
                                                            key={c.id}
                                                            value={c.id}
                                                        >
                                                            {c.nama}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </Field>

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setModalMoveAccount(null)
                                            }
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isPending}
                                        >
                                            {isPending && (
                                                <Spinner data-icon="inline-start" />
                                            )}
                                            {isPending
                                                ? "Memindahkan…"
                                                : "Pindahkan"}
                                        </Button>
                                    </DialogFooter>
                                </FieldGroup>
                            </form>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* AlertDialog Konfirmasi Status Akun */}
            <AlertDialog
                open={Boolean(confirmToggleAccount)}
                onOpenChange={(open) => {
                    if (!open) setConfirmToggleAccount(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmToggleAccount?.aktif
                                ? "Nonaktifkan Akun?"
                                : "Aktifkan Akun?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmToggleAccount?.aktif
                                ? `Nonaktifkan akun ${confirmToggleAccount.noAkun}? Akun tidak akan muncul di antrean cek PIC.`
                                : `Aktifkan kembali akun ${confirmToggleAccount?.noAkun}?`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            variant={
                                confirmToggleAccount?.aktif
                                    ? "destructive"
                                    : "default"
                            }
                            onClick={handleConfirmToggleAccountAktif}
                        >
                            {confirmToggleAccount?.aktif
                                ? "Nonaktifkan"
                                : "Aktifkan"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* AlertDialog Konfirmasi Gabung Client */}
            <AlertDialog
                open={confirmMergeOpen}
                onOpenChange={setConfirmMergeOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Konfirmasi Gabung Client
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {modalMergeClient && (
                                <>
                                    Anda yakin ingin menggabungkan{" "}
                                    <strong>{modalMergeClient.nama}</strong> ke{" "}
                                    <strong>
                                        {getClientLabel(mergeTargetClientId)}
                                    </strong>
                                    ? Tindakan ini tidak dapat dibatalkan.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleConfirmMergeClient}
                        >
                            Ya, Gabungkan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
