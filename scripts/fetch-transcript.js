// Minimal script to fetch transcript using youtube-transcript API alternatives
// CommonJS version

const fs = require('fs');
const https = require('https');

const videoId = process.argv[2];
if (!videoId) {
  console.error('Usage: node scripts/fetch-transcript.js <videoId>');
  process.exit(1);
}

const outPath = `artifacts/transcripts/${videoId}.md`;
const url = `https://r.jina.ai/http://youtube.com/watch?v=${videoId}`;

https
  .get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      fs.writeFileSync(outPath, data, 'utf8');
      console.log('Saved page markdown to', outPath);
    });
  })
  .on('error', (err) => {
    console.error('Failed to fetch:', err.message);
    process.exit(1);
  });
