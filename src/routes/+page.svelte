<script>
	import { setContext } from "svelte";
	import { browser } from "$app/environment";
	import Meta from "$components/Meta.svelte";
	import ClickbaitVoter from "$components/ClickbaitVoter.svelte";
	import copy from "$data/copy.json";
	import version from "$utils/version.js";

	let { data } = $props();

	version();

	const preloadFont = [];

	const title = "ClickRank";
	const description = "Vote on clickbait articles and rank them by popularity";
	const url = "https://clickrank.example.com";
	const keywords = "clickbait, voting, ranking, articles";
	
	setContext("copy", copy);
	setContext("data", data);
</script>

<Meta {title} {description} {url} {preloadFont} {keywords} />
<ClickbaitVoter articles={data.articles} votes={data.votes} />
