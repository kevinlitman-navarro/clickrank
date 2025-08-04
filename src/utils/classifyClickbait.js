const categories = {
	'Celebrity & Entertainment': {
		keywords: [
			'brad pitt', 'jennifer aniston', 'celebrity', 'star', 'actress', 'actor', 'hollywood',
			'britney', 'spears', 'ellen', 'oprah', 'kardashian', 'bieber', 'taylor swift',
			'leonardo dicaprio', 'movie', 'film', 'red carpet', 'oscar', 'emmy', 'grammy'
		],
		patterns: [
			/\[pics?\]\s*(actor|actress|celebrity)/i,
			/(actor|actress|celebrity).*posed/i,
			/famous.*look/i,
			/star.*now/i
		]
	},
	'Health & Wellness': {
		keywords: [
			'weight loss', 'lose weight', 'diet', 'health', 'doctor', 'medical', 'fitness',
			'nutrition', 'skincare', 'beauty', 'wellness', 'exercise', 'pounds', 'healthy',
			'dentist', 'dental', 'surgery', 'medicine', 'treatment', 'therapy'
		],
		patterns: [
			/\d+\s*pounds?/i,
			/weight.*loss/i,
			/nutritionist.*boils/i,
			/doctor.*says/i
		]
	},
	'Wealth & Luxury': {
		keywords: [
			'richest', 'billionaire', 'millionaire', 'expensive', 'luxury', 'mansion', 'yacht',
			'money', 'wealth', 'rich', 'fortune', 'cost', 'price', 'worth', 'bezos',
			'musk', 'gates', 'buffett', '$', 'million', 'billion'
		],
		patterns: [
			/\$\d+/,
			/richest.*man/i,
			/expensive.*yacht/i,
			/mansion.*worth/i
		]
	},
	'Royal Family': {
		keywords: [
			'royal', 'prince', 'princess', 'queen', 'king', 'meghan', 'harry', 'kate',
			'william', 'charles', 'diana', 'camilla', 'buckingham', 'windsor', 'monarchy'
		],
		patterns: [
			/prince.*harry/i,
			/meghan.*markle/i,
			/royal.*family/i,
			/diana.*butler/i
		]
	},
	'Nostalgia & Vintage': {
		keywords: [
			'vintage', 'old', 'then', 'now', 'years later', 'grown up', 'remember', 'past',
			'historical', 'retro', 'classic', 'former', 'was', 'used to be', 'ago'
		],
		patterns: [
			/\d+\s*years?\s*later/i,
			/then.*now/i,
			/all.*grown.*up/i,
			/remember.*when/i,
			/vintage.*photos/i
		]
	},
	'Lists & Rankings': {
		keywords: [
			'list', 'things', 'ways', 'rules', 'secrets', 'tips', 'tricks', 'facts'
		],
		patterns: [
			/^\d+/,
			/\[\d+\]/,
			/top\s*\d+/i,
			/\d+.*things/i,
			/\d+.*rules/i,
			/\d+.*ways/i
		]
	},
	'Local Services': {
		keywords: [
			'long beach', 'startup', 'local', 'near you', 'in your area', 'services',
			'lawyers', 'apartments', 'dating site', 'meal kit'
		],
		patterns: [
			/long beach/i,
			/startup.*changing/i,
			/dating site.*for/i
		]
	},
	'Home & Lifestyle': {
		keywords: [
			'home', 'house', 'kitchen', 'bathroom', 'decor', 'decorating', 'diy',
			'trick', 'hack', 'tip', 'hotel', 'travel', 'luggage', 'cleaning'
		],
		patterns: [
			/hotel.*trick/i,
			/home.*hack/i,
			/decor.*trend/i,
			/luggage.*bathtub/i
		]
	},
	'Technology & Shopping': {
		keywords: [
			'mac', 'apple', 'iphone', 'tech', 'computer', 'shopping', 'amazon',
			'costco', 'walmart', 'target', 'online', 'deal', 'sale', 'discount'
		],
		patterns: [
			/mac.*trick/i,
			/apple.*shopping/i,
			/shopping.*trick/i,
			/\d+.*mac.*users/i
		]
	},
	'Weird & Shocking': {
		keywords: [
			'weird', 'shocking', 'unbelievable', 'incredible', 'amazing', 'bizarre',
			'strange', 'mystery', 'secret', 'hidden', 'revealed', 'truth', 'exposed'
		],
		patterns: [
			/you.*won't.*believe/i,
			/shocking.*truth/i,
			/incredible.*discovery/i,
			/scientists.*spot/i
		]
	},
	'Animals & Nature': {
		keywords: [
			'dog', 'cat', 'animal', 'pet', 'wildlife', 'nature', 'birds', 'fish',
			'elephant', 'lion', 'tiger', 'bear', 'horse', 'puppy', 'kitten'
		],
		patterns: [
			/dog.*walker/i,
			/cat.*breed/i,
			/animal.*rescue/i
		]
	},
	'Pop Culture & Movies': {
		keywords: [
			'movie', 'film', 'tv show', 'series', 'netflix', 'disney', 'marvel',
			'star wars', 'friends', 'game of thrones', 'breaking bad', 'hollywood'
		],
		patterns: [
			/movie.*line/i,
			/tv.*show/i,
			/netflix.*series/i,
			/behind.*scenes/i
		]
	}
};

export function classifyClickbait(title) {
	if (!title || typeof title !== 'string') {
		return 'Other';
	}

	const lowerTitle = title.toLowerCase();
	
	// Check each category
	for (const [categoryName, categoryData] of Object.entries(categories)) {
		// Check keywords
		const hasKeyword = categoryData.keywords.some(keyword => 
			lowerTitle.includes(keyword.toLowerCase())
		);
		
		// Check patterns
		const hasPattern = categoryData.patterns.some(pattern => 
			pattern.test(title)
		);
		
		if (hasKeyword || hasPattern) {
			return categoryName;
		}
	}
	
	return 'Other';
}

export function getAllCategories() {
	return [...Object.keys(categories), 'Other'];
}