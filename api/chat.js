
import { handleChatRequest } from "../server/chatHandler.js";

export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  await handleChatRequest(req, res, process.env);
}
