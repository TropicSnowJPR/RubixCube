import fs from "fs";
import path from "path";
import sharp from "sharp";

const TEXTURE_DIR = "./assets/textures";
const OUTPUT = "./assets/atlas.png";

const images = fs
    .readdirSync(TEXTURE_DIR)
    .filter(f => /\.(png|jpg|jpeg)$/.test(f))
    .map(f => path.join(TEXTURE_DIR, f));

const size = 256*4; // tile size (keep power of 2 for sanity)
const cols = Math.ceil(Math.sqrt(images.length));
const rows = Math.ceil(images.length / cols);

const atlasWidth = cols * size;
const atlasHeight = rows * size;

async function buildAtlas() {
    const canvas = sharp({
        create: {
            width: atlasWidth,
            height: atlasHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    });

    let composites = [];

    for (let i = 0; i < images.length; i++) {
        const img = images[i];

        const x = (i % cols) * size;
        const y = Math.floor(i / cols) * size;

        composites.push({
            input: await sharp(img).resize(size, size).toBuffer(),
            left: x,
            top: y,
        });
    }

    await canvas
        .composite(composites)
        .png()
        .toFile(OUTPUT);

    console.log(`Atlas built: ${OUTPUT}`);
    console.log(`Grid: ${cols} x ${rows}, tiles: ${images.length}`);
}

buildAtlas();