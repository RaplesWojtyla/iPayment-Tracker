import { Suspense } from "react";
import { requireAdmin } from "@/server/auth/session";
import { listAccountsMaster } from "@/server/data/accounts";
import { listClients, listAllClientsForDropdown } from "@/server/data/clients";
import { listPicUsers } from "@/server/data/users";
import { AkunMasterClient } from "./akun-master-client";
import { AkunMasterSkeleton } from "./akun-master-skeleton";
import { connection } from "next/server";

interface PageProps {
    searchParams: Promise<{
        tab?: string;
        page?: string;
        pageSize?: string;
        search?: string;
        pic?: string;
        client?: string;
        aktif?: string;
        cpage?: string;
        csearch?: string;
    }>;
}

export default async function AkunMasterPage({ searchParams }: PageProps) {
    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <Suspense fallback={<AkunMasterSkeleton />}>
                <AkunMasterContent searchParams={searchParams} />
            </Suspense>
        </main>
    );
}

async function AkunMasterContent({ searchParams }: PageProps) {
    await connection()
    const actor = await requireAdmin();
    const params = await searchParams;

    const page = params.page ? parseInt(params.page, 10) : 1;
    const cpage = params.cpage ? parseInt(params.cpage, 10) : 1;

    let aktifFilter: boolean | undefined = undefined;
    if (params.aktif === "true") aktifFilter = true;
    if (params.aktif === "false") aktifFilter = false;

    const [accountsData, clientsData, picUsers, allClients] = await Promise.all([
        listAccountsMaster(actor, {
            search: params.search,
            picId: params.pic,
            clientId: params.client,
            aktif: aktifFilter,
            page,
            pageSize: 15,
        }),
        listClients(actor, {
            search: params.csearch,
            page: cpage,
            pageSize: 15,
        }),
        listPicUsers(actor, { onlyActive: true }),
        listAllClientsForDropdown(actor),
    ]);

    return (
        <AkunMasterClient
            tab={params.tab === "client" ? "client" : "akun"}
            accountsData={accountsData}
            clientsData={clientsData}
            picUsers={picUsers}
            allClients={allClients}
        />
    );
}
