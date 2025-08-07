<script>
	import localStorage from '$utils/localStorage.js';
	import { getAllCategories } from '$utils/classifyClickbait.js';
	
	let { articles = [], votes = {} } = $props();
	
	// Use server-provided votes data directly to prevent hydration issues
	let votesStore = $state(votes);
	
	// Only check localStorage after component mounts to avoid hydration mismatch
	$effect(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.get('clickbait-votes');
			if (saved) {
				// Merge saved votes with server votes
				votesStore = { ...votes, ...saved };
			}
		}
	});
	
	let selectedCategories = $state(new Set(['All']));
	let sortOrder = $state('highest');
	
	const allCategories = getAllCategories();
	const categoriesWithAll = ['All', ...allCategories];
	
	const sortOptions = [
		{ value: 'highest', label: 'HIGHEST SCORE' },
		{ value: 'lowest', label: 'LOWEST SCORE' },
		{ value: 'polarizing', label: 'MOST POLARIZING' },
		{ value: 'random', label: 'RANDOM' }
	];
	
	function vote(index, type) {
		// Create a new object to trigger reactivity
		const newVotesStore = { ...votesStore };
		
		if (!newVotesStore[index]) {
			newVotesStore[index] = { upvotes: 0, downvotes: 0 };
		}
		
		if (type === 'up') {
			newVotesStore[index].upvotes += 1;
		} else {
			newVotesStore[index].downvotes += 1;
		}
		
		votesStore = newVotesStore;
		localStorage.set('clickbait-votes', votesStore);
	}
	
	function getScore(index) {
		const votes = votesStore?.[index];
		if (!votes) return 0;
		return (votes.upvotes || 0) - (votes.downvotes || 0);
	}
	
	function getTotalVotes(index) {
		const votes = votesStore?.[index];
		if (!votes) return 0;
		return (votes.upvotes || 0) + (votes.downvotes || 0);
	}
	
	function toggleCategory(category) {
		const newSelected = new Set(selectedCategories);
		
		if (category === 'All') {
			if (newSelected.has('All')) {
				newSelected.clear();
			} else {
				newSelected.clear();
				newSelected.add('All');
			}
		} else {
			newSelected.delete('All');
			if (newSelected.has(category)) {
				newSelected.delete(category);
			} else {
				newSelected.add(category);
			}
			
			// If no categories selected, default to All
			if (newSelected.size === 0) {
				newSelected.add('All');
			}
		}
		
		selectedCategories = newSelected;
	}
	
	let filteredArticles = $derived(
		articles.filter(article => {
			if (selectedCategories.has('All')) return true;
			return selectedCategories.has(article.category);
		})
	);
	
	// Deterministic random sort based on article IDs to prevent hydration issues
	function deterministicRandomSort(articles) {
		return articles.sort((a, b) => {
			// Use article IDs to create a consistent "random" order
			const hashA = (a.originalIndex * 17 + 23) % 1000;
			const hashB = (b.originalIndex * 17 + 23) % 1000;
			return hashA - hashB;
		});
	}
	
	let sortedArticles = $derived(
		(() => {
			const articlesWithIndex = filteredArticles
				.map((article, index) => ({ ...article, originalIndex: article.id || index }));
			
			switch (sortOrder) {
				case 'highest':
					return articlesWithIndex.sort((a, b) => getScore(b.originalIndex) - getScore(a.originalIndex));
				case 'lowest':
					return articlesWithIndex.sort((a, b) => getScore(a.originalIndex) - getScore(b.originalIndex));
				case 'polarizing':
					return articlesWithIndex.sort((a, b) => getTotalVotes(b.originalIndex) - getTotalVotes(a.originalIndex));
				case 'random':
					return deterministicRandomSort(articlesWithIndex);
				default:
					return articlesWithIndex;
			}
		})()
	);
	
	function getCategoryCount(category) {
		if (category === 'All') return articles.length;
		return articles.filter(article => article.category === category).length;
	}
</script>

