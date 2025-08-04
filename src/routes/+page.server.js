import { csvParse } from 'd3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { classifyClickbait } from '$utils/classifyClickbait.js';
import votesData from '$data/votes.json';

export async function load() {
	// Use the original Outbrain dataset
	const csvPath = join(process.cwd(), 'static', 'assets', 'data', 'chum.csv');
	const csvContent = readFileSync(csvPath, 'utf-8');
	const rawArticles = csvParse(csvContent);
	
	// Add categories to articles
	const articles = rawArticles.map((article, index) => ({
		...article,
		id: index,
		category: classifyClickbait(article.title)
	}));
	
	return {
		articles,
		votes: votesData
	};
}
