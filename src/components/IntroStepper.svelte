<script>
	import ClickbaitTinder from './ClickbaitTinder.svelte';
	
	let { articles = [], votes = {}, onComplete } = $props();
	
	let currentStep = $state(0);
	let tinderVotes = $state([]);
	let showThanks = $state(false);
	
	const steps = [
		{
			title: "Clickbait Tinder",
			content: null,
			isStart: true
		},
		{
			title: null,
			content: `I've always thought of clickbait as a craft particular to the internet. Because I'm strange, I find perverse joy in the attempt to trick me into clicking on something that is no doubt harmful to me in some way. (This is also what jury duty feels like.) The clickbait arms race to capture our most prurient interests has led to brilliant innovations in headline writing, such as 'weird tricks your doctor doesn't want you to know' and 'you won't believe how he aged' with a picture of, like, young JFK (you wouldn't believe it, because he didn't).

I've seen so many of these articles in what's known as the "chumbox" -- that section at the bottom of a news article where 6 or 8 or 20 of these pieces of clickbait live. When I encounter chum that really does capture my interest, I don't click on it, because:

<ol>
<li>I have impulse control</li>
<li>I know there isn't actually any information behind the click</li>
<li>I don't want to suffer whatever consequences may befall me from going to dietfadsthatwork.com or whatever</li>
</ol>

Part of my curiosity arises because the strange linguistic tics that we now recognize as clickbait came into being as a result of algorithmic pressures. While I can't imagine anyone actually clicking on "He got her this necklace, and two years later she found this inside", I'm assuming that the perpetrators of said clickbait must've found more success with this kind of headline. So here in this safe space, I'd like you to help me run a little experiment, gather some data, and maybe fall in love along the way. Let's get swiping.`,
			isExplanation: true
		},
		{
			title: null,
			content: null,
			showTinder: true
		},
		{
			title: null,
			content: "Thank you for your service, please proceed to vote on 10,000 pieces of clickbait",
			isThanks: true
		}
	];
	
	function nextStep() {
		if (steps[currentStep].showTinder) {
			// Don't advance yet, wait for tinder completion
			return;
		} else if (steps[currentStep].isThanks) {
			// Complete the intro flow
			onComplete(tinderVotes);
		} else if (currentStep < steps.length - 1) {
			currentStep++;
		}
	}
	
	function handleTinderComplete(votes) {
		tinderVotes = votes;
		showThanks = true;
		currentStep = 3; // Move to thanks step (now at index 3)
	}
</script>

{#if steps[currentStep].showTinder}
	<ClickbaitTinder {articles} {votes} onComplete={handleTinderComplete} />
{:else}
	<div class="stepper-container">
		<div class="step">
			{#if steps[currentStep].isStart}
				<div class="start-step">
					<h1 class="title">{steps[currentStep].title}</h1>
					<p class="instruction">Click to move ahead</p>
				</div>
			{:else if steps[currentStep].isThanks}
				<div class="thanks-step">
					<h2 class="thanks-title">{steps[currentStep].content}</h2>
					<p class="instruction">Time to rank some clickbait!</p>
				</div>
			{:else if steps[currentStep].isExplanation}
				<div class="content-step">
					<div class="content">
						{@html steps[currentStep].content}
					</div>
					<p class="instruction">Ready to start?</p>
				</div>
			{:else}
				<div class="content-step">
					<div class="content">
						<p>{steps[currentStep].content}</p>
					</div>
					<p class="instruction">Ready to start?</p>
				</div>
			{/if}
			
			<button class="next-button" onclick={nextStep}>
				{#if steps[currentStep].isStart}
					→
				{:else if steps[currentStep].isThanks}
					Begin Ranking
				{:else if steps[currentStep].isExplanation}
					Let's Go!
				{:else}
					Continue
				{/if}
			</button>
		</div>
	</div>
{/if}

<style>
	* {
		box-sizing: border-box;
	}

	.stepper-container {
		width: 100%;
		min-height: 100vh;
		background: #000;
		color: #fff;
		font-family: 'Courier New', monospace;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}
	
	.step {
		max-width: 800px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3rem;
	}
	
	.start-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
	}
	
	.thanks-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		text-align: center;
	}
	
	.thanks-title {
		font-size: 2.5rem;
		font-weight: bold;
		margin: 0;
		letter-spacing: 0.05em;
		border: 4px solid #fff;
		padding: 2rem;
		text-align: center;
		line-height: 1.3;
	}
	
	.title {
		font-size: 4rem;
		font-weight: bold;
		margin: 0;
		letter-spacing: 0.1em;
		border: 4px solid #fff;
		padding: 2rem;
		text-align: center;
	}
	
	.content-step {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	
	.content {
		border: 2px solid #fff;
		padding: 2rem;
		text-align: left;
	}
	
	.content p {
		font-size: 1.2rem;
		line-height: 1.6;
		margin: 0 0 1.5rem 0;
	}
	
	.content p:last-child {
		margin-bottom: 0;
	}
	
	.content ol {
		font-size: 1.2rem;
		line-height: 1.6;
		margin: 1.5rem 0;
		padding-left: 2rem;
	}
	
	.content li {
		margin: 0.5rem 0;
		font-weight: normal;
	}
	
	.instruction {
		font-size: 1.1rem;
		margin: 0;
		opacity: 0.8;
		font-style: italic;
	}
	
	.next-button {
		background: #000;
		color: #fff;
		border: 2px solid #fff;
		padding: 1rem 2rem;
		font-family: 'Courier New', monospace;
		font-size: 1.2rem;
		font-weight: bold;
		cursor: pointer;
		transition: none;
		min-width: 150px;
	}
	
	.next-button:hover {
		background: #fff;
		color: #000;
	}
	
	@media (max-width: 768px) {
		.stepper-container {
			padding: 1rem;
		}
		
		.title {
			font-size: 2.5rem;
			padding: 1rem;
		}
		
		.thanks-title {
			font-size: 1.8rem;
			padding: 1.5rem;
		}
		
		.content {
			padding: 1.5rem;
		}
		
		.content p {
			font-size: 1rem;
		}
		
		.content ol {
			font-size: 1rem;
			padding-left: 1.5rem;
		}
		
		.instruction {
			font-size: 1rem;
		}
		
		.next-button {
			font-size: 1rem;
			padding: 0.75rem 1.5rem;
		}
	}
</style>