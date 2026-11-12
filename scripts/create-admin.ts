import { env } from "@/env"
import { auth } from "@/server/auth"
import "dotenv/config"

async function main() {
    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
        console.error("ADMIN_EMAIL dan ADMIN_PASSWORD harus diisi di .env")
        process.exit(1)
    }

    const created = await auth.api.createUser({
        body: {
            email: env.ADMIN_EMAIL,
            password: env.ADMIN_PASSWORD,
            name: "Admin",
            role: "admin",
            data: { active: true }
        }
    })

    console.log(`Admin dibuat: ${created.user.email}`)
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(`Gagal membuat admin: ${e}`)
        process.exit(1)
    })
