import { betterAuth } from "better-auth"
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2"
import { admin, twoFactor } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"
import { db } from "@/db"
import * as authSchema from "@/db/schema/auth"
import { env } from "@/env"
import { sendEmail } from "../email"
import { APIError, createAuthMiddleware } from "better-auth/api"

export const auth = betterAuth({
    appName: "iPayment-Track",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: authSchema
    }),
    emailAndPassword: {
        enabled: true,
        disableSignUp: true,
        minPasswordLength: 8,
        sendResetPassword: async ({ user, url }) => {
            await sendEmail({
                to: user.email,
                subject: "Reset Password",
                text: `Buka tautan ini untuk mengatur ulang password: ${url}`
            })
        }
    },
    user: {
        additionalFields: {
            active: {
                type: "boolean",
                required: true,
                defaultValue: true,
                input: false
            }
        }
    },
    session: {
        cookieCache: { enabled: false }
    },
    rateLimit: {
        enabled: true,
        window: 60,
        max: 30,
        customRules: {
            "/sign-in/email": { window: 60, max: 10 },
            "/two-factor/verify-otp": { window: 60, max: 5 },
        }
    },
    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
        defaultCookieAttributes: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production"
        }
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user) => ({
                    data: {
                        ...user,
                        twoFactorEnabled: true
                    }
                })
            }
        }
    },
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            if (ctx.path !== "/sign-in/email") return

            const email = await ctx.body?.email as string | undefined
            if (!email) return

            const user = await ctx.context.adapter.findOne<{ active?: boolean }>({
                model: "user",
                where: [{
                    field: "email",
                    value: email.toLocaleLowerCase()
                }]
            })
            if (user && user.active === false) {
                throw new APIError("FORBIDDEN", {
                    message: "Akun tidak aktif."
                })
            }
        })
    },
    plugins: [
        twoFactor({
            issuer: "iPayment-Track",
            otpOptions: {
                sendOTP: async ({ user, otp }) => {
                    await sendEmail({
                        to: user.email,
                        subject: "Kode Verifikasi Login",
                        text: `Kode OTP Anda: ${otp}`
                    })
                },
                period: 5, // menit bukan detik
                digits: 6,
                allowedAttempts: 5,
                storeOTP: "encrypted"
            }
        }),
        admin({ defaultRole: "pic" }),
        nextCookies()
    ]
})

export type Session = typeof auth.$Infer.Session