<div class="container">
	<h1>CLICKRANK</h1>
	
	<div class="controls">
		<div class="filters">
			{#each categoriesWithAll as category}
				<button
					class="filter"
					class:active={selectedCategories.has(category)}
					onclick={() => toggleCategory(category)}
				>
					{category.toUpperCase()} ({getCategoryCount(category)})
				</button>
			{/each}
		</div>
		
		<div class="sort-controls">
			<div class="sort-label">SORT BY:</div>
			<div class="sort-buttons">
				{#each sortOptions as option}
					<button
						class="sort-btn"
						class:active={sortOrder === option.value}
						onclick={() => sortOrder = option.value}
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>
	</div>
	
	<div class="articles">
		{#each sortedArticles as article, displayIndex}
			<div class="article">
				<div class="rank">{displayIndex + 1}</div>
				<div class="thumbnail">
					<img src={article.image_url} alt={article.title} loading="lazy" />
				</div>
				<div class="title">{article.title}</div>
				<div class="votes">
					<button
						class="vote up"
						onclick={() => vote(article.originalIndex, 'up')}
					>
						▲ {votesStore[article.originalIndex]?.upvotes || 0}
					</button>
					<div class="score">{getScore(article.originalIndex)}</div>
					<button
						class="vote down"
						onclick={() => vote(article.originalIndex, 'down')}
					>
						▼ {votesStore[article.originalIndex]?.downvotes || 0}
					</button>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	* {
		box-sizing: border-box;
	}

	.container {
		width: 100%;
		padding: 2rem;
		font-family: 'Courier New', monospace;
		background: #000;
		color: #fff;
		min-height: 100vh;
	}
	
	h1 {
		font-size: 3rem;
		font-weight: bold;
		margin: 0 0 2rem 0;
		text-align: center;
		letter-spacing: 0.1em;
		border: 4px solid #fff;
		padding: 1rem;
	}
	
	.controls {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 3rem;
	}
	
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0;
		border: 2px solid #fff;
	}
	
	.sort-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		border: 2px solid #fff;
		padding: 1rem;
	}
	
	.sort-label {
		font-weight: bold;
		font-size: 1rem;
		flex-shrink: 0;
	}
	
	.sort-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0;
		flex: 1;
	}
	
	.sort-btn {
		background: #000;
		color: #fff;
		border: 1px solid #fff;
		padding: 0.75rem 1rem;
		font-family: 'Courier New', monospace;
		font-size: 0.9rem;
		font-weight: bold;
		cursor: pointer;
		flex: 1;
		min-width: 120px;
		text-align: center;
		transition: none;
	}
	
	.sort-btn:hover {
		background: #fff;
		color: #000;
	}
	
	.sort-btn.active {
		background: #fff;
		color: #000;
	}
	
	.filter {
		background: #000;
		color: #fff;
		border: 1px solid #fff;
		padding: 1rem;
		font-family: 'Courier New', monospace;
		font-size: 0.9rem;
		font-weight: bold;
		cursor: pointer;
		flex: 1;
		min-width: 120px;
		text-align: center;
		transition: none;
	}
	
	.filter:hover {
		background: #fff;
		color: #000;
	}
	
	.filter.active {
		background: #fff;
		color: #000;
	}
	
	.articles {
		display: flex;
		flex-direction: column;
		gap: 0;
		border: 2px solid #fff;
	}
	
	.article {
		display: grid;
		grid-template-columns: 60px 280px 1fr 200px;
		align-items: center;
		border-bottom: 1px solid #fff;
		padding: 1rem;
		background: #000;
		gap: 1rem;
	}
	
	.article:last-child {
		border-bottom: none;
	}
	
	.article:hover {
		background: #111;
	}
	
	.rank {
		font-size: 1.5rem;
		font-weight: bold;
		text-align: center;
	}
	
	.thumbnail {
		width: 280px;
		height: 180px;
		border: 2px solid #fff;
	}
	
	.thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	
	.title {
		font-size: 1.3rem;
		line-height: 1.4;
		font-weight: bold;
	}
	
	.votes {
		display: flex;
		align-items: center;
		gap: 1rem;
		justify-content: center;
	}
	
	.vote {
		background: #000;
		color: #fff;
		border: 1px solid #fff;
		padding: 0.5rem;
		font-family: 'Courier New', monospace;
		font-size: 0.9rem;
		font-weight: bold;
		cursor: pointer;
		width: 50px;
		text-align: center;
	}
	
	.vote:hover {
		background: #fff;
		color: #000;
	}
	
	.score {
		font-size: 1.2rem;
		font-weight: bold;
		min-width: 40px;
		text-align: center;
	}
	
	@media (max-width: 768px) {
		.container {
			padding: 0.5rem;
		}
		
		h1 {
			font-size: 1.8rem;
			padding: 0.5rem;
			margin-bottom: 1rem;
		}
		
		.controls {
			gap: 0.5rem;
			margin-bottom: 1.5rem;
		}
		
		.filters {
			flex-direction: column;
		}
		
		.filter {
			padding: 0.75rem;
			font-size: 0.8rem;
			min-width: auto;
		}
		
		.sort-controls {
			padding: 0.75rem;
			gap: 0.5rem;
			flex-direction: column;
			align-items: stretch;
		}
		
		.sort-label {
			font-size: 0.9rem;
			text-align: center;
		}
		
		.sort-buttons {
			flex-direction: column;
			gap: 0;
		}
		
		.sort-btn {
			font-size: 0.8rem;
			padding: 0.75rem;
			min-width: auto;
		}
		
		.article {
			display: flex;
			flex-direction: column;
			padding: 1rem;
			gap: 1rem;
			align-items: stretch;
		}
		
		.rank {
			font-size: 1.5rem;
			text-align: center;
			order: 1;
		}
		
		.thumbnail {
			width: 100%;
			height: 200px;
			order: 2;
		}
		
		.title {
			font-size: 1rem;
			line-height: 1.3;
			text-align: center;
			order: 3;
		}
		
		.votes {
			gap: 1rem;
			justify-content: center;
			order: 4;
		}
		
		.vote {
			width: 60px;
			padding: 0.75rem 0.5rem;
			font-size: 0.9rem;
		}
		
		.score {
			font-size: 1.2rem;
			min-width: 50px;
		}
	}
</style>