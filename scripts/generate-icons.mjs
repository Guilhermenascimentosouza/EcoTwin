import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = path.resolve(process.cwd());
const inputSvg = path.join(projectRoot, 'public', 'favicon.svg');
const outDir = path.join(projectRoot, 'public', 'icons');

async function generate({ size, outFile }) {
  const buffer = await fs.readFile(inputSvg);
  await sharp(buffer, { density: 512 })
    .resize(size, size)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outFile);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const icon192 = path.join(outDir, 'icon-192.png');
  const icon512 = path.join(outDir, 'icon-512.png');

  await generate({ size: 192, outFile: icon192 });
  await generate({ size: 512, outFile: icon512 });

  const s192 = await fs.stat(icon192);
  const s512 = await fs.stat(icon512);

  if (s192.size === 0 || s512.size === 0) {
    throw new Error('Icon generation failed: output PNG is empty.');
  }

  process.stdout.write(
    `Generated icons:\n- ${path.relative(projectRoot, icon192)} (${s192.size} bytes)\n- ${path.relative(projectRoot, icon512)} (${s512.size} bytes)\n`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
