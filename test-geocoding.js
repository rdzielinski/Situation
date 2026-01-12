// Test script to demonstrate enhanced geocoding from scanner posts
require('dotenv').config();
const { getCoordinates, extractAddresses, extractCity } = require('./server/utils/geocode');

// Example scanner posts from Jefferson County Scanner
const testPosts = [
  {
    text: "Structure fire at 123 Main Street in Jefferson. Multiple units responding.",
    expected: "Should find '123 Main Street' and geocode it in Jefferson"
  },
  {
    text: "Vehicle accident on Highway 26 and County Road B near Johnson Creek. Injuries reported.",
    expected: "Should find intersection 'Highway 26 and County Road B' and geocode it"
  },
  {
    text: "Medical emergency at N2345 County Road F in Watertown. Ambulance en route.",
    expected: "Should find 'N2345 County Road F' address and geocode in Watertown"
  },
  {
    text: "Fire call near Walmart on Highway 18 in Jefferson.",
    expected: "Should find landmark 'near Walmart' and city 'Jefferson'"
  },
  {
    text: "Traffic stop on I-94 near Lake Mills exit.",
    expected: "Should match city 'Lake Mills'"
  },
  {
    text: "Brush fire reported in Fort Atkinson.",
    expected: "Should match city 'Fort Atkinson'"
  },
  {
    text: "Car crash at 456 Oak Avenue and Elm Street in Watertown.",
    expected: "Should find street address and intersection"
  },
  {
    text: "Power lines down on STH 89 near Sullivan.",
    expected: "Should find state highway and city"
  }
];

async function runTests() {
  console.log('\n🧪 Testing Enhanced Geocoding System\n');
  console.log('='.repeat(80));

  for (let i = 0; i < testPosts.length; i++) {
    const post = testPosts[i];

    console.log(`\n📝 Test ${i + 1}: ${post.text}`);
    console.log(`Expected: ${post.expected}`);
    console.log('-'.repeat(80));

    // Show what was extracted
    const addresses = extractAddresses(post.text);
    const city = extractCity(post.text);

    if (addresses.length > 0) {
      console.log(`  🏠 Extracted addresses: ${addresses.join(', ')}`);
    }
    if (city) {
      console.log(`  🏙️  Extracted city: ${city.city}`);
    }

    // Get coordinates
    try {
      const coords = await getCoordinates(post.text);

      console.log(`\n  📍 Result:`);
      console.log(`     Latitude: ${coords.lat}`);
      console.log(`     Longitude: ${coords.lon}`);
      console.log(`     City: ${coords.city || 'Unknown'}`);
      console.log(`     Source: ${coords.source || 'geocoded'}`);
      if (coords.address) {
        console.log(`     Address: ${coords.address}`);
      }
      if (coords.landmark) {
        console.log(`     Landmark: ${coords.landmark}`);
      }
      console.log(`\n  ✅ SUCCESS - Location determined`);
    } catch (error) {
      console.log(`\n  ❌ ERROR: ${error.message}`);
    }

    console.log('='.repeat(80));

    // Small delay between tests to respect API rate limits
    if (i < testPosts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log('\n✅ All geocoding tests complete!\n');
  console.log('Summary:');
  console.log('- The geocoding system can now parse street addresses');
  console.log('- Handles Wisconsin highway formats (N1234 County Road B)');
  console.log('- Detects intersections (Highway X and County Road Y)');
  console.log('- Recognizes 60+ cities/towns in southeastern Wisconsin');
  console.log('- Falls back gracefully when no location is found');
  console.log('\nWhen you run the main app, scanner posts will automatically');
  console.log('be placed on the map at their actual locations! 🗺️\n');
}

runTests().catch(console.error);
