const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);

  const ext = path.extname(filePath);

  // If no extension, serve index.html (SPA routing)
  if (!ext) {
    filePath = path.join(__dirname, "index.html");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // File not found -> serve index.html for SPA routing
      fs.readFile(path.join(__dirname, "index.html"), (err2, data2) => {
        if (err2) {
          res.writeHead(500);
          res.end("Internal Server Error");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data2);
      });
      return;
    }

    const mimeType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mimeType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
