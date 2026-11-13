"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    ChevronDownIcon,
    LogOutIcon,
    MenuIcon,
    ShieldCheckIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "cn";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

interface AppNavClientProps {
    user: {
        id: string;
        name: string;
        email: string;
        role: "admin" | "pic";
    };
}

const mainNav = [
    { label: "Dashboard", href: "/" },
    { label: "Input Cepat", href: "/input" },
    { label: "Antrean Cek", href: "/antrean-cek" },
    { label: "Akun", href: "/akun" },
    { label: "Client", href: "/client" },
    { label: "Export", href: "/export" },
];

const adminNav = [
    { label: "Akun Master", href: "/admin/akun-master" },
    { label: "Impor Excel", href: "/admin/impor" },
    { label: "Pengguna", href: "/admin/pengguna" },
];

function getInitials(name: string, email: string) {
    const source = name?.trim() || email;
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
}

export function AppNavClient({ user }: AppNavClientProps) {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await authClient.signOut();
            window.location.replace("/login");
        } catch {
            setLoggingOut(false);
        }
    };

    const displayName = user.name || user.email.split("@")[0];
    const initials = getInitials(user.name, user.email);
    const isAdminRoute = pathname.startsWith("/admin");

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xs">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-6">
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 text-base font-semibold tracking-tight text-foreground"
                    >
                        <span>iPayment</span>
                        <span className="font-normal text-muted-foreground">
                            Track
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-1 md:flex">
                        {mainNav.map((item) => {
                            const isActive =
                                item.href === "/"
                                    ? pathname === "/"
                                    : pathname.startsWith(item.href);
                            return (
                                <Button
                                    key={item.href}
                                    variant={isActive ? "secondary" : "ghost"}
                                    size="sm"
                                    nativeButton={false}
                                    render={<Link href={item.href} />}
                                    className={cn(
                                        !isActive && "text-muted-foreground",
                                    )}
                                >
                                    {item.label}
                                </Button>
                            );
                        })}

                        {user.role === "admin" && (
                            <>
                                <Separator
                                    orientation="vertical"
                                    className="mx-1 h-4"
                                />
                                <DropdownMenu>
                                    <DropdownMenuTrigger
                                        render={
                                            <Button
                                                variant={
                                                    isAdminRoute
                                                        ? "secondary"
                                                        : "ghost"
                                                }
                                                size="sm"
                                                className={cn(
                                                    !isAdminRoute &&
                                                        "text-muted-foreground",
                                                )}
                                            />
                                        }
                                    >
                                        <ShieldCheckIcon data-icon="inline-start" />
                                        Admin
                                        <ChevronDownIcon data-icon="inline-end" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="start"
                                        className="w-44"
                                    >
                                        <DropdownMenuGroup>
                                            <DropdownMenuLabel>
                                                Administrasi
                                            </DropdownMenuLabel>
                                            {adminNav.map((item) => {
                                                const isActive =
                                                    pathname.startsWith(
                                                        item.href,
                                                    );
                                                return (
                                                    <DropdownMenuItem
                                                        key={item.href}
                                                        render={
                                                            <Link
                                                                href={item.href}
                                                            />
                                                        }
                                                        className={cn(
                                                            isActive &&
                                                                "bg-accent font-medium text-accent-foreground",
                                                        )}
                                                    >
                                                        {item.label}
                                                    </DropdownMenuItem>
                                                );
                                            })}
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        )}
                    </nav>
                </div>

                {/* Desktop User Dropdown */}
                <div className="hidden items-center gap-2 md:flex">
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2 pl-1.5"
                                />
                            }
                        >
                            <Avatar size="sm">
                                <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <span className="max-w-32 truncate text-sm font-medium">
                                {displayName}
                            </span>
                            <ChevronDownIcon data-icon="inline-end" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                            <DropdownMenuGroup>
                                <DropdownMenuLabel className="flex flex-col gap-1 font-normal">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-medium text-foreground">
                                            {displayName}
                                        </span>
                                        <Badge
                                            variant={
                                                user.role === "admin"
                                                    ? "default"
                                                    : "secondary"
                                            }
                                            className="uppercase"
                                        >
                                            {user.role}
                                        </Badge>
                                    </div>
                                    <span className="truncate text-xs text-muted-foreground">
                                        {user.email}
                                    </span>
                                </DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem
                                    variant="destructive"
                                    disabled={loggingOut}
                                    onClick={handleLogout}
                                >
                                    {loggingOut ? (
                                        <Spinner />
                                    ) : (
                                        <LogOutIcon />
                                    )}
                                    <span>
                                        {loggingOut ? "Keluar…" : "Keluar"}
                                    </span>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Mobile Navigation Sheet */}
                <div className="flex items-center md:hidden">
                    <Sheet
                        open={mobileMenuOpen}
                        onOpenChange={setMobileMenuOpen}
                    >
                        <SheetTrigger
                            render={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Buka menu navigasi"
                                />
                            }
                        >
                            <MenuIcon />
                        </SheetTrigger>
                        <SheetContent side="right" className="w-72">
                            <SheetHeader className="border-b border-border pb-4">
                                <SheetTitle className="text-left">
                                    Menu Navigasi
                                </SheetTitle>
                                <div className="flex items-center gap-2.5 pt-2">
                                    <Avatar size="sm">
                                        <AvatarFallback>
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex min-w-0 flex-col">
                                        <div className="flex items-center gap-1.5">
                                            <span className="truncate text-sm font-medium text-foreground">
                                                {displayName}
                                            </span>
                                            <Badge
                                                variant={
                                                    user.role === "admin"
                                                        ? "default"
                                                        : "secondary"
                                                }
                                                className="uppercase"
                                            >
                                                {user.role}
                                            </Badge>
                                        </div>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {user.email}
                                        </span>
                                    </div>
                                </div>
                            </SheetHeader>

                            <nav className="flex flex-1 flex-col gap-1 px-4">
                                {mainNav.map((item) => {
                                    const isActive =
                                        item.href === "/"
                                            ? pathname === "/"
                                            : pathname.startsWith(item.href);
                                    return (
                                        <Button
                                            key={item.href}
                                            variant={
                                                isActive ? "secondary" : "ghost"
                                            }
                                            nativeButton={false}
                                            render={
                                                <Link
                                                    href={item.href}
                                                    onClick={() =>
                                                        setMobileMenuOpen(false)
                                                    }
                                                />
                                            }
                                            className="justify-start"
                                        >
                                            {item.label}
                                        </Button>
                                    );
                                })}

                                {user.role === "admin" && (
                                    <>
                                        <Separator className="my-2" />
                                        <span className="px-2.5 py-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                            Admin
                                        </span>
                                        {adminNav.map((item) => {
                                            const isActive =
                                                pathname.startsWith(item.href);
                                            return (
                                                <Button
                                                    key={item.href}
                                                    variant={
                                                        isActive
                                                            ? "secondary"
                                                            : "ghost"
                                                    }
                                                    nativeButton={false}
                                                    render={
                                                        <Link
                                                            href={item.href}
                                                            onClick={() =>
                                                                setMobileMenuOpen(
                                                                    false,
                                                                )
                                                            }
                                                        />
                                                    }
                                                    className="justify-start"
                                                >
                                                    {item.label}
                                                </Button>
                                            );
                                        })}
                                    </>
                                )}
                            </nav>

                            <div className="border-t border-border p-4">
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    disabled={loggingOut}
                                    onClick={handleLogout}
                                >
                                    {loggingOut ? (
                                        <Spinner data-icon="inline-start" />
                                    ) : (
                                        <LogOutIcon data-icon="inline-start" />
                                    )}
                                    {loggingOut ? "Keluar…" : "Keluar"}
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
