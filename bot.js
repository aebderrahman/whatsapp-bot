const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const axios = require("axios");

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("auth");

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on("creds.update", saveCreds);

    // QR Code (for first login)
    sock.ev.on("connection.update", (update) => {
        if (update.qr) {
            qrcode.generate(update.qr, { small: true });
        }
    });

    // AI function
    async function askAI(text) {
        try {
            const res = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: "mistralai/mistral-7b-instruct",
                    messages: [
                        { role: "system", content: "You are a helpful assistant." },
                        { role: "user", content: text }
                    ]
                },
                {
                    headers: {
                        "Authorization": "Bearer " + process.env.OPENROUTER_KEY,
                        "Content-Type": "application/json"
                    }
                }
            );

            return res.data.choices[0].message.content;

        } catch (e) {
            console.log(e.message);
            return "وقع مشكل فـ AI 🤖";
        }
    }

    // Listen messages
    sock.ev.on("messages.upsert", async ({ messages }) => {

        const msg = messages[0];
        if (!msg.message) return;

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text || "";

        const chatId = msg.key.remoteJid;

        if (!text || !chatId) return;

        const reply = await askAI(text);

        await sock.sendMessage(chatId, { text: reply });
    });

    console.log("🤖 Bot is running...");
}

startBot();
