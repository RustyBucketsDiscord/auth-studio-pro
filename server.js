require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Rate limiting - 30 auth checks per IP per hour
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: { error: "Too many authentication requests. Try again in an hour." },
    standardHeaders: true,
    legacyHeaders: false,
});

// API Route: /api/authenticate
app.post("/api/authenticate", authLimiter, async (req, res) => {
    try {
          const { messages, system } = req.body;

      if (!messages || !system) {
              return res.status(400).json({ error: "Missing required fields" });
      }

      if (!process.env.ANTHROPIC_API_KEY) {
              return res.status(500).json({ error: "API key not configured on server" });
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                        "Content-Type": "application/json",
                        "x-api-key": process.env.ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                        model: "claude-sonnet-4-20250514",
                        max_tokens: 4000,
                        system: system,
                        messages: messages,
                        tools: [{ type: "web_search_20250305", name: "web_search" }],
              }),
      });

      if (!response.ok) {
              const errText = await response.text();
              console.error("Anthropic API error:", response.status, errText);
              return res.status(response.status).json({ error: "Authentication service error", detail: errText });
      }

      const data = await response.json();
          res.json(data);

    } catch (err) {
          console.error("Server error:", err);
          res.status(500).json({ error: "Internal server error" });
    }
});

// Serve frontend for all other routes
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Auth Studio Pro running on port ${PORT}`);
    console.log(`Open: http://localhost:${PORT}`);
});
