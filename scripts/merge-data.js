#!/usr/bin/env node

/**
 * Data Merger Script
 * 
 * Merges new clickbait articles with existing data while removing duplicates
 * 
 * Usage: node scripts/merge-data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXISTING_FILE = path.join(__dirname, '..', 'static', 'assets', 'data', 'chum.csv');
const NEW_FILE = path.join(__dirname, '..', 'static', 'assets', 'data', 'new-clickbait.csv');
const MERGED_FILE = path.join(__dirname, '..', 'static', 'assets', 'data', 'chum-merged.csv');

function parseCSV(content) {
    const lines = content.trim().split('\n');
    const header = lines[0];
    const articles = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim()) {
            // Simple CSV parsing - handles quoted fields
            const match = line.match(/^"([^"]+)","(.+)"$/);
            if (match) {
                articles.push({
                    image_url: match[1],
                    title: match[2].replace(/""/g, '"') // Unescape quotes
                });
            }
        }
    }
    
    return { header, articles };
}

function createCSV(articles) {
    const header = 'image_url,title';
    const lines = articles.map(article => 
        `"${article.image_url}","${article.title.replace(/"/g, '""')}"`
    );
    return [header, ...lines].join('\n');
}

function removeDuplicates(articles) {
    const seen = new Set();
    const unique = [];
    
    for (const article of articles) {
        const key = article.title.toLowerCase().trim();
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(article);
        }
    }
    
    return unique;
}

async function main() {
    console.log('🔄 Starting data merge process...\n');
    
    // Check if files exist
    if (!fs.existsSync(EXISTING_FILE)) {
        console.error(`❌ Existing file not found: ${EXISTING_FILE}`);
        process.exit(1);
    }
    
    if (!fs.existsSync(NEW_FILE)) {
        console.error(`❌ New file not found: ${NEW_FILE}`);
        console.log('💡 Run the scraper first: node scripts/clickbait-scraper.js');
        process.exit(1);
    }
    
    // Read and parse files
    console.log('📖 Reading existing data...');
    const existingContent = fs.readFileSync(EXISTING_FILE, 'utf8');
    const { articles: existingArticles } = parseCSV(existingContent);
    console.log(`   Found ${existingArticles.length} existing articles`);
    
    console.log('📖 Reading new data...');
    const newContent = fs.readFileSync(NEW_FILE, 'utf8');
    const { articles: newArticles } = parseCSV(newContent);
    console.log(`   Found ${newArticles.length} new articles`);
    
    // Combine articles
    console.log('\n🔄 Merging data...');
    const allArticles = [...existingArticles, ...newArticles];
    console.log(`   Combined total: ${allArticles.length} articles`);
    
    // Remove duplicates
    console.log('🧹 Removing duplicates...');
    const uniqueArticles = removeDuplicates(allArticles);
    const duplicatesRemoved = allArticles.length - uniqueArticles.length;
    console.log(`   Removed ${duplicatesRemoved} duplicates`);
    console.log(`   Final count: ${uniqueArticles.length} unique articles`);
    
    // Save merged file
    console.log('\n💾 Saving merged data...');
    const mergedCSV = createCSV(uniqueArticles);
    fs.writeFileSync(MERGED_FILE, mergedCSV, 'utf8');
    console.log(`   Saved to: ${MERGED_FILE}`);
    
    // Create backup of original
    const backupFile = EXISTING_FILE.replace('.csv', '-backup.csv');
    if (!fs.existsSync(backupFile)) {
        fs.copyFileSync(EXISTING_FILE, backupFile);
        console.log(`   Created backup: ${backupFile}`);
    }
    
    console.log('\n✅ Merge completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Original articles: ${existingArticles.length}`);
    console.log(`   • New articles: ${newArticles.length}`);
    console.log(`   • Duplicates removed: ${duplicatesRemoved}`);
    console.log(`   • Final unique articles: ${uniqueArticles.length}`);
    console.log(`   • Growth: +${newArticles.length - duplicatesRemoved} articles`);
    
    console.log('\n💡 To use the merged data:');
    console.log(`   1. Replace ${EXISTING_FILE} with ${MERGED_FILE}`);
    console.log(`   2. Or update your code to use the merged file`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('💥 Merge failed:', error);
        process.exit(1);
    });
}