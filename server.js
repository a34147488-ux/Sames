```javascript
"use strict";

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "dice-casino",
    time: new Date().toISOString()
  });
});

app.get("/api/config", (req, res) => {
  res.json({
    name: "Dice Casino",
    currency: "coins",
    topUpMinimumRubles: 150,
    withdrawalMinimumCoins: 1000000,
    coinsPer1000Rubles: 0.9,
    realPaymentsEnabled: false,
    realWithdrawalsEnabled: false
  });
});

app.use(express.static(PUBLIC_DIR, {
  index: "index.html",
  extensions: ["html"],
  dotfiles: "ignore"
}));

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "NOT_FOUND"
  });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    ok: false,
    error: "INTERNAL_SERVER_ERROR"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Dice Casino server started on port ${PORT}`);
});
```
