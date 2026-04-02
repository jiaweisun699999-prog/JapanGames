/**
 * 将图片批量导入并重命名为 web/assets/portraits/p01..p50
 *
 * 用法：
 * 1) 把你的 50 张图放进 web/assets/portraits-inbox/
 * 2) 在项目根目录运行：node scripts/import-portraits.mjs
 *
 * 规则：
 * - 会按文件名排序（字典序）后依次映射为 p01..p50
 * - 支持 .png/.jpg/.jpeg/.webp
 * - 若不足 50 张会报错并退出
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());
const inbox = path.join(root, "web", "assets", "portraits-inbox");
const outDir = path.join(root, "web", "assets", "portraits");

const exts = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function pad2(n) {
  return String(n).padStart(2, "0");
}

const files = (await fs.readdir(inbox, { withFileTypes: true }))
  .filter((d) => d.isFile())
  .map((d) => d.name)
  .filter((n) => exts.has(path.extname(n).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, "en"));

if (files.length < 50) {
  console.error(`需要至少 50 张图片，当前仅找到 ${files.length} 张：${inbox}`);
  process.exit(1);
}

await fs.mkdir(outDir, { recursive: true });

for (let i = 0; i < 50; i++) {
  const srcName = files[i];
  const src = path.join(inbox, srcName);
  const ext = path.extname(srcName).toLowerCase();
  const dstName = `p${pad2(i + 1)}${ext}`;
  const dst = path.join(outDir, dstName);
  await fs.copyFile(src, dst);
}

console.log(`已导入 50 张图片到：${outDir}`);
console.log(`提示：spend 模块默认优先读取 p01.png，其次 p01.jpg；建议你最终统一成 png 或 jpg。`);

