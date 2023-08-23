<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { enhance } from '$app/forms';
  import type { ActionData, Snapshot } from './$types';
  import { marked } from 'marked';
  
  let query = "金額を比較してください"
  let text1 = `第４条（許諾された使用の対価）
甲が乙に許諾することに対して、乙は次の各号にしたがってその対価を支払う。
（１）本件商標及び本件著作物を使用する商品の税抜き希望小売価格の２５％を製造数量に乗じた金額を対価とする。
（２）前号の対価は、各年度の総額を各年度末から６０日以内に、乙から甲に対して支払うものとする。
`;
  let text2 = `第４条（許諾された使用の対価）
甲が乙に許諾することに対して、乙は次の各号にしたがってその対価を支払う。
（１）本件商標及び本件著作物を使用する商品の税抜き希望小売価格の３０％を製造数量に乗じた金額を対価とする。
（２）前号の対価は、各年度の総額を各年度末から４０日以内に、乙から甲に対して支払うものとする。
`;
  type compareMethod = "function_calling" | "concat";
  let comparison: compareMethod;
  $: ready = query.length > 0 && text1.length > 0 && text2.length > 0 && comparison;
  let formLoading = false;
  export let form: ActionData = null;

  export const snapshot: Snapshot = {
    capture: () => ({query, text1, text2}),
    restore: (values) => ({query, text1, text2} = values),
  };

  let element: HTMLDivElement;
  afterUpdate(() => {
    if (formLoading || form && form.answer !== undefined){
      scrollToBottom(element);
    }
  })
  const scrollToBottom = async (node: HTMLDivElement) => {
    node.scroll({ top: node.scrollHeight, behavior: 'smooth' });
  }
</script>

<header class="header">
  <title>Diff, Match and Patch; Compare</title>
  <nav>
    <ul class="header-links">
      <li><a href="/compare">Compare</a></li>
      <li><a href="/diff">Diff</a></li>
      <li><a href="/match">Match</a></li>
      <li><a href="/patch">Patch</a></li>
    </ul>
  </nav>
</header>
<body>
  <div bind:this={element} style="height:600px;overflow:auto;">
    <h1> Diff, Match and Patch; Compare </h1>
    <h2> Demo of Compare </h2>
    <p>
      Compareは2つの文書に対して、質問を受け取り、それぞれの文書の内容に照らし合わせた回答を返します。
    </p>

    <form method="POST" use:enhance={() => {
        formLoading = true; // instead of {#await} Loading ...
        return async ({ update }) => {
          formLoading = false;
          // See. https://github.com/sveltejs/kit/pull/7326
          update({ reset: false });
        };
    }}>
      <h3> Query Text: </h3>
      <textarea bind:value={query} id="query-textarea" name="query" />

      <table width="100%">
        <td width="50%">
          <h3> Text Version 1: </h3>
          <textarea bind:value={text1} rows=10 name="doc1" />
        </td>
        <td width="50%">
          <h3> Text Version 2: </h3>
          <textarea bind:value={text2} rows=10 name="doc2" />
        </td>
      </table>

      <h3>Comparison Mode:</h3>
      2文書の比較を行うにあたり、LLMへの問いかけ方を選択します。
      <dl>
          <dt>
          <label>
              <input type="radio" bind:group={comparison} name="comparison" value={"function_calling"} />
              Function Calling
          </label>
          </dt>
          <dd>
            各文書ごとに個別のベクターストア(Tools)を用意し、各々にFCとして問いかけた結果をaggregateして返す。
          </dd>
          <dt>
          <label>
              <input type="radio" bind:group={comparison} name="comparison" value={"concat"} />
              Concatenate and Complete
          </label>
          </dt>
          <dd>
            各文書を単一ベクターストアに格納し、単純なRAG QAとして問いかけた結果を返す。
          </dd>
      </dl>

      <button disabled={!ready} type="submit"> Submit </button>
    </form>

    {#if formLoading}
      Loading...
    {:else if form && form.answer !== undefined}
      <div id="outputdiv">{@html marked(form.answer)}</div>
      <div>Embed time: {(form.elapsed_embed / 1000).toFixed(1)}s</div>
      <div>Chain time: {(form.elapsed_chain / 1000).toFixed(1)}s</div>
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