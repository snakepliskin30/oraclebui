//Create a server that can send back static files
const http = require("http");
const url = require("url");
const fs = require("fs");

//npm i mime-types
const lookup = require("mime-types").lookup;

const server = http.createServer((req, res) => {
  let parsedURL = req.url;
  let path = parsedURL.replace(/^\/+|\/+$/g, "");
  let file = "";

  console.log("the path is", path);

  if (path == "") {
    path = "index.html";
    file = __dirname + "/SocoBUISearchExt/" + path;
  } else if (path.includes("vendorlib")) {
    path = path.replace("vendorlib/", "");
    file = __dirname + "/vendorlib/" + path;
  } else {
    file = __dirname + "/SocoBUISearchExt/" + path;
  }

  fs.readFile(file, function (err, content) {
    if (err) {
      console.log(`File Not Found ${file}`);
      res.writeHead(404);
      res.end();
    } else {
      console.log(`Returning ${path}`);
      res.setHeader("X-Content-Type-Options", "nosniff");
      let mime = lookup(path);
      res.writeHead(200, { "Content-type": mime });
      res.end(content);
    }
  });
});

server.listen(8080, "localhost", () => {
  console.log("Listening on port 1234");
});
