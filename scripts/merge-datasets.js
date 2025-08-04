#!/usr/bin/env node

/**
 * Merge Daily Mail clickbait with original chum.csv data
 * Puts Daily Mail articles first in the list
 * 
 * Usage: node scripts/merge-datasets.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const originalDataPath = path.join(__dirname, '..', 'static', 'assets', 'data', 'chum.csv');
const dailyMailDataPath = path.join(__dirname, '..', 'static', 'assets', 'data', 'dailymail-clickbait.csv');
const outputPath = path.join(__dirname, '..', 'static', 'assets', 'data', 'combined-clickbait.csv');

function parseCSV(content) {
    const lines = content.trim().split('\n');
    const header = lines[0];
    const rows = lines.slice(1);
    
    return {
        header,
        rows: rows.map(row => {
            // Simple CSV parsing - handles quoted fields
            const fields = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                
                if (char === '"' && (i === 0 || row[i-1] === ',')) {
                    inQuotes = true;
                } else if (char === '"' && inQuotes && (i === row.length - 1 || row[i+1] === ',')) {
                    inQuotes = false;
                } else if (char === ',' && !inQuotes) {
                    fields.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            fields.push(current.trim());
            
            return {
                image_url: fields[0]?.replace(/^"|"$/g, '') || '',
                title: fields[1]?.replace(/^"|"$/g, '') || ''
            };
        })
    };
}

function sanitizeForCSV(text) {
    return text
        .replace(/"/g, '""')
        .replace(/[\r\n]/g, ' ')
        .trim();
}

function main() {
    console.log('🔄 Merging Daily Mail data with original dataset...\n');
    
    try {
        // Read original data
        console.log('📖 Reading original chum.csv data...');
        const originalContent = fs.readFileSync(originalDataPath, 'utf-8');
        const originalData = parseCSV(originalContent);
        console.log(`   ✅ Found ${originalData.rows.length} original articles`);
        
        // Read Daily Mail data
        console.log('📖 Reading Daily Mail data...');
        const dailyMailContent = fs.readFileSync(dailyMailDataPath, 'utf-8');
        const dailyMailData = parseCSV(dailyMailContent);
        console.log(`   ✅ Found ${dailyMailData.rows.length} Daily Mail articles`);
        
        // Combine data (Daily Mail first)
        console.log('\n🔗 Combining datasets...');
        const combinedRows = [...dailyMailData.rows, ...originalData.rows];
        
        // Remove duplicates based on title similarity
        console.log('🧹 Removing duplicates...');
        const seen = new Set();
        const uniqueRows = [];
        
        for (const row of combinedRows) {
            const normalizedTitle = row.title.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
                
            if (!seen.has(normalizedTitle) && normalizedTitle.length > 5) {
                seen.add(normalizedTitle);
                uniqueRows.push(row);
            }
        }
        
        const duplicatesRemoved = combinedRows.length - uniqueRows.length;
        console.log(`   📊 Removed ${duplicatesRemoved} duplicates`);
        
        // Create CSV content
        console.log('💾 Creating combined CSV...');
        const csvHeader = 'image_url,title\n';
        const csvContent = uniqueRows
            .map(row => `"${sanitizeForCSV(row.image_url)}","${sanitizeForCSV(row.title)}"`)
            .join('\n');
        
        const fullContent = csvHeader + csvContent;
        
        // Save combined file
        fs.writeFileSync(outputPath, fullContent, 'utf8');
        
        console.log(`\n✅ Successfully merged datasets!`);
        console.log(`📁 Combined data saved to: ${outputPath}`);
        console.log(`📊 Final stats:`);
        console.log(`   • Daily Mail articles: ${dailyMailData.rows.length} (at top)`);
        console.log(`   • Original articles: ${originalData.rows.length}`);
        console.log(`   • Total unique articles: ${uniqueRows.length}`);
        
        // Show sample Daily Mail titles that are now at the top
        console.log(`\n🎯 First 5 articles (Daily Mail clickbait):`);
        uniqueRows.slice(0, 5).forEach((row, i) => {
            console.log(`   ${i + 1}. "${row.title}"`);
        });
        
    } catch (error) {
        console.error('❌ Error merging datasets:', error.message);
        process.exit(1);
    }
}

// Run the merger
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}