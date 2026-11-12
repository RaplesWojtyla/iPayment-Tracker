import { auth } from "@/server/auth"
import "dotenv/config"

async function main() {
    const [email, password] = process.argv.slice(2)
    if (!email || !password) {
        console.error("Run: tsx scripts/create-user.ts <email> <password> [role]")
        process.exit(1)
    }

    const created = await auth.api.createUser({
        body: {
            email,
            password,
            name: email.split("@")[0],
            data: { active: true }
        }
    })

    console.log(`User dibuat: ${created.user.email} [${created.user.role}]`)
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(`Gagal membuat user: ${e}`)
        process.exit(1)
    })
