const http = require("http");
const fs = require("fs");
const path = require("path");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

const ROOT = __dirname;

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      serveIndex(res);
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": contentType.includes("html")
        ? "no-cache"
        : "public, max-age=31536000",
    });
    res.end(data);
  });
}

function serveIndex(res) {
  const indexPath = path.join(ROOT, "index.html");
  fs.readFile(indexPath, (err, data) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  const filePath = path.join(ROOT, url);
  const ext = path.extname(filePath);

  if (ext && MIME_TYPES[ext]) {
    serveFile(res, filePath, MIME_TYPES[ext]);
  } else {
    serveIndex(res);
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log("Server running on port " + port);
});
