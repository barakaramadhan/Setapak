// Entry point untuk Vercel: /api/chat
// Semua logic ada di server/chatHandler.js supaya sama dengan mode dev.

import { handleChatRequest } from "../server/chatHandler.js";

// Data lapangan (peta, panduan, cuaca) + AI butuh lebih dari batas default 10 detik.
export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  await handleChatRequest(req, res, process.env);
}
