import { headers } from "next/headers"
import { auth } from "."


export async function getSession() {
    "use cache: private"
    return auth.api.getSession({
        headers: await headers()
    })
}