const fs = require("fs");
const s = fs.readFileSync("public/editor.html", "utf8");
let i = s.indexOf("<form");
if (i < 0) { i = s.indexOf("id=\"nome\""); console.log("sem <form>, campo nome @", i); console.log(s.slice(i - 600, i + 200)); }
else console.log(s.slice(i, i + 5500));
