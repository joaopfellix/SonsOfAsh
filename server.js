const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5500;

const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8"
};

const server = http.createServer((req, res) => {

    let filePath;

    if (req.url === "/") {
        filePath = path.join(__dirname, "index.html");
    } else {
        filePath = path.join(__dirname, req.url);
    }

    filePath = path.normalize(filePath);

    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (err, data) => {

        if (err) {
            res.writeHead(404, {
                "Content-Type": "text/plain; charset=utf-8"
            });

            res.end("Arquivo não encontrado");
            return;
        }

        const ext = path.extname(filePath);

        res.writeHead(200, {
            "Content-Type":
                mimeTypes[ext] ||
                "application/octet-stream"
        });

        res.end(data);
    });
});

server.listen(PORT, "127.0.0.1", () => {
    console.log(
        `Sons.Of.Ash rodando em http://localhost:${PORT}`
    );
});