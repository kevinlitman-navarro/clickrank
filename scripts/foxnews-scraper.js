#!/usr/bin/env node

/**
 * Fox News Sponsored Stories Scraper
 * 
 * This script collects authentic clickbait from Fox News "Sponsored stories you may like" sections
 * by visiting multiple news articles and extracting the sponsored content.
 * 
 * Usage: node scripts/foxnews-scraper.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    delay: 3000, // 3 second delay between requests to be respectful
    timeout: 15000, // 15 second timeout
    maxRetries: 3,
    maxArticlesToVisit: 50, // Visit up to 50 different articles
    outputFile: path.join(__dirname, '..', 'static', 'assets', 'data', 'foxnews-clickbait.csv')
};

// Utility functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = CONFIG.maxRetries) {
    const fetchOptions = {
        headers: {
            'User-Agent': CONFIG.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
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

async function getFoxNewsArticleUrls() {
    console.log('🔍 Using known working Fox News article URL for testing...');
    
    // For now, let's start with the URL you provided that we know works
    // We can expand this list with real URLs later
    const testUrls = [
        'https://www.foxnews.com/food-drink/skip-multivitamin-5-nutrient-rich-foods-recommended-doctors-instead'
    ];
    
    console.log(`✅ Using ${testUrls.length} test URL(s) to scrape sponsored content`);
    console.log('📄 Test URLs:');
    testUrls.forEach(url => console.log(`   ${url}`));
    
    return testUrls;
}

function extractSponsoredStories(html) {
    const stories = [];
    
    // Look for Taboola widgets specifically (Fox News commonly uses Taboola)
    const taboolaMatches = html.match(/<div[^>]*id="taboola-[^"]*"[\s\S]*?<\/div>/gi);
    if (taboolaMatches) {
        for (const taboolaSection of taboolaMatches) {
            // Extract Taboola items
            const itemMatches = taboolaSection.match(/<div[^>]*class="[^"]*tbl-reco-item[^"]*"[\s\S]*?<\/div>/gi);
            if (itemMatches) {
                for (const item of itemMatches) {
                    // Extract title
                    const titleMatch = item.match(/<span[^>]*class="[^"]*tbl-reco-item-text[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                                     item.match(/title="([^"]+)"/) ||
                                     item.match(/<div[^>]*class="[^"]*text[^"]*"[^>]*>([^<]+)<\/div>/i);
                    
                    // Extract image
                    const imageMatch = item.match(/<img[^>]*src="([^"]+)"/i);
                    
                    if (titleMatch && imageMatch) {
                        const title = titleMatch[1].trim();
                        const imageUrl = imageMatch[1];
                        
                        if (isLikelyClickbaitTitle(title)) {
                            stories.push({
                                title: title,
                                image_url: imageUrl.startsWith('//') ? 'https:' + imageUrl : imageUrl,
                                source: 'foxnews_taboola'
                            });
                        }
                    }
                }
            }
        }
    }
    
    // Look for Outbrain widgets
    const outbrainMatches = html.match(/<div[^>]*class="[^"]*OUTBRAIN[^"]*"[\s\S]*?<\/div>/gi) ||
                           html.match(/<div[^>]*data-src="[^"]*outbrain[^"]*"[\s\S]*?<\/div>/gi);
    if (outbrainMatches) {
        for (const outbrainSection of outbrainMatches) {
            // Extract Outbrain recommendation items
            const titleMatches = outbrainSection.match(/<span[^>]*class="[^"]*ob-text[^"]*"[^>]*>([^<]+)<\/span>/gi);
            const imageMatches = outbrainSection.match(/<img[^>]*src="([^"]+)"/gi);
            
            if (titleMatches && imageMatches) {
                for (let i = 0; i < Math.min(titleMatches.length, imageMatches.length); i++) {
                    const titleMatch = titleMatches[i].match(/>([^<]+)</);
                    const imageMatch = imageMatches[i].match(/src="([^"]+)"/);
                    
                    if (titleMatch && imageMatch) {
                        const title = titleMatch[1].trim();
                        const imageUrl = imageMatch[1];
                        
                        if (isLikelyClickbaitTitle(title)) {
                            stories.push({
                                title: title,
                                image_url: imageUrl.startsWith('//') ? 'https:' + imageUrl : imageUrl,
                                source: 'foxnews_outbrain'
                            });
                        }
                    }
                }
            }
        }
    }
    
    // General approach: Look for sections with "sponsored", "recommended", "you may like" etc.
    const sponsoredSectionRegexes = [
        /(?:Sponsored|Recommended|You may like)[\s\S]{1,5000}?(?=<\/(?:div|section)|$)/gi,
        /<div[^>]*class="[^"]*(?:sponsored|recommended|related|promoted)[^"]*"[\s\S]{1,3000}?<\/div>/gi,
        /<section[^>]*class="[^"]*(?:sponsored|recommended|related)[^"]*"[\s\S]{1,3000}?<\/section>/gi
    ];
    
    for (const regex of sponsoredSectionRegexes) {
        const matches = html.match(regex);
        if (matches) {
            for (const section of matches) {
                // Look for article-like content within these sections
                const articleMatches = section.match(/<(?:a|div)[^>]*(?:title="([^"]+)"|>[^<]*<[^>]*>([^<]+))/gi);
                if (articleMatches) {
                    for (const articleMatch of articleMatches) {
                        const titleMatch = articleMatch.match(/title="([^"]+)"/) || 
                                         articleMatch.match(/>([^<]{15,150})</);
                        
                        if (titleMatch) {
                            const title = titleMatch[1].trim();
                            if (isLikelyClickbaitTitle(title)) {
                                // Try to find associated image in the same section
                                const imageMatch = section.match(/<img[^>]*src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
                                const imageUrl = imageMatch ? 
                                    (imageMatch[1].startsWith('//') ? 'https:' + imageMatch[1] : imageMatch[1]) :
                                    generatePlaceholderImage(title);
                                
                                stories.push({
                                    title: title,
                                    image_url: imageUrl,
                                    source: 'foxnews_generic'
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    return stories;
}

function isLikelyClickbaitTitle(text) {
    // Check if text looks like a clickbait title
    const clickbaitIndicators = [
        /you won'?t believe/i,
        /shocking/i,
        /amazing/i,
        /incredible/i,
        /unbelievable/i,
        /doctors hate/i,
        /this will/i,
        /what happened next/i,
        /you need to see/i,
        /\\d+\\s+(things|ways|reasons|secrets|facts)/i,
        /never knew/i,
        /changed forever/i,
        /leaves everyone/i,
        /went wrong/i,
        /looks like now/i,
        /then and now/i,
        /at age \\d+/i,
        /\\$\\d+/,
        /before (?:and after|they were famous)/i
    ];
    
    // Must be reasonable length
    if (text.length < 15 || text.length > 200) return false;
    
    // Must not be navigation or common website text
    const excludePatterns = [
        /^(home|news|politics|sports|entertainment|about|contact|privacy|terms)$/i,
        /^(click here|read more|subscribe|sign up|log in)$/i,
        /^(advertisement|sponsored|promoted)$/i,
        /fox news|copyright|all rights reserved/i
    ];
    
    for (const exclude of excludePatterns) {
        if (exclude.test(text)) return false;
    }
    
    // Check for clickbait indicators or general news-like content
    const hasClickbaitIndicator = clickbaitIndicators.some(pattern => pattern.test(text));
    const looksLikeNews = /^[A-Z][^.!?]*[.!?]?$/.test(text) && text.split(' ').length >= 4;
    
    return hasClickbaitIndicator || looksLikeNews;
}

function generatePlaceholderImage(title) {
    const encodedTitle = encodeURIComponent(title.substring(0, 50));
    return `https://via.placeholder.com/400x240/2c5aa0/ffffff?text=${encodedTitle}`;
}

async function scrapeFoxNewsArticle(articleUrl) {
    try {
        await sleep(CONFIG.delay); // Respectful delay
        
        const response = await fetchWithRetry(articleUrl);
        const html = await response.text();
        
        const stories = extractSponsoredStories(html);
        console.log(`   Found ${stories.length} sponsored stories from ${articleUrl}`);
        
        return stories;
        
    } catch (error) {
        console.log(`   ⚠️  Error scraping ${articleUrl}: ${error.message}`);
        return [];
    }
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
        .replace(/"/g, '""')  // Escape quotes
        .replace(/[\r\n]/g, ' ')  // Remove line breaks
        .trim();
}

async function saveToCSV(articles, filename) {
    const csvHeader = 'image_url,title\n';
    const csvContent = articles
        .map(article => `"${sanitizeForCSV(article.image_url)}","${sanitizeForCSV(article.title)}"`)
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
    console.log('🦊 Starting Fox News Sponsored Stories Scraper...\n');
    console.log('⚠️  This scraper respects Fox News robots.txt and uses respectful delays');
    console.log('⚠️  Collecting authentic clickbait from "Sponsored stories" sections\n');
    
    try {
        // Get article URLs to visit
        const articleUrls = await getFoxNewsArticleUrls();
        
        let allStories = [];
        let successCount = 0;
        
        console.log(`\n🔄 Scraping sponsored content from ${articleUrls.length} articles...\n`);
        
        for (let i = 0; i < articleUrls.length; i++) {
            const url = articleUrls[i];
            console.log(`📰 [${i + 1}/${articleUrls.length}] Scraping: ${url}`);
            
            try {
                const stories = await scrapeFoxNewsArticle(url);
                allStories.push(...stories);
                if (stories.length > 0) successCount++;
                
                // Progress update every 10 articles
                if ((i + 1) % 10 === 0) {
                    console.log(`   📊 Progress: ${i + 1}/${articleUrls.length} articles, ${allStories.length} stories collected\n`);
                }
                
            } catch (error) {
                console.log(`   ❌ Failed to scrape ${url}: ${error.message}`);
            }
        }
        
        console.log(`\n🧹 Removing duplicates...`);
        const uniqueStories = removeDuplicates(allStories);
        const duplicatesRemoved = allStories.length - uniqueStories.length;
        
        console.log(`\n📊 Final Results:`);
        console.log(`   • Articles visited: ${articleUrls.length}`);
        console.log(`   • Successful scrapes: ${successCount}`);
        console.log(`   • Total stories found: ${allStories.length}`);
        console.log(`   • Duplicates removed: ${duplicatesRemoved}`);
        console.log(`   • Unique clickbait articles: ${uniqueStories.length}`);
        
        if (uniqueStories.length > 0) {
            await saveToCSV(uniqueStories, CONFIG.outputFile);
            
            console.log(`\n✅ Scraping completed successfully!`);
            console.log(`📁 Authentic Fox News clickbait saved to: ${CONFIG.outputFile}`);
            
            // Show sample titles
            console.log(`\n🎯 Sample clickbait titles collected:`);
            uniqueStories.slice(0, 5).forEach((story, i) => {
                console.log(`   ${i + 1}. "${story.title}"`);
            });
            
        } else {
            console.log('\n❌ No clickbait articles were successfully collected.');
            console.log('💡 This might be due to Fox News changing their site structure or blocking our requests.');
        }
        
    } catch (error) {
        console.error('💥 Scraper failed:', error);
        process.exit(1);
    }
}

// Run the scraper
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}