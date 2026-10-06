#!/usr/bin/env node
/**
 * Generates the extension icons (an eye that is not watching) as PNG files, without any dependency.
 * Usage: node scripts/make-icons.js <outputDir>
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [16, 32, 48, 128];
const outDir = path.resolve(process.argv[2] || 'icons');

const BG = [8, 9, 12];
const RING = [52, 57, 70];
const IRIS = [79, 140, 255];
const IRIS_END = [79, 225, 193];
const PUPIL = [5, 6, 9];
const SLASH = [205, 211, 224];

const crcTable = (() => {
	const table = new Uint32Array(256);

	for (let n = 0; n < 256; n++) {
		let c = n;

		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}

		table[n] = c >>> 0;
	}

	return table;
})();

const crc32 = (buffer) => {
	let crc = 0xffffffff;

	for (let i = 0; i < buffer.length; i++) {
		crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
	}

	return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);
	const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(typeAndData), 0);

	return Buffer.concat([length, typeAndData, crc]);
};

const encodePng = (size, pixels) => {
	const raw = Buffer.alloc((size * 4 + 1) * size);

	for (let y = 0; y < size; y++) {
		raw[y * (size * 4 + 1)] = 0; // filter: none
		pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
	}

	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // RGBA
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;

	return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0))]);
};

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** Signed distance helpers (in pixel units), anti-aliased with 4x4 supersampling */
const render = (size) => {
	const pixels = Buffer.alloc(size * size * 4);
	const ss = 4;
	const c = size / 2;
	const outer = size * 0.47;
	const ring = Math.max(1, size * 0.045);
	const iris = size * 0.19;
	const pupil = size * 0.085;
	const slashW = Math.max(0.8, size * 0.035);
	const angle = (-24 * Math.PI) / 180;

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			let acc = [0, 0, 0, 0];

			for (let sy = 0; sy < ss; sy++) {
				for (let sx = 0; sx < ss; sx++) {
					const px = x + (sx + 0.5) / ss - c;
					const py = y + (sy + 0.5) / ss - c;
					const d = Math.hypot(px, py);
					let color = null;

					if (d <= outer) {
						color = BG;

						if (d >= outer - ring) {
							color = RING;
						} else if (d <= iris) {
							color = d <= pupil ? PUPIL : mix(IRIS, IRIS_END, 1 - d / iris);
						}

						// a thin bar across the eye: it is not watching
						const rx = px * Math.cos(angle) - py * Math.sin(angle);
						const ry = px * Math.sin(angle) + py * Math.cos(angle);

						if (Math.abs(ry) <= slashW / 2 && Math.abs(rx) <= outer - ring * 2 && d > iris) {
							color = SLASH;
						}
					}

					if (color) {
						acc[0] += color[0];
						acc[1] += color[1];
						acc[2] += color[2];
						acc[3] += 255;
					}
				}
			}

			const n = ss * ss;
			const coverage = acc[3] / n / 255;
			const offset = (y * size + x) * 4;

			if (coverage > 0) {
				pixels[offset] = Math.round(acc[0] / (acc[3] / 255));
				pixels[offset + 1] = Math.round(acc[1] / (acc[3] / 255));
				pixels[offset + 2] = Math.round(acc[2] / (acc[3] / 255));
			}

			pixels[offset + 3] = Math.round(coverage * 255);
		}
	}

	return pixels;
};

fs.mkdirSync(outDir, {recursive: true});

SIZES.forEach((size) => {
	const file = path.join(outDir, `icon-${size}.png`);
	fs.writeFileSync(file, encodePng(size, render(size)));
	console.log(`wrote ${path.relative(process.cwd(), file)}`);
});
