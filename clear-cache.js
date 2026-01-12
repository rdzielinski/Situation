// Script to clear cached data and force fresh fetch
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const files = [
  'scanner.json',
  'news.json',
  'weather.json',
  'flights.json'
];

console.log('\n🧹 Clearing cached data...\n');

let cleared = 0;
for (const file of files) {
  const filePath = path.join(dataDir, file);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Deleted ${file}`);
      cleared++;
    } else {
      console.log(`ℹ️  ${file} doesn't exist (nothing to clear)`);
    }
  } catch (error) {
    console.log(`⚠️  Could not delete ${file}: ${error.message}`);
  }
}

console.log(`\n✅ Cleared ${cleared} cached files`);
console.log('\nNext time you start the server, it will fetch fresh data from all sources!\n');
