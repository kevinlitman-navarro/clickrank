<script>
	import useWindowDimensions from '$runes/useWindowDimensions.svelte.js';
	
	let { articles = [], votes = {}, onComplete } = $props();
	
	// Filter featured articles (first 10)
	const featuredArticles = articles.filter(article => article.featured === 'TRUE');
	
	let currentIndex = $state(0);
	let cardElement = $state(null);
	let isDragging = $state(false);
	let startX = $state(0);
	let currentX = $state(0);
	let cardTransform = $state('');
	let cardRotation = $state(0);
	let cardOpacity = $state(1);
	
	const windowDimensions = new useWindowDimensions();
	const isMobile = $derived(windowDimensions.width <= 768);
	
	let userVotes = $state([]);
	
	function vote(articleIndex, type) {
		userVotes.push({
			articleIndex,
			type, // 'up' or 'down'
			article: featuredArticles[currentIndex]
		});
		
		nextCard();
	}
	
	function nextCard() {
		if (currentIndex < featuredArticles.length - 1) {
			currentIndex++;
			resetCard();
		} else {
			// All cards swiped, move to main voting interface
			onComplete(userVotes);
		}
	}
	
	function resetCard() {
		cardTransform = '';
		cardRotation = 0;
		cardOpacity = 1;
		isDragging = false;
		currentX = 0;
		startX = 0;
	}
	
	// Touch/Mouse event handlers for swipe
	function handleStart(e) {
		if (!isMobile) return;
		
		isDragging = true;
		startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
		currentX = startX;
	}
	
	function handleMove(e) {
		if (!isDragging || !isMobile) return;
		
		e.preventDefault();
		currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
		
		const deltaX = currentX - startX;
		const maxRotation = 15;
		const rotation = Math.max(-maxRotation, Math.min(maxRotation, deltaX * 0.1));
		const opacity = Math.max(0.5, 1 - Math.abs(deltaX) * 0.002);
		
		cardTransform = `translateX(${deltaX}px)`;
		cardRotation = rotation;
		cardOpacity = opacity;
	}
	
	function handleEnd() {
		if (!isDragging || !isMobile) return;
		
		const deltaX = currentX - startX;
		const threshold = 100;
		
		if (Math.abs(deltaX) > threshold) {
			// Swipe detected
			if (deltaX > 0) {
				// Right swipe (like)
				vote(featuredArticles[currentIndex].id, 'up');
			} else {
				// Left swipe (dislike)  
				vote(featuredArticles[currentIndex].id, 'down');
			}
		} else {
			// Snap back to center
			resetCard();
		}
		
		isDragging = false;
	}
	
	// Desktop button handlers
	function handleLike() {
		vote(featuredArticles[currentIndex].id, 'up');
	}
	
	function handleDislike() {
		vote(featuredArticles[currentIndex].id, 'down');
	}
	
	const currentArticle = $derived(featuredArticles[currentIndex]);
	const progress = $derived(((currentIndex + 1) / featuredArticles.length) * 100);
</script>

