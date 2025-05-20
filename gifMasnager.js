const path = require('path');
const fs = require('fs');
const { createCanvas } = require('canvas');
const GIFEncoder = require('gifencoder');

const GIF_DIR = path.join(__dirname, 'gifs');
const CACHE_FILE = path.join(__dirname, 'cache.json');

if (!fs.existsSync(GIF_DIR)) fs.mkdirSync(GIF_DIR);

const cache = new Map(); // key: normalized timestamp, value: { filePath, expiresAt }

// Load persistent cache from disk
function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    const data = fs.readFileSync(CACHE_FILE, 'utf8');
    try {
      const parsed = JSON.parse(data);
      for (const [key, value] of Object.entries(parsed)) {
        cache.set(Number(key), value);
      }
    } catch (e) {
      console.error('❌ Failed to load cache:', e.message);
    }
  }
}

// Save current cache to disk
function saveCache() {
  const json = Object.fromEntries(cache);
  fs.writeFileSync(CACHE_FILE, JSON.stringify(json, null, 2), 'utf8');
}

// Normalize to nearest minute
function normalizeTimestamp(ts) {
  return Math.floor(ts / 60) * 60;
}

async function generateCountdownGif(futureTimestamp, outputPath = 'countdown.gif') {
  const encoder = new GIFEncoder(400, 100);
  const canvas = createCanvas(400, 100);
  const ctx = canvas.getContext('2d');

  const writeStream = fs.createWriteStream(outputPath);
  encoder.createReadStream().pipe(writeStream);

  encoder.start();
  encoder.setRepeat(-1);        
  encoder.setDelay(1000);     
  encoder.setQuality(10);

  const now = Math.floor(Date.now() / 1000);
  let timeLeft = futureTimestamp - now;

  const totalFrames = 110; // 1:50

  for (let i = 0; i < totalFrames; i++) {
    const remaining = timeLeft - i;
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 20px Sans';
    ctx.fillText(`${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds left`, 10, 50);

    encoder.addFrame(ctx);
  }

  encoder.finish();
  console.log('GIF countdown saved to', outputPath);
}

// Clean expired GIFs from cache and disk
function cleanExpiredCache() {
  const now = Math.floor(Date.now() / 1000);
  for (const [key, { expiresAt, filePath }] of cache.entries()) {
    if (expiresAt <= now) {
      fs.unlink(filePath, err => {
        if (!err) console.log(`🗑️ Deleted expired GIF: ${filePath}`);
      });
      cache.delete(key);
    }
  }
  saveCache();
}

// Check for cache within ±60s of the requested timestamp
function findCachedGif(inputTimestamp) {
  for (const [key, value] of cache.entries()) {
    if (Math.abs(key - inputTimestamp) <= 90) {
      return value.filePath;
    }
  }
  return null;
}

// Main handler
async function getCachedOrGenerateGif(futureTimestamp) {
  loadCache();
  cleanExpiredCache();

  const cached = findCachedGif(futureTimestamp);
  if (cached) {
    console.log('✅ Using cached GIF');
    return cached;
  }

  const normalized = normalizeTimestamp(futureTimestamp);
  const fileName = `countdown_${normalized}.gif`;
  const filePath = path.join(GIF_DIR, fileName);

  await generateCountdownGif(futureTimestamp, filePath);

  cache.set(normalized, {
    filePath,
    expiresAt: futureTimestamp,
  });
  saveCache();

  console.log('🎉 New GIF generated and cached:', filePath);
  return filePath;
}

// Exported for external use
module.exports = {
  getCachedOrGenerateGif
};

// Demo usage (for direct execution)
if (require.main === module) {
  const futureTimestamp = 1747747366; // 10 minutes from now
  getCachedOrGenerateGif(futureTimestamp).then((gifPath) => {
    console.log('GIF Path:', gifPath);
  });
}
