# Clickbait Scraper Scripts 🕷️

This directory contains scripts for ethically collecting additional clickbait articles to expand your dataset.

## ⚠️ Ethical Guidelines

**Please follow these guidelines when using the scraper:**

1. **Respect robots.txt** - The scraper checks public APIs and respects rate limits
2. **Don't overwhelm servers** - Built-in delays prevent server overload
3. **Use responsibly** - Only for research, education, or personal projects
4. **Check terms of service** - Ensure compliance with website policies
5. **Give attribution** - Credit sources when using scraped data

## 📁 Files

- `clickbait-scraper.js` - Main scraper script
- `merge-data.js` - Merges new data with existing dataset  
- `README.md` - This documentation

## 🚀 Usage

### 1. Install Dependencies

The scraper uses Node.js built-in modules, but ensure you have Node.js 16+ installed:

```bash
node --version  # Should be 16+
```

### 2. Run the Scraper

```bash
# From the project root directory
node scripts/clickbait-scraper.js
```

**What it does:**
- Scrapes articles from public APIs (Reddit, Hacker News)
- Generates clickbait variations of titles
- Removes duplicates and validates data
- Saves to `static/assets/data/new-clickbait.csv`

### 3. Merge with Existing Data

```bash
node scripts/merge-data.js
```

**What it does:**
- Combines new articles with existing dataset
- Removes duplicates across both datasets
- Creates backup of original data
- Saves merged data to `chum-merged.csv`

### 4. Use the New Data

Replace your existing dataset or update your server code to use the merged file:

```javascript
// In src/routes/+page.server.js, update the path:
const csvPath = join(process.cwd(), 'static', 'assets', 'data', 'chum-merged.csv');
```

## 🛠️ Customization

### Adding New Sources

Edit `clickbait-scraper.js` and add to the `SOURCES` array:

```javascript
{
    name: 'Your Source Name',
    url: 'https://api.example.com/articles',
    extract: (data) => {
        return data.articles.map(article => ({
            title: article.headline,
            image_url: article.thumbnail,
            source: 'example'
        }));
    }
}
```

### Modifying Clickbait Enhancements

Update the `clickbaitPrefixes` array in the `generateClickbaitVariations` function:

```javascript
const clickbaitPrefixes = [
    "You Won't Believe",
    "This Will Shock You",
    // Add your own prefixes here
];
```

### Configuration Options

Modify the `CONFIG` object in `clickbait-scraper.js`:

```javascript
const CONFIG = {
    userAgent: 'Your User Agent',
    delay: 3000,        // 3 second delay
    timeout: 15000,     // 15 second timeout
    maxRetries: 5,      // More retry attempts
    outputFile: 'custom-output.csv'
};
```

## 📊 Expected Output

The scraper typically generates:
- **50-200 articles** per run (depending on sources)
- **CSV format** matching your existing data structure
- **Categorized content** that works with your classification system

Sample output:
```csv
image_url,title
"https://via.placeholder.com/500x300","You Won't Believe: This Simple Programming Trick"
"https://example.com/image.jpg","[Photos] Scientists Discover Amazing New Technology"
```

## 🐛 Troubleshooting

### Common Issues

**"No articles were scraped"**
- Check your internet connection
- Some APIs might be temporarily unavailable
- Try running again later

**"HTTP 429: Too Many Requests"**
- The scraper includes rate limiting, but APIs might be busy
- Wait a few minutes and try again
- Increase the delay in CONFIG

**"Module not found"**
- Ensure you're running from the project root
- Node.js version should be 16+

### Adding Debug Logging

Add this to see more details:

```javascript
// At the top of clickbait-scraper.js
const DEBUG = true;

// Then add debug logs where needed
if (DEBUG) console.log('Debug info:', data);
```

## 📈 Performance Tips

1. **Run during off-peak hours** to be more respectful
2. **Start small** - test with one source first
3. **Monitor output** - check the generated CSV quality
4. **Batch processing** - run periodically rather than continuously

## 🤝 Contributing

To add more sources or improve the scraper:

1. Fork the project
2. Add your source to the `SOURCES` array
3. Test thoroughly with rate limiting
4. Submit a pull request

## 📝 Legal Notes

- **This tool is for educational/research purposes**
- **Respect website terms of service**
- **Don't use for commercial scraping without permission**
- **Consider reaching out to sites for official API access**

---

Happy scraping! 🕷️✨