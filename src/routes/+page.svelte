<script>
	import { setContext } from "svelte";
	import { browser } from "$app/environment";
	import Meta from "$components/Meta.svelte";
	import ClickbaitVoter from "$components/ClickbaitVoter.svelte";
	import IntroStepper from "$components/IntroStepper.svelte";
	import copy from "$data/copy.json";
	import version from "$utils/version.js";
	import localStorage from '$utils/localStorage.js';

	let { data } = $props();

	version();

	let showIntro = $state(true);

	const preloadFont = [];

	const title = "ClickRank";
	const description = "Vote on clickbait articles and rank them by popularity";
	const url = "https://clickrank.example.com";
	const keywords = "clickbait, voting, ranking, articles";
	
	setContext("copy", copy);
	setContext("data", data);
	
	function handleIntroComplete(tinderVotes = []) {
		// Store tinder votes in localStorage
		if (browser && tinderVotes.length > 0) {
			const existingVotes = localStorage.get('clickbait-votes') || {};
			const newVotes = { ...existingVotes };
			
			tinderVotes.forEach(vote => {
				if (!newVotes[vote.articleIndex]) {
					newVotes[vote.articleIndex] = { upvotes: 0, downvotes: 0 };
				}
				
				if (vote.type === 'up') {
					newVotes[vote.articleIndex].upvotes += 1;
				} else {
					newVotes[vote.articleIndex].downvotes += 1;
				}
			});
			
			localStorage.set('clickbait-votes', newVotes);
		}
		
		showIntro = false;
	}
</script>

<Meta {title} {description} {url} {preloadFont} {keywords} />

{#if showIntro}
	<IntroStepper articles={data.articles} votes={data.votes} onComplete={handleIntroComplete} />
{:else}
	<ClickbaitVoter articles={data.articles} votes={data.votes} />
{/if}
