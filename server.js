var express = require("express");
const nocache = require("nocache");
const {
  expressCspHeader,
  NONCE,
  SELF,
  EVAL,
  INLINE,
} = require("express-csp-header");
const fs = require("fs");
const ejs = require("ejs");
const path = require("path");
const http = require("http");

var app = express();
app.set("view engine", "ejs");

const allowedExt = [
  ".js",
  ".ico",
  ".css",
  ".png",
  ".jpg",
  ".woff2",
  ".woff",
  ".ttf",
  ".svg",
];

app.use(nocache());

app.use(
  expressCspHeader({
    directives: {
      "font-src": [SELF, "fonts.gstatic.com"],
      "script-src": [SELF, "cdnjs.cloudflare.com"],
      "style-src": [
        SELF,
        NONCE,
        "fonts.googleapis.com",
        "cdnjs.cloudflare.com",
      ],
    },
    // Add "reportOnly: true" for just console logs without CSP content suppression.
    // reportOnly: true,
  })
);

var ui = path.join(__dirname, "dist");
app.use("/", express.static(ui));
app.use("/", express.static(path.join(ui, "assets")));
app.use("/", express.static(path.join(ui, "assets", "img")));

const tokens = {};

const prefixes = [
  "main",
  "polyfills",
  "runtime",
  "scripts",
  "styles",
  "vendor",
];
fs.readdir("dist", (err, files) => {
  prefixes.forEach((prefix) => {
    const file = files.find((val) => val.startsWith(prefix));
    tokens[prefix] = file
      ? prefix === "styles"
        ? `<link rel="stylesheet" href="${file}">`
        : `<script src="${file}" defer></script>`
      : "";
  });
});

app.get("/", (req, res) => {
  ejs.renderFile(
    path.join(__dirname, "views", "index.ejs"),
    { nonce: req.nonce, ...tokens },
    (err, result) => {
      if (err) {
        console.log("Error rendering index:", err);
      } else {
        res.send(result);
      }
    }
  );
});

app.all("*", function (req, res) {
  if (allowedExt.filter((ext) => req.url.indexOf(ext) > 0).length > 0) {
    res.sendFile(path.resolve(`dist/${req.url}`));
  }
});

var port = getPort();

http
  .createServer(app)
  .listen(port, () => console.log(`Server is running on port ${port}...`));

function getPort() {
  // get port from app.json; otherwise default to 8080
  const appJson = require("./app.json");
  return (
    (appJson &&
      appJson.apps &&
      appJson.apps[0] &&
      appJson.apps[0].server &&
      appJson.apps[0].server.port) ||
    8080
  );
}
