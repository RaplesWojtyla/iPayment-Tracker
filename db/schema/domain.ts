import { defineRelationsPart, sql } from "drizzle-orm";
import {
    pgTable,
    uuid,
    text,
    timestamp,
    date,
    time,
    bigint,
    boolean,
    jsonb,
    index,
    unique,
    check,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const clients = pgTable(
    "clients",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        nama: text("nama").notNull(),
        namaNormal: text("nama_normal").notNull(),
        kontakEmail: text("kontak_email"),
        kontakWhatsapp: text("kontak_whatsapp"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => [index("clients_nama_normal_idx").on(table.namaNormal)],
);

export const accounts = pgTable(
    "accounts",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        noAkun: text("no_akun").notNull().unique(),
        clientId: uuid("client_id")
            .notNull()
            .references(() => clients.id, { onDelete: "restrict" }),
        picId: text("pic_id").references(() => user.id, {
            onDelete: "set null",
        }),
        aktif: boolean("aktif").default(true).notNull(),
        lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("accounts_pic_id_idx").on(table.picId),
        index("accounts_client_id_idx").on(table.clientId),
        index("accounts_last_checked_at_idx").on(table.lastCheckedAt),
    ],
);

export const invoices = pgTable(
    "invoices",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        accountId: uuid("account_id")
            .notNull()
            .references(() => accounts.id, { onDelete: "restrict" }),
        periode: date("periode", { mode: "string" }).notNull(),
        mataUang: text("mata_uang").default("IDR").notNull(),
        jumlahTagihan: bigint("jumlah_tagihan", { mode: "number" }).notNull(),
        belumBayar: bigint("belum_bayar", { mode: "number" }).notNull(),
        lokasiBayar: text("lokasi_bayar"),
        cicilan: boolean("cicilan").default(false).notNull(),
        tanggalBayar: date("tanggal_bayar", { mode: "string" }),
        jamBayar: time("jam_bayar"),
        updatedBy: text("updated_by").references(() => user.id, {
            onDelete: "set null",
        }),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        unique("invoices_account_id_periode_unique").on(
            table.accountId,
            table.periode,
        ),
        check(
            "invoices_periode_day_one_chk",
            sql`extract(day from ${table.periode}) = 1`,
        ),
        check(
            "invoices_belum_bayar_range_chk",
            sql`abs(${table.belumBayar}) <= abs(${table.jumlahTagihan})`,
        ),
        index("invoices_belum_bayar_arrears_idx")
            .on(table.belumBayar)
            .where(sql`abs(${table.belumBayar}) > 0`),
    ],
);

export const accountChecks = pgTable(
    "account_checks",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        accountId: uuid("account_id")
            .notNull()
            .references(() => accounts.id, { onDelete: "restrict" }),
        checkedBy: text("checked_by").references(() => user.id, {
            onDelete: "set null",
        }),
        checkedAt: timestamp("checked_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        catatan: text("catatan"),
    },
    (table) => [index("account_checks_account_id_idx").on(table.accountId)],
);

export const snoozes = pgTable(
    "snoozes",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        accountId: uuid("account_id")
            .notNull()
            .references(() => accounts.id, { onDelete: "restrict" }),
        createdBy: text("created_by").references(() => user.id, {
            onDelete: "set null",
        }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
        alasan: text("alasan").notNull(),
        coveredThroughPeriode: date("covered_through_periode", {
            mode: "string",
        }).notNull(),
        cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    },
    (table) => [index("snoozes_account_id_idx").on(table.accountId)],
);

export const notifications = pgTable(
    "notifications",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        tipe: text("tipe").notNull(),
        judul: text("judul").notNull(),
        isi: text("isi").notNull(),
        payload: jsonb("payload").notNull(),
        dedupeKey: text("dedupe_key").notNull().unique(),
        emailStatus: text("email_status").notNull(), // 'pending' | 'sent' | 'failed' | 'skipped'
        emailError: text("email_error"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        readAt: timestamp("read_at", { withTimezone: true }),
    },
    (table) => [
        index("notifications_user_id_read_at_idx").on(
            table.userId,
            table.readAt,
        ),
    ],
);

export const clientReminderLogs = pgTable("client_reminder_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
        .notNull()
        .references(() => clients.id, { onDelete: "restrict" }),
    picId: text("pic_id")
        .notNull()
        .references(() => user.id, { onDelete: "restrict" }),
    channel: text("channel").notNull(), // 'whatsapp' | 'email'
    accountIds: jsonb("account_ids").$type<string[]>().notNull(),
    pesan: text("pesan").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export const auditLogs = pgTable(
    "audit_logs",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: text("user_id").references(() => user.id, {
            onDelete: "set null",
        }),
        aksi: text("aksi").notNull(),
        entitas: text("entitas").notNull(),
        entitasId: text("entitas_id").notNull(),
        sebelum: jsonb("sebelum"),
        sesudah: jsonb("sesudah"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => [index("audit_logs_created_at_idx").on(table.createdAt)],
);

export const appSettings = pgTable("app_settings", {
    kunci: text("kunci").primaryKey(),
    nilai: text("nilai").notNull(),
    updatedBy: text("updated_by").references(() => user.id, {
        onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
});

export const domainRelations = defineRelationsPart(
    {
        user,
        clients,
        accounts,
        invoices,
        accountChecks,
        snoozes,
        notifications,
        clientReminderLogs,
        auditLogs,
        appSettings,
    },
    (r) => ({
        clients: {
            accounts: r.many.accounts({
                from: r.clients.id,
                to: r.accounts.clientId,
            }),
            reminderLogs: r.many.clientReminderLogs({
                from: r.clients.id,
                to: r.clientReminderLogs.clientId,
            }),
        },
        accounts: {
            client: r.one.clients({
                from: r.accounts.clientId,
                to: r.clients.id,
            }),
            pic: r.one.user({
                from: r.accounts.picId,
                to: r.user.id,
            }),
            invoices: r.many.invoices({
                from: r.accounts.id,
                to: r.invoices.accountId,
            }),
            checks: r.many.accountChecks({
                from: r.accounts.id,
                to: r.accountChecks.accountId,
            }),
            snoozes: r.many.snoozes({
                from: r.accounts.id,
                to: r.snoozes.accountId,
            }),
        },
        invoices: {
            account: r.one.accounts({
                from: r.invoices.accountId,
                to: r.accounts.id,
            }),
            updater: r.one.user({
                from: r.invoices.updatedBy,
                to: r.user.id,
            }),
        },
        accountChecks: {
            account: r.one.accounts({
                from: r.accountChecks.accountId,
                to: r.accounts.id,
            }),
            checker: r.one.user({
                from: r.accountChecks.checkedBy,
                to: r.user.id,
            }),
        },
        snoozes: {
            account: r.one.accounts({
                from: r.snoozes.accountId,
                to: r.accounts.id,
            }),
            creator: r.one.user({
                from: r.snoozes.createdBy,
                to: r.user.id,
            }),
        },
        notifications: {
            user: r.one.user({
                from: r.notifications.userId,
                to: r.user.id,
            }),
        },
        clientReminderLogs: {
            client: r.one.clients({
                from: r.clientReminderLogs.clientId,
                to: r.clients.id,
            }),
            pic: r.one.user({
                from: r.clientReminderLogs.picId,
                to: r.user.id,
            }),
        },
        auditLogs: {
            user: r.one.user({
                from: r.auditLogs.userId,
                to: r.user.id,
            }),
        },
        appSettings: {
            updater: r.one.user({
                from: r.appSettings.updatedBy,
                to: r.user.id,
            }),
        },
    }),
);
