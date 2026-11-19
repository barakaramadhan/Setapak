// Entry point untuk Vercel: /api/chat
// Semua logic ada di server/chatHandler.js supaya sama dengan mode dev.

import { handleChatRequest } from "../server/chatHandler.js";

export default async function handler(req, res) {
  await handleChatRequest(req, res, process.env);
}
