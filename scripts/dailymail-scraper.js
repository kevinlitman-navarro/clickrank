#!/usr/bin/env node

/**
 * Daily Mail Clickbait Scraper
 * 
 * Daily Mail is known for clickbait headlines and has a simpler HTML structure
 * that's easier to scrape for genuine clickbait content.
 * 
 * Usage: node scripts/dailymail-scraper.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    delay: 1500, // 1.5 second delay to be faster but still respectful
    timeout: 15000,
    maxRetries: 3,
    outputFile: path.join(__dirname, '..', 'static', 'assets', 'data', 'dailymail-clickbait.csv')
};

// Daily Mail sections known for clickbait (reduced for faster scraping)
const DAILYMAIL_SECTIONS = [
    'https://www.dailymail.co.uk/tvshowbiz/index.html',   // Celebrity news  
    'https://www.dailymail.co.uk/femail/index.html',      // Lifestyle/Fashion
    'https://www.dailymail.co.uk/health/index.html',      // Health
];

async function fetchWithRetry(url, retries = CONFIG.maxRetries) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Fetching: ${url} (attempt ${i + 1})`);
            const response = await fetch(url, {
                headers: {
                    'User-Agent': CONFIG.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cache-Control': 'no-cache'
                },
                timeout: CONFIG.timeout
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            console.log(`Attempt ${i + 1} failed: ${error.message}`);
            if (i === retries - 1) throw error;
            await sleep(CONFIG.delay * (i + 1));
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function extractDailyMailArticles(html) {
    const articles = [];
    
    // Daily Mail article patterns
    const patterns = [
        // Main article links with headlines
        /<a[^>]*class="[^"]*linkro-[^"]*"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>[\s\S]*?<\/a>/gi,
        
        // Alternative article pattern
        /<h2[^>]*class="[^"]*linkro-[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<\/h2>/gi,
        
        // Story cards with images
        /<div[^>]*class="[^"]*article[^"]*"[\s\S]*?<a[^>]*href="([^"]+)"[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<h2[^>]*>([^<]+)<\/h2>[\s\S]*?<\/div>/gi,
        
        // Generic article links
        /<a[^>]*href="(\/[^"]*\/article-[^"]*\.html)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<h2[^>]*>([^<]+)<\/h2>[\s\S]*?<\/a>/gi
    ];
    
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            let url, title, imageUrl;
            
            // Extract based on pattern structure
            if (match.length === 4) {
                [, url, imageUrl, title] = match;
            } else if (match.length === 3) {
                [, url, title] = match;
                imageUrl = null;
            }
            
            if (title && title.length > 10) {
                // Clean up the title
                title = title.trim()
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>');
                
                // Ensure URL is complete
                if (url && url.startsWith('/')) {
                    url = 'https://www.dailymail.co.uk' + url;
                }
                
                // Clean up image URL
                if (imageUrl) {
                    if (imageUrl.startsWith('//')) {
                        imageUrl = 'https:' + imageUrl;
                    } else if (imageUrl.startsWith('/')) {
                        imageUrl = 'https://www.dailymail.co.uk' + imageUrl;
                    }
                } else {
                    imageUrl = generatePlaceholderImage(title);
                }
                
                if (isGoodClickbaitTitle(title)) {
                    articles.push({
                        title: title,
                        image_url: imageUrl,
                        source: 'dailymail',
                        url: url
                    });
                }
            }
        }
    }
    
    // Also look for standalone headlines in the page
    const headlinePatterns = [
        /<h2[^>]*>([^<]{20,150})<\/h2>/gi,
        /<h3[^>]*>([^<]{20,150})<\/h3>/gi,
        /<div[^>]*class="[^"]*headline[^"]*"[^>]*>([^<]{20,150})<\/div>/gi
    ];
    
    for (const pattern of headlinePatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const title = match[1].trim()
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
                
            if (isGoodClickbaitTitle(title)) {
                // Try to find associated image nearby
                const nearbyImageMatch = html.substring(Math.max(0, match.index - 1000), match.index + 1000)
                    .match(/<img[^>]*src="([^"]+)"/);
                
                const imageUrl = nearbyImageMatch ? 
                    (nearbyImageMatch[1].startsWith('//') ? 'https:' + nearbyImageMatch[1] : nearbyImageMatch[1]) :
                    generatePlaceholderImage(title);
                
                articles.push({
                    title: title,
                    image_url: imageUrl,
                    source: 'dailymail_headline'
                });
            }
        }
    }
    
    return articles;
}

function isGoodClickbaitTitle(title) {
    if (!title || title.length < 15 || title.length > 200) return false;
    
    // Exclude common non-article text
    const excludes = [
        /^(advertisement|sponsored|promoted|by |photo|image|video|loading|error)$/i,
        /^(home|news|mail|contact|privacy|terms|about|sport|tv|femail)$/i,
        /^(click|read|more|share|comment|subscribe|sign|log)$/i,
        /copyright|reserved|dailymail|mailonline/i,
        /^\d+$/,
        /^[^a-zA-Z]*$/,
        /^(follow|like|tweet|share|save)/i
    ];
    
    for (const exclude of excludes) {
        if (exclude.test(title)) return false;
    }
    
    // Strong clickbait indicators
    const strongIndicators = [
        /you won'?t believe/i,
        /shocking/i,
        /incredible/i,
        /unbelievable/i,
        /amazing/i,
        /stunning/i,
        /exclusive/i,
        /revealed/i,
        /secret/i,
        /\\d+ (?:things|ways|reasons|secrets|facts|photos|pictures)/i,
        /(?:before|after) (?:and|&) (?:after|before)/i,
        /looks? (?:incredible|amazing|stunning|unrecognizable)/i,
        /(?:aged|age) \\d+/i,
        /what (?:happened|she|he|they|it) (?:next|now|looks like)/i,
        /(?:stars?|celebrities?) (?:who|that|you)/i,
        /\\$[\\d,]+/,
        /worth \\$[\\d,]+/i,
        /mansion|yacht|luxury/i,
        /weight loss|lost weight|slim|diet/i,
        /\\bfans? (?:are|go|left)/i,
        /\\b(?:goes|went) (?:wrong|viral|wild)/i
    ];
    
    const hasStrongIndicator = strongIndicators.some(pattern => pattern.test(title));
    
    // Medium clickbait indicators (need multiple)
    const mediumIndicators = [
        /\\b(?:new|latest|breaking|exclusive)\\b/i,
        /\\b(?:celebrity|star|famous)\\b/i,
        /\\b(?:royal|prince|princess|king|queen)\\b/i,
        /\\b(?:hollywood|kardashian|jennifer|brad|britney)\\b/i,
        /\\b(?:wedding|divorce|pregnant|baby|relationship)\\b/i,
        /\\b(?:diet|fitness|health|doctor)\\b/i,
        /\\b(?:home|house|property|million|billion)\\b/i,
        /\\b(?:fashion|style|beauty|makeup)\\b/i
    ];
    
    const mediumCount = mediumIndicators.filter(pattern => pattern.test(title)).length;
    
    // General news-like structure
    const looksLikeNews = /^[A-Z][^.!?]*[.!?]?$/.test(title) && 
                         title.split(' ').length >= 4 && 
                         title.split(' ').length <= 20;
    
    return hasStrongIndicator || (mediumCount >= 2) || (mediumCount >= 1 && looksLikeNews);
}

function generatePlaceholderImage(title) {
    const encodedTitle = encodeURIComponent(title.substring(0, 40));
    return `https://via.placeholder.com/400x300/2c5282/ffffff?text=${encodedTitle}`;
}

function removeDuplicates(articles) {
    const seen = new Set();
    const unique = [];
    
    for (const article of articles) {
        const key = article.title.toLowerCase().trim().replace(/[^\w\s]/g, '');
        if (!seen.has(key) && key.length > 10) {
            seen.add(key);
            unique.push(article);
        }
    }
    
    return unique;
}

function sanitizeForCSV(text) {
    return text
        .replace(/"/g, '""')
        .replace(/[\r\n]/g, ' ')
        .trim();
}

async function saveToCSV(articles, filename) {
    const csvHeader = 'image_url,title\n';
    const csvContent = articles
        .map(article => `"${sanitizeForCSV(article.image_url)}","${sanitizeForCSV(article.title)}"`)
        .join('\n');
    
    const fullContent = csvHeader + csvContent;
    
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filename, fullContent, 'utf8');
    console.log(`💾 Saved ${articles.length} articles to ${filename}`);
}

async function main() {
    console.log('📰 Starting Daily Mail Clickbait Scraper...\n');
    console.log('⚠️  Collecting authentic clickbait headlines from Daily Mail');
    console.log('⚠️  Using respectful delays and ethical scraping practices\n');
    
    let allArticles = [];
    
    for (let i = 0; i < DAILYMAIL_SECTIONS.length; i++) {
        const sectionUrl = DAILYMAIL_SECTIONS[i];
        const sectionName = sectionUrl.split('/')[3] || 'unknown';
        
        console.log(`📄 [${i + 1}/${DAILYMAIL_SECTIONS.length}] Scraping ${sectionName} section...`);
        console.log(`   URL: ${sectionUrl}`);
        
        try {
            await sleep(CONFIG.delay);
            
            const response = await fetchWithRetry(sectionUrl);
            const html = await response.text();
            
            const articles = extractDailyMailArticles(html);
            console.log(`   ✅ Found ${articles.length} clickbait articles from ${sectionName}`);
            
            allArticles.push(...articles);
            
            if (articles.length > 0) {
                console.log(`   📝 Sample: "${articles[0].title}"`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error scraping ${sectionName}: ${error.message}`);
        }
        
        console.log('');
    }
    
    console.log(`🧹 Removing duplicates...`);
    const uniqueArticles = removeDuplicates(allArticles);
    const duplicatesRemoved = allArticles.length - uniqueArticles.length;
    
    console.log(`\n📊 Final Results:`);
    console.log(`   • Sections scraped: ${DAILYMAIL_SECTIONS.length}`);
    console.log(`   • Total articles found: ${allArticles.length}`);
    console.log(`   • Duplicates removed: ${duplicatesRemoved}`);
    console.log(`   • Unique clickbait articles: ${uniqueArticles.length}`);
    
    if (uniqueArticles.length > 0) {
        await saveToCSV(uniqueArticles, CONFIG.outputFile);
        
        console.log(`\n✅ Scraping completed successfully!`);
        console.log(`📁 Daily Mail clickbait saved to: ${CONFIG.outputFile}`);
        
        console.log(`\n🎯 Sample clickbait titles collected:`);
        uniqueArticles.slice(0, 8).forEach((article, i) => {
            console.log(`   ${i + 1}. "${article.title}"`);
        });
        
    } else {
        console.log('\n❌ No clickbait articles were successfully collected.');
    }
}

// Run the scraper
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}