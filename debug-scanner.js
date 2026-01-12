// Debug script to test scanner RSS feed fetching
require('dotenv').config();
const { fetchAndCache } = require('./server/services/scannerService');

async function debugScanner() {
  console.log('\n🔍 Debugging Scanner Feed\n');
  console.log('='repeat(80));

  console.log('\n📋 Environment Check:');
  console.log(`  RSS URL configured: ${process.env.FACEBOOK_RSS_URL ? '✅ YES' : '❌ NO'}`);
  if (process.env.FACEBOOK_RSS_URL) {
    console.log(`  RSS URL: ${process.env.FACEBOOK_RSS_URL}`);
  }
  console.log(`  Facebook token: ${process.env.FACEBOOK_ACCESS_TOKEN ? '✅ YES' : '❌ NO (expected)'}`);

  console.log('\n🚀 Fetching scanner data...\n');
  console.log('='repeat(80));

  try {
    const incidents = await fetchAndCache();

    console.log('\n'repeat(80));
    console.log(`\n✅ Successfully fetched ${incidents.length} incidents\n`);

    if (incidents.length === 0) {
      console.log('⚠️  WARNING: No incidents found!');
      console.log('\nPossible issues:');
      console.log('  1. RSS feed URL not configured in .env');
      console.log('  2. RSS feed is empty or unreachable');
      console.log('  3. Parsing is failing');
    } else {
      console.log('📊 Incident breakdown:');

      // Group by source
      const bySource = {};
      incidents.forEach(inc => {
        const source = inc.source || 'unknown';
        bySource[source] = (bySource[source] || 0) + 1;
      });

      for (const [source, count] of Object.entries(bySource)) {
        console.log(`  ${source}: ${count}`);
      }

      console.log('\n📝 Sample incidents:\n');
      incidents.slice(0, 3).forEach((inc, i) => {
        console.log(`${i + 1}. ${inc.title}`);
        console.log(`   Description: ${inc.description.substring(0, 100)}...`);
        console.log(`   Location: ${inc.location} (${inc.lat}, ${inc.lon})`);
        console.log(`   Source: ${inc.source || 'unknown'}`);
        console.log(`   Timestamp: ${inc.timestamp}`);
        console.log();
      });
    }

    console.log('='repeat(80));
    console.log('\n✅ Debug complete!\n');

  } catch (error) {
    console.error('\n❌ ERROR during fetch:');
    console.error(error);
  }
}

debugScanner();
