#!/usr/bin/env node

/**
 * Outbrain Clickbait Scraper
 * 
 * This script collects authentic clickbait from news sites that use Outbrain widgets
 * by visiting multiple articles and extracting the sponsored content.
 * 
 * Usage: node scripts/outbrain-scraper.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    delay: 2000, // 2 second delay between requests
    timeout: 15000, // 15 second timeout
    maxRetries: 3,
    maxArticlesToVisit: 30, // Visit up to 30 different articles
    outputFile: path.join(__dirname, '..', 'static', 'assets', 'data', 'outbrain-clickbait.csv')
};

// News sites that commonly use Outbrain widgets
const NEWS_SITES = [
    {
        name: 'CNN',
        baseUrl: 'https://www.cnn.com',
        sitemapUrl: 'https://www.cnn.com/sitemap.xml',
        articlePattern: /https:\/\/www\.cnn\.com\/\d{4}\/\d{2}\/\d{2}\/[^\/]+\/[^\/]+\/index\.html/g
    },
    {
        name: 'NBC News',
        baseUrl: 'https://www.nbcnews.com',
        homepageUrl: 'https://www.nbcnews.com',
        articlePattern: /href="(\/[^"]*(?:politics|news|health|business|tech|sports)[^"]*)"[^>]*>/g
    },
    {
        name: 'MSN',
        baseUrl: 'https://www.msn.com', 
        homepageUrl: 'https://www.msn.com/en-us',
        articlePattern: /href="(\/en-us\/[^"]*)"[^>]*>/g
    },
    {
        name: 'The Hill',
        baseUrl: 'https://thehill.com',
        homepageUrl: 'https://thehill.com',
        articlePattern: /href="(\/[^"]*(?:politics|policy|healthcare|technology|business)[^"]*)"[^>]*>/g
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
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
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

async function getArticleUrls(site) {
    console.log(`🔍 Finding article URLs from ${site.name}...`);
    
    try {
        const response = await fetchWithRetry(site.homepageUrl || site.baseUrl);
        const html = await response.text();
        
        const urls = new Set();
        let match;
        
        // Use the site-specific pattern to find articles
        const regex = new RegExp(site.articlePattern.source, site.articlePattern.flags);
        
        while ((match = regex.exec(html)) !== null) {
            let articleUrl = match[1] || match[0];
            
            // Clean up the URL
            if (articleUrl.startsWith('/')) {
                articleUrl = site.baseUrl + articleUrl;
            }
            
            // Filter out unwanted URLs
            if (!articleUrl.includes('/video/') && 
                !articleUrl.includes('/live/') &&
                !articleUrl.includes('/gallery/') &&
                !articleUrl.includes('#') &&
                articleUrl.length > 30) {
                urls.add(articleUrl);
            }
        }
        
        const urlArray = Array.from(urls).slice(0, CONFIG.maxArticlesToVisit / NEWS_SITES.length);
        console.log(`✅ Found ${urlArray.length} article URLs from ${site.name}`);
        
        return urlArray;
        
    } catch (error) {
        console.error(`❌ Error finding URLs from ${site.name}: ${error.message}`);
        return [];
    }
}

function extractOutbrainContent(html) {
    const stories = [];
    
    // Look for Outbrain widgets with various patterns
    const outbrainPatterns = [
        // Standard Outbrain widget
        /<div[^>]*class="[^"]*OUTBRAIN[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
        /<div[^>]*data-src="[^"]*outbrain[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
        /<div[^>]*id="[^"]*outbrain[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
        
        // Outbrain recommendation items
        /<div[^>]*class="[^"]*ob-widget[^"]*"[\s\S]*?<\/div>/gi,
        /<div[^>]*class="[^"]*ob-recommendation[^"]*"[\s\S]*?<\/div>/gi,
        
        // Generic recommendation patterns that might contain Outbrain
        /<div[^>]*class="[^"]*(?:recommendation|related|promoted|sponsored)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
        /<section[^>]*class="[^"]*(?:recommendation|related|promoted)[^"]*"[^>]*>[\s\S]*?<\/section>/gi
    ];
    
    for (const pattern of outbrainPatterns) {
        const matches = html.match(pattern);
        
        if (matches) {
            for (const section of matches) {
                // Extract individual recommendation items
                extractItemsFromSection(section, stories);
            }
        }
    }
    
    // Also look for direct Outbrain item patterns
    const itemPatterns = [
        // Outbrain item with title and image
        /<div[^>]*class="[^"]*ob-rec-item[^"]*"[\s\S]*?<\/div>/gi,
        /<a[^>]*class="[^"]*ob-rec-link[^"]*"[\s\S]*?<\/a>/gi,
        
        // Generic patterns for clickbait items
        /<div[^>]*class="[^"]*(?:story|article|item)[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<[^>]*>([^<]{15,150})<\/[^>]*>[\s\S]*?<\/div>/gi
    ];
    
    for (const pattern of itemPatterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const fullMatch = match[0];
            extractItemsFromSection(fullMatch, stories);
        }
    }
    
    return stories;
}

function extractItemsFromSection(section, stories) {
    // Look for title and image combinations within this section
    
    // Pattern 1: Find images and nearby text
    const imageMatches = section.match(/<img[^>]*src="([^"]+)"/gi);
    if (imageMatches) {
        for (const imageMatch of imageMatches) {
            const imageUrlMatch = imageMatch.match(/src="([^"]+)"/);
            if (imageUrlMatch) {
                const imageUrl = imageUrlMatch[1];
                
                // Look for text near this image
                const nearbyText = findNearbyText(section, imageMatch);
                if (nearbyText && isLikelyClickbaitTitle(nearbyText)) {
                    stories.push({
                        title: nearbyText,
                        image_url: cleanImageUrl(imageUrl),
                        source: 'outbrain_widget'
                    });
                }
            }
        }
    }
    
    // Pattern 2: Look for specific Outbrain classes
    const obTextMatches = section.match(/<[^>]*class="[^"]*ob-text[^"]*"[^>]*>([^<]+)<\/[^>]*>/gi);
    if (obTextMatches) {
        for (const textMatch of obTextMatches) {
            const titleMatch = textMatch.match(/>([^<]+)</);
            if (titleMatch) {
                const title = titleMatch[1].trim();
                if (isLikelyClickbaitTitle(title)) {
                    // Try to find associated image
                    const imageMatch = section.match(/<img[^>]*src="([^"]+)"/);
                    const imageUrl = imageMatch ? cleanImageUrl(imageMatch[1]) : generatePlaceholderImage(title);
                    
                    stories.push({
                        title: title,
                        image_url: imageUrl,
                        source: 'outbrain_text'
                    });
                }
            }
        }
    }
    
    // Pattern 3: Look for title attributes and alt text
    const titleAttrMatches = section.match(/title="([^"]{15,150})"/gi);
    if (titleAttrMatches) {
        for (const titleMatch of titleAttrMatches) {
            const title = titleMatch.match(/title="([^"]+)"/)[1];
            if (isLikelyClickbaitTitle(title)) {
                const imageMatch = section.match(/<img[^>]*src="([^"]+)"/);
                const imageUrl = imageMatch ? cleanImageUrl(imageMatch[1]) : generatePlaceholderImage(title);
                
                stories.push({
                    title: title,
                    image_url: imageUrl,
                    source: 'outbrain_title'
                });
            }
        }
    }
}

function findNearbyText(section, imageMatch) {
    // Look for text within 500 characters of the image
    const imageIndex = section.indexOf(imageMatch);
    const start = Math.max(0, imageIndex - 500);
    const end = Math.min(section.length, imageIndex + 500);
    const nearbySection = section.substring(start, end);
    
    // Extract potential titles
    const textMatches = nearbySection.match(/>([^<]{15,150})</g);
    if (textMatches) {
        for (const textMatch of textMatches) {
            const text = textMatch.substring(1, textMatch.length - 1).trim();
            if (isLikelyClickbaitTitle(text)) {
                return text;
            }
        }
    }
    
    return null;
}

function isLikelyClickbaitTitle(text) {
    // Check if text looks like a clickbait title
    if (!text || text.length < 10 || text.length > 200) return false;
    
    // Exclude common non-article text
    const excludePatterns = [
        /^(advertisement|sponsored|promoted|by |photo|image|video)$/i,
        /^(home|news|politics|sports|entertainment|about|contact|privacy|terms)$/i,
        /^(click here|read more|subscribe|sign up|log in|share|comment)$/i,
        /copyright|all rights reserved|loading|error/i,
        /^\d+$/,
        /^[^a-zA-Z]*$/
    ];
    
    for (const exclude of excludePatterns) {
        if (exclude.test(text)) return false;
    }
    
    // Check for clickbait indicators
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
        /before (?:and after|they were famous)/i,
        /celebrities? who/i,
        /stars? who/i,
        /photos? of/i,
        /pictures? of/i
    ];
    
    const hasClickbaitIndicator = clickbaitIndicators.some(pattern => pattern.test(text));
    const looksLikeNews = /^[A-Z][^.!?]*[.!?]?$/.test(text) && text.split(' ').length >= 4;
    
    return hasClickbaitIndicator || looksLikeNews;
}

function cleanImageUrl(url) {
    if (url.startsWith('//')) {
        return 'https:' + url;
    }
    if (url.startsWith('/')) {
        return 'https://example.com' + url; // Will be replaced with actual domain
    }
    return url;
}

function generatePlaceholderImage(title) {
    const encodedTitle = encodeURIComponent(title.substring(0, 50));
    return `https://via.placeholder.com/400x240/3498db/ffffff?text=${encodedTitle}`;
}

async function scrapeArticleForOutbrain(articleUrl) {
    try {
        await sleep(CONFIG.delay);
        
        const response = await fetchWithRetry(articleUrl);
        const html = await response.text();
        
        const stories = extractOutbrainContent(html);
        console.log(`   Found ${stories.length} clickbait stories from ${articleUrl}`);
        
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
    console.log('🌐 Starting Outbrain Clickbait Scraper...\n');
    console.log('⚠️  Collecting authentic clickbait from news sites with Outbrain widgets');
    console.log('⚠️  Using respectful delays and ethical scraping practices\n');
    
    let allStories = [];
    let totalArticlesScraped = 0;
    
    for (const site of NEWS_SITES) {
        console.log(`\n📰 Processing ${site.name}...`);
        
        try {
            const articleUrls = await getArticleUrls(site);
            
            if (articleUrls.length === 0) {
                console.log(`   ⚠️  No articles found for ${site.name}, skipping...`);
                continue;
            }
            
            console.log(`\n🔄 Scraping ${articleUrls.length} articles from ${site.name}...\n`);
            
            for (let i = 0; i < articleUrls.length; i++) {
                const url = articleUrls[i];
                console.log(`📄 [${i + 1}/${articleUrls.length}] ${site.name}: ${url}`);
                
                const stories = await scrapeArticleForOutbrain(url);
                allStories.push(...stories);
                totalArticlesScraped++;
                
                // Progress update
                if ((i + 1) % 5 === 0) {
                    console.log(`   📊 Progress: ${allStories.length} stories collected so far\n`);
                }
            }
            
        } catch (error) {
            console.error(`❌ Error processing ${site.name}: ${error.message}`);
        }
    }
    
    console.log(`\n🧹 Removing duplicates...`);
    const uniqueStories = removeDuplicates(allStories);
    const duplicatesRemoved = allStories.length - uniqueStories.length;
    
    console.log(`\n📊 Final Results:`);
    console.log(`   • News sites processed: ${NEWS_SITES.length}`);
    console.log(`   • Articles scraped: ${totalArticlesScraped}`);
    console.log(`   • Total stories found: ${allStories.length}`);
    console.log(`   • Duplicates removed: ${duplicatesRemoved}`);
    console.log(`   • Unique clickbait articles: ${uniqueStories.length}`);
    
    if (uniqueStories.length > 0) {
        await saveToCSV(uniqueStories, CONFIG.outputFile);
        
        console.log(`\n✅ Scraping completed successfully!`);
        console.log(`📁 Authentic clickbait saved to: ${CONFIG.outputFile}`);
        
        // Show sample titles
        console.log(`\n🎯 Sample clickbait titles collected:`);
        uniqueStories.slice(0, 5).forEach((story, i) => {
            console.log(`   ${i + 1}. "${story.title}"`);
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