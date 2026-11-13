import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { env } from "@/env"
import { authRelations } from "./schema/auth"
import { domainRelations } from "./schema/domain"

const pool = new Pool({
    connectionString: env.DATABASE_URL
})

export const db = drizzle({
    client: pool,
    relations: { ...authRelations, ...domainRelations },
})
