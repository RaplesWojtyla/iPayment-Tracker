import { env } from "@/env"
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: env.SMTP_USER ? {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
    } : undefined
})

export type SendEmailInput = {
    to: string
    subject: string
    text: string
    html?: string
}

export async function sendEmail({
    to,
    subject,
    text,
    html
}: SendEmailInput) {
    await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        text,
        html
    })
}
