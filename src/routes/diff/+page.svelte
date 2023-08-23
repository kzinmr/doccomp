<script lang="ts">
	import { onMount } from 'svelte';
	import { diff_match_patch } from 'diff-match-patch';
	import { marked } from 'marked';

	const dmp = new diff_match_patch();

	let text1 = '';
	let text2 = '';
	onMount(async () => {
		const response = await fetch('/sample.json');
		if (response.ok) {
			const data = await response.json();
			text1 = data.text1;
			text2 = data.text2;
		}
	});
	let timeout = 1;
	let editcost = 4;

	type cleanupMethod = 'semantic' | 'efficiency' | 'raw';
	let cleanup: cleanupMethod;
	$: ready = text1.length > 0 && text2.length > 0 && timeout >= 0 && editcost >= 3 && cleanup;
	let elapsed = 0;
	let ds: string | null = null;

	function handleSubmit() {
		dmp.Diff_Timeout = timeout;
		dmp.Diff_EditCost = editcost;

		const start = new Date().getTime();
		const d = dmp.diff_main(text1, text2);
		elapsed = new Date().getTime() - start;

		switch (cleanup) {
			case 'semantic':
				dmp.diff_cleanupSemantic(d);
				break;
			case 'efficiency':
				dmp.diff_cleanupEfficiency(d);
				break;
			default:
				break;
		}

		ds = dmp.diff_prettyHtml(d);
	}
</script>

<body>
	<h1>Diff, Match and Patch</h1>
	<h2>Demo of Diff</h2>
	<p>Diffは2つのテキストを受け取り、文字単位で動作し、相違点を見つけます。</p>

	<form on:submit|preventDefault={handleSubmit}>
		<table width="100%">
			<td width="50%">
				<h3>Text Version 1:</h3>
				<textarea bind:value={text1} rows="10" />
			</td>
			<td width="50%">
				<h3>Text Version 2:</h3>
				<textarea bind:value={text2} rows="10" />
			</td>
		</table>

		<h3>Diff timeout: <input type="number" bind:value={timeout} min="0" max="10" /></h3>

		<p>
			差分計算のマッピングフェーズにこれ以上の秒数分時間がかかる場合、計算を打ち切り局所最適解を出力する。タイムアウトを'0'にすると、計算を無制限に行うことができる。
		</p>

		<h3>Post-diff cleanup:</h3>
		Diffの結果には、些細な共通文字が含まれ、出力を複雑にしがちです。Diff後のクリーンアップ処理は、これを除外します。
		<dl>
			<dt>
				<label>
					<input type="radio" bind:group={cleanup} value={'semantic'} />
					Semantic Cleanup
				</label>
			</dt>
			<dd>偶然一致する共通点を除外することで、可読性を高める。</dd>
			<dt>
				<label>
					<input type="radio" bind:group={cleanup} value={'efficiency'} />
					Efficiency Cleanup
				</label>
				Edit Cost:
				<input type="number" bind:value={editcost} min="0" maxlength="5" />
			</dt>
			<dd>
				無視できる短い共通点をファクタリングして計算効率を上げる。Edit
				Costが大きいほど、クリーンアップを積極的に行う。
			</dd>
			<dt>
				<label>
					<input type="radio" bind:group={cleanup} value={'raw'} />
					No Cleanup
				</label>
			</dt>
			<dd>クリーンアップを行わない。</dd>
		</dl>

		<button disabled={!ready} type="submit"> Submit </button>
	</form>

	{#if ds !== null}
		<div id="outputdiv">{@html marked(ds)}</div>
		<div>{(elapsed / 1000).toFixed(1)}s</div>
	{/if}
</body>

<style>
	textarea {
		width: 100%;
		height: 200px;
	}
</style>
