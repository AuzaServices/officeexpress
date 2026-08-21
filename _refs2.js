const fs = require("fs");
const s = fs.readFileSync("lib/modelos.js", "utf8");
for (const sym of ["Document", "Paragraph", "TextRun", "ImageRun", "AlignmentType", "BorderStyle", "VerticalAlign", "ShadingType", "WidthType", "TableRow", "TableCell", "Table", "Packer"]) {
  console.log(sym + ": " + (s.split(sym).length - 1));
}
