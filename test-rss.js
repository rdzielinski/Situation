// Quick test to verify RSS feed is working
require('dotenv').config();
const Parser = require('rss-parser');

async function testRSS() {
  const rssUrl = process.env.FACEBOOK_RSS_URL;

  console.log('\n🧪 Testing RSS Feed for Jefferson County Scanner...\n');
  console.log(`RSS URL: ${rssUrl}\n`);

  if (!rssUrl) {
    console.error('❌ No RSS URL configured in .env file');
    return;
  }

  try {
    const parser = new Parser();
    const feed = await parser.parseURL(rssUrl);

    console.log(`✅ RSS Feed Connected Successfully!\n`);
    console.log(`Feed Title: ${feed.title}`);
    console.log(`Feed Description: ${feed.description || 'N/A'}`);
    console.log(`Total Items: ${feed.items ? feed.items.length : 0}\n`);

    if (feed.items && feed.items.length > 0) {
      console.log('📋 Recent Scanner Posts:\n');

      // Show first 5 items
      const recentItems = feed.items.slice(0, 5);

      recentItems.forEach((item, index) => {
        const content = item.contentSnippet || item.description || item.content || '';
        const cleanContent = content.replace(/<[^>]*>/g, '').substring(0, 150);

        console.log(`${index + 1}. ${item.title || 'No title'}`);
        console.log(`   Date: ${item.pubDate || 'Unknown'}`);
        console.log(`   Content: ${cleanContent}...`);
        console.log(`   Link: ${item.link || 'N/A'}\n`);
      });
    } else {
      console.log('⚠️  No items found in RSS feed');
    }

    console.log('✅ Test Complete - RSS feed is working!\n');
  } catch (error) {
    console.error('❌ Error fetching RSS feed:', error.message);
  }
}

testRSS();
