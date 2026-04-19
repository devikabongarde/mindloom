import { Router } from "express";
import express from "express";
import { telegramWebhook } from "../controllers/telegram.controller.js";

const router = Router();

router.post("/webhook", express.json(), telegramWebhook);

export default router;
