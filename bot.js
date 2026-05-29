const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const axios = require("axios");

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("auth");

    const sock = makeWASocket({
        auth: state
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        if (update.qr) {
            qrcode.generate(update.qr, { small: true });
        }
    });

    async function askAI(text) {
        try {
            const res = await axios.post(
                "https://api.openrouter.ai/api/v1/chat/completions",
                {
                    model: "mistralai/mistral-7b-instruct",
                    messages: [{ role: "user", content: text }]
                },
                {
                    headers: {
                        "Authorization": "Bearer YOUR_API_KEY",
                        "Content-Type": "application/json"
                    }
                }
            );

            return res.data.choices[0].message.content;
        } catch (e) {
            return "وقع مشكل فـ AI 🤖";
        }
    }

    sock.ev.on("messages.upsert", async ({ messages }) => {

        const msg = messages[0];
        if (!msg.message) return;

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text || "";

        const chatId = msg.key.remoteJid;

        if (!chatId) return;

        const reply = await askAI(text);

        await sock.sendMessage(chatId, { text: reply });

    });

}

startBot();
