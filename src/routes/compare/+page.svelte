<script lang="ts">
  import { afterUpdate, onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import type { ActionData, Snapshot } from './$types';
  import { marked } from 'marked';

  let query = '金額を比較してください';
  let text1 = '';
  let text2 = '';

  export const snapshot: Snapshot = {
    capture: () => ({ query, text1, text2 }),
    restore: (values) => ({ query, text1, text2 } = values)
  };

  onMount(async () => {
    const response = await fetch('/sample.json');
    if (response.ok && text1.length === 0 && text2.length === 0) {
      const data = await response.json();
      text1 = data.text1;
      text2 = data.text2;
    }
  });
  type compareMethod = 'function_calling' | 'concat';
  let comparison: compareMethod;
  $: ready = query.length > 0 && text1.length > 0 && text2.length > 0 && comparison;
  let formLoading = false;
  export let form: ActionData = null;

  let element: HTMLDivElement;
  afterUpdate(() => {
    if (formLoading || (form && form.answer !== undefined)) {
      scrollToBottom(element);
    }
  });
  const scrollToBottom = async (node: HTMLDivElement) => {
    node.scroll({ top: node.scrollHeight, behavior: 'smooth' });
  };
</script>

<body>
  <div bind:this={element} style="height:600px;overflow:auto;">
    <h1>Diff, Match and Patch; Compare</h1>
    <h2>Demo of Compare</h2>
    <p>
      Compareは2つの文書に対して、質問を受け取り、それぞれの文書の内容に照らし合わせた回答を返します。
    </p>

    <form
      method="POST"
      use:enhance={() => {
        formLoading = true; // instead of {#await} Loading ...
        return async ({ update }) => {
          formLoading = false;
          // See. https://github.com/sveltejs/kit/pull/7326
          update({ reset: false });
        };
      }}
    >
      <h3>Query Text:</h3>
      <textarea bind:value={query} id="query-textarea" name="query" />

      <table width="100%">
        <td width="50%">
          <h3>Text Version 1:</h3>
          <textarea bind:value={text1} rows="10" name="doc1" />
        </td>
        <td width="50%">
          <h3>Text Version 2:</h3>
          <textarea bind:value={text2} rows="10" name="doc2" />
        </td>
      </table>

      <h3>Comparison Mode:</h3>
      2文書の比較を行うにあたり、LLMへの問いかけ方を選択します。
      <dl>
        <dt>
          <label>
            <input
              type="radio"
              bind:group={comparison}
              name="comparison"
              value={'function_calling'}
            />
            Function Calling
          </label>
        </dt>
        <dd>
          各文書ごとに個別のベクターストア(Tools)を用意し、各々にFunction
          Callingとして問いかけた結果をAgentがまとめて返す。
        </dd>
        <dt>
          <label>
            <input type="radio" bind:group={comparison} name="comparison" value={'concat'} />
            Simple RetrievalQAChain
          </label>
        </dt>
        <dd>
          各文書を単一ベクターストアに格納し、単純なRAG QAとして問いかけた結果を返す。
          具体的には、質問に類似関連する文書チャンクを質問プロンプトにそのまま追加で詰めて投げる(stuff
          chaining)。
        </dd>
      </dl>

      <button disabled={!ready} type="submit"> Submit </button>
    </form>

    {#if formLoading}
      Loading...
    {:else if form && form.answer !== undefined}
      <div id="outputdiv">{@html marked(form.answer)}</div>
      <div>Model name: {form.model_name}</div>
      <div>Embed time: {(form.elapsed_embed / 1000).toFixed(1)}s</div>
      <div>Chain time: {(form.elapsed_chain / 1000).toFixed(1)}s</div>
      <div>Intermediate Steps:</div>
      {#each form.steps as step}
        <p>{step.action_log} → {step.observation}</p>
      {/each}
    {/if}
  </div>
</body>

<style>
  textarea {
    width: 99%;
    height: 200px;
  }
  #query-textarea {
    width: 50%;
    height: 100px;
  }
</style>
