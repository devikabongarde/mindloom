import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import User from "../models/User.js";
import Shelf from "../models/Shelf.js";
import Link from "../models/Link.js";
import { generateShelfPDF } from "../services/pdf.service.js";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text, options = {}) {
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      ...options,
    });
  } catch (err) {
    console.error("Telegram sendMessage error:", err.response?.data || err.message);
  }
}

async function sendDocument(chatId, filePath, caption) {
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("document", fs.createReadStream(filePath));
  if (caption) formData.append("caption", caption);

  try {
    await axios.post(`${TELEGRAM_API}/sendDocument`, formData, {
      headers: formData.getHeaders(),
    });
  } catch (err) {
    console.error("Telegram sendDocument error:", err.response?.data || err.message);
  }
}

async function findUserByTelegramId(telegramId) {
  return User.findOne({ telegramId: String(telegramId) });
}

async function findShelfForUser(user, nameQuery) {
  const shelves = await Shelf.find({
    $or: [{ ownerId: user._id }, { members: user._id }],
  });

  if (!nameQuery) return shelves || null;

  const q = nameQuery.toLowerCase();
  return (
    shelves.find((s) => s.name.toLowerCase() === q) ||
    shelves.find((s) => s.name.toLowerCase().includes(q)) ||
    null
  );
}

export const telegramWebhook = async (req, res) => {
  try {
    const update = req.body;

    if (!update.message) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = (update.message.text || "").trim();
    const telegramUserId = update.message.from.id;

    console.log("Telegram incoming:", { chatId, text, telegramUserId });

    const user = await findUserByTelegramId(telegramUserId);
    if (!user) {
      await sendMessage(
        chatId,
        "Hi! I'm the *MINDLOOM* bot. 📚\n\nI don't recognize your Telegram account yet.\n\nYour Telegram ID is: `" + telegramUserId + "`\n\nAsk the team to link this ID to your MINDLOOM account."
      );
      return res.status(200).json({ ok: true });
    }

    if (!text.startsWith("/")) {
      await sendMessage(
        chatId,
        "Use commands like:\n\n" +
          "`/shelves` - list shelves\n" +
          "`/shelf dbms` - view links in a shelf\n" +
          "`/pdf research` - get PDF of a shelf"
      );
      return res.status(200).json({ ok: true });
    }

    const parts = text.split(/\s+/);
    const command = (parts[0] || "").toLowerCase();
    const args = parts.slice(1).join(" ").trim();

    if (command === "/start" || command === "/help") {
      await sendMessage(
        chatId,
        "*Welcome to MINDLOOM Study Bot* 📚\n\n" +
          "I can help you browse and export your shelves:\n\n" +
          "`/shelves` — list your shelves\n" +
          "`/shelf [name]` — recent links in a shelf\n" +
          "`/pdf [shelf name]` — PDF export of a shelf"
      );
    }

    else if (command === "/shelves") {
      const shelves = await Shelf.find({
        $or: [{ ownerId: user._id }, { members: user._id }],
      });

      if (shelves.length === 0) {
        await sendMessage(
          chatId,
          "You have no shelves yet. Create one in the MINDLOOM dashboard."
        );
      } else {
        const lines = await Promise.all(
          shelves.map(async (s) => {
            const count = await Link.countDocuments({ shelfId: s._id });
            return `• *${s.name}* — ${count} link${count !== 1 ? "s" : ""}`;
          })
        );
        await sendMessage(
          chatId,
          "*Your Shelves*:\n\n" +
            lines.join("\n") +
            "\n\nUse `/shelf [name]` to inspect one."
        );
      }
    }

    else if (command === "/shelf") {
      const shelf = await findShelfForUser(user, args);
      if (!shelf) {
        await sendMessage(
          chatId,
          args
            ? `Shelf *${args}* not found.\nUse \`/shelves\` to list your shelves.`
            : "Please specify a shelf name: `/shelf dbms`"
        );
      } else {
        const links = await Link.find({ shelfId: shelf._id })
          .sort({ createdAt: -1 })
          .limit(10);

        if (links.length === 0) {
          await sendMessage(chatId, `Shelf *${shelf.name}* has no links yet.`);
        } else {
          const lines = links.map((l, i) => {
            const summary =
              l.summary && l.summary.length > 100
                ? l.summary.slice(0, 100) + "..."
                : l.summary || "(no summary)";
            return (
              `${i + 1}. *${l.title || "Untitled"}*\n` +
              `   ${summary}\n` +
              (l.url ? `   ${l.url}` : "")
            );
          });

          await sendMessage(
            chatId,
            `*${shelf.name}* — ${links.length} recent link(s):\n\n` +
              lines.join("\n\n") +
              `\n\nUse \`/pdf ${shelf.name}\` to get a full PDF.`
          );
        }
      }
    }



    else if (command === "/pdf") {
      const shelf = await findShelfForUser(user, args);

      if (!shelf) {
        await sendMessage(
          chatId,
          args
            ? `Shelf *${args}* not found.\nUse \`/shelves\` to list your shelves.`
            : "Please specify a shelf name: `/pdf dbms`"
        );
      } else {
        const links = await Link.find({ shelfId: shelf._id });
        if (links.length === 0) {
          await sendMessage(chatId, `Shelf *${shelf.name}* has no links yet.`);
        } else {
          await sendMessage(
            chatId,
            `Generating PDF for *${shelf.name}* (${links.length} links)...`
          );

          try {
            const { filePath } = await generateShelfPDF(shelf, links, null);
            await sendDocument(
              chatId,
              filePath,
              `📄 ${shelf.name} — MINDLOOM Archive`
            );
          } catch (err) {
            console.error("PDF error:", err.message);
            await sendMessage(
              chatId,
              "Something went wrong generating the PDF. Please try again."
            );
          }
        }
      }
    }

    else {
      await sendMessage(
        chatId,
        "Unknown command.\nUse `/help` to see available commands."
      );
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err.message);
    return res.status(200).json({ ok: true });
  }
};