<div class="tinder-container">
	<div class="progress-bar">
		<div class="progress-fill" style="width: {progress}%"></div>
		<div class="progress-text">{currentIndex + 1} / {featuredArticles.length}</div>
	</div>
	
	<div class="main-instruction">
		<h2>Do you want to click on this?</h2>
	</div>
	
	{#if currentArticle}
		<div class="card-container">
			<div 
				class="card"
				bind:this={cardElement}
				style="transform: {cardTransform} rotate({cardRotation}deg); opacity: {cardOpacity};"
				onmousedown={handleStart}
				onmousemove={handleMove}
				onmouseup={handleEnd}
				onmouseleave={handleEnd}
				ontouchstart={handleStart}
				ontouchmove={handleMove}
				ontouchend={handleEnd}
				role="button"
				tabindex="0"
			>
				<div class="card-image">
					<img src={currentArticle.image_url} alt={currentArticle.title} />
				</div>
				<div class="card-info">
					<h2 class="card-title">{currentArticle.title}</h2>
				</div>
				
				{#if isMobile}
					<div class="swipe-indicators">
						<div class="swipe-indicator left" class:visible={currentX < startX - 50}>
							<span>NOPE</span>
						</div>
						<div class="swipe-indicator right" class:visible={currentX > startX + 50}>
							<span>LIKE</span>
						</div>
					</div>
				{/if}
			</div>
		</div>
		
		{#if !isMobile}
			<div class="desktop-controls">
				<button class="control-btn dislike" onclick={handleDislike}>
					<span class="icon">✕</span>
				</button>
				<button class="control-btn like" onclick={handleLike}>
					<span class="icon">✓</span>
				</button>
			</div>
		{/if}
		
		{#if isMobile}
			<div class="mobile-instructions">
				<p>Swipe right to like, left to pass</p>
			</div>
		{:else}
			<div class="desktop-instructions">
				<p>Click ✓ to like or ✕ to pass</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	* {
		box-sizing: border-box;
	}

	.tinder-container {
		width: 100%;
		min-height: 100vh;
		background: #000;
		color: #fff;
		font-family: 'Courier New', monospace;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem;
		gap: 2rem;
	}
	
	.progress-bar {
		position: relative;
		width: 100%;
		max-width: 400px;
		height: 8px;
		background: #333;
		border: 2px solid #fff;
	}
	
	.progress-fill {
		height: 100%;
		background: #fff;
		transition: width 0.3s ease;
	}
	
	.progress-text {
		position: absolute;
		top: -30px;
		right: 0;
		font-size: 0.9rem;
		font-weight: bold;
	}
	
	.main-instruction {
		text-align: center;
		margin: 1rem 0;
	}
	
	.main-instruction h2 {
		font-size: 1.5rem;
		font-weight: bold;
		margin: 0;
		color: #fff;
	}
	
	.card-container {
		position: relative;
		width: 100%;
		max-width: 400px;
		height: 600px;
		perspective: 1000px;
	}
	
	.card {
		position: relative;
		width: 100%;
		height: 100%;
		background: #fff;
		color: #000;
		border-radius: 20px;
		overflow: hidden;
		box-shadow: 0 10px 30px rgba(255, 255, 255, 0.3);
		cursor: grab;
		transition: transform 0.2s ease, opacity 0.2s ease;
		user-select: none;
	}
	
	.card:active {
		cursor: grabbing;
	}
	
	.card-image {
		width: 100%;
		height: 70%;
		position: relative;
		overflow: hidden;
	}
	
	.card-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	
	.card-info {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
		color: #fff;
		padding: 2rem 1.5rem 1.5rem;
	}
	
	.card-title {
		font-size: 1.4rem;
		font-weight: bold;
		margin: 0;
		line-height: 1.3;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
	}
	
	.swipe-indicators {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		pointer-events: none;
	}
	
	.swipe-indicator {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		padding: 1rem 2rem;
		border: 4px solid;
		border-radius: 10px;
		font-weight: bold;
		font-size: 2rem;
		opacity: 0;
		transition: opacity 0.2s ease;
	}
	
	.swipe-indicator.left {
		right: 20px;
		border-color: #ff4458;
		color: #ff4458;
		background: rgba(255, 68, 88, 0.1);
	}
	
	.swipe-indicator.right {
		left: 20px;
		border-color: #42ffa7;
		color: #42ffa7;
		background: rgba(66, 255, 167, 0.1);
	}
	
	.swipe-indicator.visible {
		opacity: 1;
	}
	
	.desktop-controls {
		display: flex;
		gap: 3rem;
		justify-content: center;
	}
	
	.control-btn {
		width: 80px;
		height: 80px;
		border: 4px solid;
		border-radius: 50%;
		background: #000;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s ease, background-color 0.2s ease;
	}
	
	.control-btn:hover {
		transform: scale(1.1);
	}
	
	.control-btn:active {
		transform: scale(0.95);
	}
	
	.control-btn.dislike {
		border-color: #ff4458;
		color: #ff4458;
	}
	
	.control-btn.dislike:hover {
		background: #ff4458;
		color: #fff;
	}
	
	.control-btn.like {
		border-color: #42ffa7;
		color: #42ffa7;
	}
	
	.control-btn.like:hover {
		background: #42ffa7;
		color: #000;
	}
	
	.control-btn .icon {
		font-size: 2.5rem;
		font-weight: bold;
	}
	
	.mobile-instructions,
	.desktop-instructions {
		text-align: center;
		opacity: 0.7;
		font-style: italic;
	}
	
	.mobile-instructions p,
	.desktop-instructions p {
		margin: 0;
		font-size: 1.1rem;
	}
	
	@media (max-width: 768px) {
		.tinder-container {
			padding: 1rem;
		}
		
		.card-container {
			height: 500px;
		}
		
		.card-title {
			font-size: 1.2rem;
		}
		
		.progress-text {
			font-size: 0.8rem;
		}
	}
</style>