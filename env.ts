import "dotenv/config"
import { z } from "zod"

const schema = z.object({
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET minimal 32 karakter"),
    BETTER_AUTH_URL: z.url(),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_USER: z.string().default(""),
    SMTP_PASS: z.string().default(""),
    SMTP_FROM: z.string().min(1),
    APP_TIMEZONE: z.string().default("Asia/Jakarta"),
    ADMIN_EMAIL: z.email().optional(),
    ADMIN_PASSWORD: z.string().min(1).optional()
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
    const issues = parsed.error.issues
        .map(i => `\t- ${i.path.join(".")}: ${i.message}`)
        .join('\n')

    console.error(`Konfigurasi environment tidak valid:\n${issues}`)

    throw new Error("Environment tidak valid. Periksa file .env.")
}

export const env = parsed.data