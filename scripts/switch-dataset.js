#!/usr/bin/env node

/**
 * Dataset Switcher
 * 
 * Easily switch between different datasets for the clickbait ranker
 * 
 * Usage: 
 *   node scripts/switch-dataset.js original    # Use original chum.csv
 *   node scripts/switch-dataset.js new        # Use new scraped data
 *   node scripts/switch-dataset.js merged     # Use merged dataset
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_FILE = path.join(__dirname, '..', 'src', 'routes', '+page.server.js');

const DATASETS = {
    original: 'chum.csv',
    new: 'new-clickbait.csv', 
    merged: 'chum-merged.csv'
};

function updateServerFile(datasetFile) {
    const serverContent = fs.readFileSync(SERVER_FILE, 'utf8');
    
    // Replace the CSV path line
    const updatedContent = serverContent.replace(
        /const csvPath = join\(process\.cwd\(\), 'static', 'assets', 'data', '[^']+'\);/,
        `const csvPath = join(process.cwd(), 'static', 'assets', 'data', '${datasetFile}');`
    );
    
    fs.writeFileSync(SERVER_FILE, updatedContent, 'utf8');
}

function main() {
    const dataset = process.argv[2];
    
    if (!dataset || !DATASETS[dataset]) {
        console.log('Usage: node scripts/switch-dataset.js <dataset>');
        console.log('');
        console.log('Available datasets:');
        Object.entries(DATASETS).forEach(([key, file]) => {
            const filePath = path.join(__dirname, '..', 'static', 'assets', 'data', file);
            const exists = fs.existsSync(filePath) ? '✅' : '❌';
            console.log(`  ${key.padEnd(10)} -> ${file} ${exists}`);
        });
        process.exit(1);
    }
    
    const datasetFile = DATASETS[dataset];
    const filePath = path.join(__dirname, '..', 'static', 'assets', 'data', datasetFile);
    
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Dataset file not found: ${filePath}`);
        process.exit(1);
    }
    
    updateServerFile(datasetFile);
    console.log(`✅ Switched to ${dataset} dataset (${datasetFile})`);
    console.log('🔄 Restart your dev server to see the changes');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}