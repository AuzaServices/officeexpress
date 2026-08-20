const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = __dirname;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};
http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const fp = path.join(ROOT, p);
    try {
      const d = fs.readFileSync(fp);
      res.writeHead(200, { "Content-Type": types[path.extname(fp)] || "application/octet-stream" });
      res.end(d);
    } catch (e) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("nf");
    }
  })
  .listen(8123, () => console.log("root server 8123"));
