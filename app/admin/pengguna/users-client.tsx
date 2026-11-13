"use client";

import { useState, useTransition } from "react";
import {
    AlertCircleIcon,
    CheckCircle2Icon,
    UserPlusIcon,
    UsersIcon,
} from "lucide-react";
import { createUserAction, toggleUserActiveAction } from "./actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface UserItem {
    id: string;
    name: string;
    email: string;
    role: string | null;
    active: boolean;
    createdAt: Date;
}

interface UsersClientProps {
    users: UserItem[];
    currentUserId: string;
}

const ROLE_LABELS: Record<"pic" | "admin", string> = {
    pic: "PIC (Penanggung Jawab Akun)",
    admin: "Admin",
};

export function UsersClient({ users, currentUserId }: UsersClientProps) {
    const [isPending, startTransition] = useTransition();
    const [showAddModal, setShowAddModal] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState<UserItem | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"pic" | "admin">("pic");

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        const formData = new FormData();
        formData.set("name", name);
        formData.set("email", email);
        formData.set("password", password);
        formData.set("role", role);

        startTransition(async () => {
            const res = await createUserAction(formData);
            if (res.error) {
                setErrorMsg(res.error);
            } else {
                setSuccessMsg(`Pengguna "${name}" berhasil dibuat.`);
                setShowAddModal(false);
                setName("");
                setEmail("");
                setPassword("");
                setRole("pic");
            }
        });
    };

    const handleRequestToggleActive = (user: UserItem) => {
        setErrorMsg(null);
        setSuccessMsg(null);

        if (user.id === currentUserId && user.active) {
            setErrorMsg("Tidak dapat menonaktifkan akun Anda sendiri.");
            return;
        }

        setConfirmTarget(user);
    };

    const handleConfirmToggleActive = () => {
        if (!confirmTarget) return;
        const target = confirmTarget;
        setConfirmTarget(null);

        startTransition(async () => {
            const res = await toggleUserActiveAction(target.id, !target.active);
            if (res.error) {
                setErrorMsg(res.error);
            } else {
                setSuccessMsg(
                    `Status pengguna "${target.name}" berhasil diubah menjadi ${
                        !target.active ? "Aktif" : "Nonaktif"
                    }.`,
                );
            }
        });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        Manajemen Pengguna
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Kelola akun Admin dan Penanggung Jawab Akun (PIC).
                    </p>
                </div>
                <Button onClick={() => setShowAddModal(true)}>
                    <UserPlusIcon data-icon="inline-start" />
                    Tambah Pengguna
                </Button>
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

            <Card className="overflow-hidden p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="px-4">Nama</TableHead>
                            <TableHead className="px-4">Email</TableHead>
                            <TableHead className="px-4">Peran</TableHead>
                            <TableHead className="px-4">Status</TableHead>
                            <TableHead className="px-4">Dibuat</TableHead>
                            <TableHead className="px-4 text-right">
                                Aksi
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="p-0">
                                    <Empty className="py-12">
                                        <EmptyHeader>
                                            <EmptyMedia variant="icon">
                                                <UsersIcon />
                                            </EmptyMedia>
                                            <EmptyTitle>
                                                Belum ada pengguna
                                            </EmptyTitle>
                                            <EmptyDescription>
                                                Tambahkan pengguna Admin atau
                                                PIC untuk mulai mengelola akses.
                                            </EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((u) => {
                                const isSelf = u.id === currentUserId;
                                const roleLabel = (u.role || "pic").toUpperCase();
                                return (
                                    <TableRow key={u.id}>
                                        <TableCell className="px-4 font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                <span>{u.name}</span>
                                                {isSelf && (
                                                    <Badge variant="outline">
                                                        Anda
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-4 text-muted-foreground">
                                            {u.email}
                                        </TableCell>
                                        <TableCell className="px-4">
                                            <Badge
                                                variant={
                                                    u.role === "admin"
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {roleLabel}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4">
                                            <Badge
                                                variant={
                                                    u.active
                                                        ? "outline"
                                                        : "destructive"
                                                }
                                            >
                                                {u.active
                                                    ? "Aktif"
                                                    : "Nonaktif"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 text-xs text-muted-foreground">
                                            {new Date(
                                                u.createdAt,
                                            ).toLocaleDateString("id-ID", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </TableCell>
                                        <TableCell className="px-4 text-right">
                                            <Button
                                                variant={
                                                    u.active
                                                        ? "destructive"
                                                        : "outline"
                                                }
                                                size="xs"
                                                onClick={() =>
                                                    handleRequestToggleActive(u)
                                                }
                                                disabled={isPending || isSelf}
                                            >
                                                {u.active
                                                    ? "Nonaktifkan"
                                                    : "Aktifkan"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Dialog Tambah Pengguna */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tambah Pengguna Baru</DialogTitle>
                        <DialogDescription>
                            Buat akun Admin atau PIC baru untuk mengakses
                            dashboard.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateUser}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="user-name">
                                    Nama Lengkap
                                </FieldLabel>
                                <Input
                                    id="user-name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Contoh: Budi Santoso"
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="user-email">
                                    Alamat Email
                                </FieldLabel>
                                <Input
                                    id="user-email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="user@perusahaan.com"
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="user-password">
                                    Password
                                </FieldLabel>
                                <Input
                                    id="user-password"
                                    type="password"
                                    required
                                    minLength={8}
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="Minimal 8 karakter"
                                />
                                <FieldDescription>
                                    Pengguna baru otomatis wajib 2FA OTP email
                                    pada login pertama.
                                </FieldDescription>
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="user-role">
                                    Peran (Role)
                                </FieldLabel>
                                <Select
                                    value={role}
                                    onValueChange={(val) => {
                                        if (val === "pic" || val === "admin") {
                                            setRole(val);
                                        }
                                    }}
                                >
                                    <SelectTrigger
                                        id="user-role"
                                        className="w-full"
                                    >
                                        <SelectValue>
                                            {ROLE_LABELS[role]}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="pic">
                                                {ROLE_LABELS.pic}
                                            </SelectItem>
                                            <SelectItem value="admin">
                                                {ROLE_LABELS.admin}
                                            </SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending && (
                                        <Spinner data-icon="inline-start" />
                                    )}
                                    {isPending
                                        ? "Menyimpan…"
                                        : "Simpan Pengguna"}
                                </Button>
                            </DialogFooter>
                        </FieldGroup>
                    </form>
                </DialogContent>
            </Dialog>

            {/* AlertDialog Konfirmasi Status Pengguna */}
            <AlertDialog
                open={Boolean(confirmTarget)}
                onOpenChange={(open) => {
                    if (!open) setConfirmTarget(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmTarget?.active
                                ? "Nonaktifkan Pengguna?"
                                : "Aktifkan Pengguna?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmTarget?.active
                                ? `Pengguna "${confirmTarget.name || confirmTarget.email}" akan dinonaktifkan dan sesi aktifnya langsung dicabut.`
                                : `Aktifkan kembali pengguna "${confirmTarget?.name || confirmTarget?.email}" agar dapat mengakses dashboard?`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            variant={
                                confirmTarget?.active
                                    ? "destructive"
                                    : "default"
                            }
                            onClick={handleConfirmToggleActive}
                        >
                            {confirmTarget?.active ? "Nonaktifkan" : "Aktifkan"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
