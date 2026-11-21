// Bundles src/ into one self-contained index.html (three.js and GSAP stay on their CDNs).
import { build } from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const dir = path.dirname(fileURLToPath(import.meta.url));
const r = await build({ entryPoints: [`${dir}/src/app.js`], bundle: true, format: "esm", write: false, minify: !process.env.DEV, external: ["three", "three/addons/*"], target: "es2022", charset: "utf8" });
const js = r.outputFiles[0].text;
const shell = fs.readFileSync(`${dir}/src/shell.html`, "utf8");
const css = fs.readFileSync(`${dir}/src/ui.css`, "utf8");
const page = shell.replace("/*CSS*/", () => css).replace("/*APP*/", () => js.replace(/<\/script/g, "<\\/script"));
fs.writeFileSync(`${dir}/index.html`, `<!doctype html>\n<html lang="en">\n${page}</html>\n`);
console.log("index.html", (page.length / 1024).toFixed(0) + " KB");
