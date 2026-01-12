#!/bin/bash

echo ""
echo "🔧 Setting up .env file for RSS feed"
echo ""

# Check if .env exists
if [ -f .env ]; then
  echo "⚠️  .env file already exists"
  echo ""
  echo "Checking if RSS URL is configured..."

  if grep -q "FACEBOOK_RSS_URL=https://rss.app" .env; then
    echo "✅ RSS URL is already configured!"
    echo ""
    grep "FACEBOOK_RSS_URL" .env
    echo ""
    echo "Your .env is ready to use!"
  else
    echo "❌ RSS URL not found or not set"
    echo ""
    echo "Adding RSS URL to your .env file..."

    # Check if the line exists but is empty
    if grep -q "^FACEBOOK_RSS_URL=" .env; then
      # Replace the existing line
      if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's|^FACEBOOK_RSS_URL=.*|FACEBOOK_RSS_URL=https://rss.app/feeds/F2oLkuuCprXqkL9R.xml|' .env
      else
        # Linux
        sed -i 's|^FACEBOOK_RSS_URL=.*|FACEBOOK_RSS_URL=https://rss.app/feeds/F2oLkuuCprXqkL9R.xml|' .env
      fi
      echo "✅ Updated FACEBOOK_RSS_URL in .env"
    else
      # Add the line
      echo "FACEBOOK_RSS_URL=https://rss.app/feeds/F2oLkuuCprXqkL9R.xml" >> .env
      echo "✅ Added FACEBOOK_RSS_URL to .env"
    fi
  fi
else
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "✅ .env file created!"
  echo ""
  echo "The RSS feed URL is already configured in the file!"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Your RSS feed is configured:"
echo "  https://rss.app/feeds/F2oLkuuCprXqkL9R.xml"
echo ""
echo "Now run: npm start"
echo ""
