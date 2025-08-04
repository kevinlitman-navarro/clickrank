#!/usr/bin/env node

/**
 * Clickbait Article Scraper
 * 
 * This script collects clickbait articles from various public sources
 * with proper rate limiting and ethical scraping practices.
 * 
 * Usage: node scripts/clickbait-scraper.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    delay: 2000, // 2 second delay between requests
    timeout: 10000, // 10 second timeout
    maxRetries: 3,
    outputFile: path.join(__dirname, '..', 'static', 'assets', 'data', 'new-clickbait.csv')
};

// Sources for clickbait content (public APIs and feeds)
const SOURCES = [
    {
        name: 'Reddit Popular',
        url: 'https://www.reddit.com/r/all/.json?limit=100',
        extract: (data) => {
            return data.data.children
                .filter(post => post.data.thumbnail && post.data.thumbnail.startsWith('http'))
                .map(post => ({
                    title: post.data.title,
                    image_url: post.data.thumbnail,
                    source: 'reddit'
                }));
        }
    },
    {
        name: 'Reddit Clickbait Subs',
        url: 'https://www.reddit.com/r/todayilearned+interestingasfuck+mildlyinteresting+nextfuckinglevel+damnthatsinteresting/.json?limit=100',
        extract: (data) => {
            return data.data.children
                .filter(post => post.data.thumbnail && post.data.thumbnail.startsWith('http'))
                .map(post => ({
                    title: post.data.title,
                    image_url: post.data.thumbnail,
                    source: 'reddit_clickbait'
                }));
        }
    },
    {
        name: 'Reddit Ask',
        url: 'https://www.reddit.com/r/AskReddit/.json?limit=100',
        extract: (data) => {
            return data.data.children
                .filter(post => post.data.title && post.data.title.length > 10)
                .map(post => ({
                    title: post.data.title,
                    image_url: generatePlaceholderImage(post.data.title),
                    source: 'reddit_ask'
                }));
        }
    },
    {
        name: 'Hacker News',
        url: 'https://hacker-news.firebaseio.com/v0/topstories.json',
        extract: async (data) => {
            const articles = [];
            // Get first 50 story IDs
            const storyIds = data.slice(0, 50);
            
            for (const id of storyIds) {
                try {
                    await sleep(100); // Small delay between API calls
                    const storyResponse = await fetchWithRetry(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
                    const story = await storyResponse.json();
                    
                    if (story && story.title && story.url) {
                        articles.push({
                            title: story.title,
                            image_url: generatePlaceholderImage(story.title),
                            source: 'hackernews'
                        });
                    }
                } catch (error) {
                    console.log(`Skipping story ${id}: ${error.message}`);
                }
            }
            return articles;
        }
    },
    {
        name: 'JSONPlaceholder Posts',
        url: 'https://jsonplaceholder.typicode.com/posts',
        extract: (data) => {
            return data.slice(0, 50).map(post => ({
                title: post.title.charAt(0).toUpperCase() + post.title.slice(1),
                image_url: generatePlaceholderImage(post.title),
                source: 'jsonplaceholder'
            }));
        }
    }
];

// Utility functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = CONFIG.maxRetries) {
    const fetchOptions = {
        headers: {
            'User-Agent': CONFIG.userAgent,
            'Accept': 'application/json, text/html, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            ...options.headers
        },
        timeout: CONFIG.timeout,
        ...options
    };

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Fetching: ${url} (attempt ${i + 1})`);
            const response = await fetch(url, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            console.log(`Attempt ${i + 1} failed: ${error.message}`);
            if (i === retries - 1) throw error;
            await sleep(CONFIG.delay * (i + 1)); // Exponential backoff
        }
    }
}

function generatePlaceholderImage(title) {
    // Generate a placeholder image URL based on title
    const encodedTitle = encodeURIComponent(title.substring(0, 50));
    return `https://via.placeholder.com/500x300/0066cc/ffffff?text=${encodedTitle}`;
}

function sanitizeTitle(title) {
    // Clean up title for CSV format
    return title
        .replace(/"/g, '""')  // Escape quotes
        .replace(/\n/g, ' ')   // Remove newlines
        .replace(/\r/g, ' ')   // Remove carriage returns
        .trim();
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

async function scrapeSource(source) {
    console.log(`\n🔍 Scraping ${source.name}...`);
    
    try {
        const response = await fetchWithRetry(source.url);
        const data = await response.json();
        
        let articles;
        if (typeof source.extract === 'function') {
            articles = await source.extract(data);
        } else {
            articles = data;
        }
        
        // Filter and validate articles
        const validArticles = articles
            .filter(article => 
                article.title && 
                article.title.length > 0 && 
                article.title.length < 200 &&
                (article.image_url && isValidUrl(article.image_url))
            )
            .map(article => ({
                title: sanitizeTitle(article.title),
                image_url: article.image_url,
                source: source.name.toLowerCase().replace(/\s+/g, '_')
            }));
        
        console.log(`✅ Found ${validArticles.length} valid articles from ${source.name}`);
        return validArticles;
        
    } catch (error) {
        console.error(`❌ Error scraping ${source.name}: ${error.message}`);
        return [];
    }
}

function generateClickbaitVariations(articles) {
    // Generate more clickbait-style variations of existing titles
    const clickbaitPrefixes = [
        "You Won't Believe",
        "Doctors Hate This",
        "This Will Shock You",
        "[Photos]",
        "[Pics]",
        "Scientists Discover",
        "People Are Going Crazy Over",
        "This Simple Trick",
        "The Secret Behind",
        "What Happened Next Will Amaze You",
        "Experts Don't Want You To Know",
        "This Changes Everything",
        "The Truth About",
        "Shocking Discovery",
        "Mind-Blowing Facts About",
        "The Real Reason Behind",
        "Incredible Story Of",
        "Amazing Secret Of",
        "Unbelievable Truth Behind",
        "[Gallery] Rare Photos Of"
    ];
    
    const clickbaitSuffixes = [
        "Will Leave You Speechless",
        "That Everyone Should Know",
        "You Never Knew Existed",
        "That Will Change Your Life",
        "Experts Are Talking About",
        "That Went Viral Overnight",
        "Everyone Is Obsessed With",
        "That Broke The Internet",
        "You Wish You Knew Sooner",
        "That's Taking Over Social Media"
    ];
    
    const variations = [];
    
    articles.forEach(article => {
        // Create multiple variations per article for more content
        
        // Prefix variations (60% chance)
        if (Math.random() < 0.6) {
            const prefix = clickbaitPrefixes[Math.floor(Math.random() * clickbaitPrefixes.length)];
            variations.push({
                ...article,
                title: `${prefix}: ${article.title}`,
                source: `${article.source}_prefix`
            });
        }
        
        // Suffix variations (40% chance)
        if (Math.random() < 0.4) {
            const suffix = clickbaitSuffixes[Math.floor(Math.random() * clickbaitSuffixes.length)];
            variations.push({
                ...article,
                title: `${article.title} ${suffix}`,
                source: `${article.source}_suffix`
            });
        }
        
        // Number-based clickbait (30% chance)
        if (Math.random() < 0.3) {
            const numbers = [3, 5, 7, 10, 15, 20, 25, 30, 50];
            const number = numbers[Math.floor(Math.random() * numbers.length)];
            const templates = [
                `${number} Things About ${article.title} That Will Surprise You`,
                `${number} Secrets Behind ${article.title}`,
                `${number} Facts About ${article.title} You Never Knew`,
                `${number} Reasons Why ${article.title}`,
                `Top ${number} ${article.title} Moments`
            ];
            const template = templates[Math.floor(Math.random() * templates.length)];
            variations.push({
                ...article,
                title: template,
                source: `${article.source}_numbered`
            });
        }
    });
    
    return variations;
}

async function saveToCSV(articles, filename) {
    const csvHeader = 'image_url,title\n';
    const csvContent = articles
        .map(article => `"${article.image_url}","${article.title}"`)
        .join('\n');
    
    const fullContent = csvHeader + csvContent;
    
    // Ensure directory exists
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filename, fullContent, 'utf8');
    console.log(`💾 Saved ${articles.length} articles to ${filename}`);
}

async function main() {
    console.log('🚀 Starting Clickbait Scraper...\n');
    console.log('⚠️  Please ensure you comply with websites\' terms of service and robots.txt');
    console.log('⚠️  This scraper includes rate limiting and ethical practices\n');
    
    const allArticles = [];
    
    for (const source of SOURCES) {
        const articles = await scrapeSource(source);
        allArticles.push(...articles);
        
        // Respectful delay between sources
        if (SOURCES.indexOf(source) < SOURCES.length - 1) {
            console.log(`⏰ Waiting ${CONFIG.delay}ms before next source...`);
            await sleep(CONFIG.delay);
        }
    }
    
    // Generate clickbait variations
    console.log('\n🎭 Generating clickbait variations...');
    const variations = generateClickbaitVariations(allArticles);
    allArticles.push(...variations);
    
    // Remove duplicates
    const uniqueArticles = allArticles.filter((article, index, self) =>
        index === self.findIndex(a => a.title === article.title)
    );
    
    console.log(`\n📊 Summary:`);
    console.log(`- Total articles scraped: ${allArticles.length}`);
    console.log(`- Unique articles: ${uniqueArticles.length}`);
    console.log(`- Duplicates removed: ${allArticles.length - uniqueArticles.length}`);
    
    if (uniqueArticles.length > 0) {
        await saveToCSV(uniqueArticles, CONFIG.outputFile);
        console.log(`\n✅ Scraping completed successfully!`);
        console.log(`📁 New articles saved to: ${CONFIG.outputFile}`);
        console.log(`\n💡 To merge with existing data, you can combine the CSV files.`);
    } else {
        console.log('\n❌ No articles were successfully scraped.');
    }
}

// Run the scraper
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('💥 Scraper failed:', error);
        process.exit(1);
    });
}