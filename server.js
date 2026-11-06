const http = require("http");

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ALLOWED_ORIGIN = "https://customer-offers-dashboard.onrender.com";

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";

  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (origin !== ALLOWED_ORIGIN) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (req.method !== "POST" || req.url !== "/api/inquiry") {
    res.writeHead(404);
    return res.end("Not found");
  }

  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 8192) {
        res.writeHead(413);
        return res.end("Request too large");
      }
    }

    const data = JSON.parse(body);

    if (
      data.consent !== true ||
      typeof data.firstName !== "string" ||
      typeof data.phone !== "string" ||
      typeof data.inquiry !== "string"
    ) {
      res.writeHead(400);
      return res.end("Valid consent and inquiry details required");
    }

    if (!BOT_TOKEN || !CHAT_ID) {
      res.writeHead(503);
      return res.end("Notification service not configured");
    }

    const clean = value =>
      String(value || "").replace(/[<>]/g, "").slice(0, 300);

    const message = [
      "New customer inquiry",
      "",
      "First name: " + clean(data.firstName),
      "Last name: " + clean(data.lastName),
      "Phone: " + clean(data.phone),
      "Inquiry: " + clean(data.inquiry),
      "Message: " + clean(data.message),
      "",
      "Submitted with customer consent."
    ].join("\n");

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message
        })
      }
    );

    if (!response.ok) throw new Error("Telegram notification failed");

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    res.writeHead(400);
    res.end("Unable to process inquiry");
  }
});

server.listen(PORT, "0.0.0.0");
