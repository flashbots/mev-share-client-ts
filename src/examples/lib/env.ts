import dotenv from "dotenv"
dotenv.config({
    path: "src/examples/.env",
})

const environmentError = (varName: string) => new Error(`Environment error: ${varName} not set. Please check src/examples/.env`)

if (!process.env.AUTH_PRIVATE_KEY) {
    throw environmentError("AUTH_PRIVATE_KEY")
}
if (!process.env.SENDER_PRIVATE_KEY) {
    throw environmentError("SENDER_PRIVATE_KEY")
}
if (!process.env.PROVIDER_URL) {
    throw environmentError("PROVIDER_URL")
}

export default {
    authKey: process.env.AUTH_PRIVATE_KEY || "",
    providerUrl: process.env.PROVIDER_URL || "",
    senderKey: process.env.SENDER_PRIVATE_KEY || "",
}
