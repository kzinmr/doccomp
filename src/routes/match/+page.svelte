<script lang="ts">
    import { diff_match_patch } from 'diff-match-patch';

    const dmp = new diff_match_patch();
    let text = `'Twas brillig, and the slithy toves
Did gyre and gimble in the wabe.
All mimsy were the borogroves,
And the mome raths outgrabe.`;
    let pattern = "slimy tools";
    let loc = 10;
    let distance = 1000;
    let threshold = "0.8";
    let elapsed = 0;
    let match: number | null = null;

    $: quote = match !== null ? text.substring(match, match + pattern.length) : "";
    $: maxtextspan = `(text is currently ${text.length} characters long)`;
    // document.getElementById('pattern').maxLength = dmp.Match_MaxBits;
    $: maxlengthspan = `(maxlength in this browser: ${dmp.Match_MaxBits})`;
    function handleSubmit() {
      dmp.Match_Distance = distance;
      dmp.Match_Threshold = parseFloat(threshold);
      const start = new Date().getTime();
      match = dmp.match_main(text, pattern, loc);
      elapsed = (new Date().getTime() - start);
    }
</script>

<body>
  <h1> Diff, Match and Patch </h1>
  <h2> Demo of Match </h2>
  <p>
    Matchは、より大きなテキストの中からパターンをファジーマッチで探します。<br>
    パターンにエラーが含まれていたり、テキストにあるものと正確に一致しなかったりしても、マッチを見つけることができます。<br>
    この実装では、マッチ位置の周辺を指定することもできます。<br>
    マッチ候補は、以下に基づいてスコア付けされ、マッチ距離パラメータは、これら2つのメトリクスの相対的な重要度を設定します。
    <li>a. パターンとテキスト間のスペルの違いの数</li>
    <li>b. マッチ候補と期待される位置との距離</li>
  </p>

  <form on:submit|preventDefault={handleSubmit}>
    <h3> Text: </h3>
    <textarea bind:value={text} rows=10 />
  
    <h3> Pattern: </h3>
    <p>
      <input bind:value={pattern} size=32 placeholder="enter pattern to match" /><span>{maxlengthspan}</span><br>
      テキスト内で検索する近似パターン。 Bitapアルゴリズムの制限により、パターンの長さには制限があります。
    </p>
        
    <h3>Location: </h3>
    <p>
      <input type="number" bind:value={loc} size=4 maxlength=10> <span>{maxtextspan}</span><br>
      そのパターンは、本文のおよそどの辺りにあると思われますか？
    </p>

    <h3>Distance: </h3>
    <p>
      <input type="number" bind:value={distance} size=3 maxlength=8> <br>
      ファジィ位置（上記で指定）にどの程度近づけなければならないかを決定します。
      ファジィ位置から `distance` 文字ぶん離れた文字が完全に一致した場合は、完全な不一致としてスコア付けされます。 
      距離'0'の場合、指定した位置に正確に一致する必要があり、
      閾値'1000'の場合、0.8のしきい値を使用してファジー位置から800文字以内の完全一致を検出する必要があります。
    </p>

    <h3>Match threshold: </h3>
    <p>
      <input type="text" bind:value={threshold} size=3 maxlength=5> <br>
      マッチアルゴリズムはどの時点であきらめるのか。
      しきい値「0.0」は（文字と場所の両方が）完全に一致することを要求し、
      しきい値「1.0」は何でも一致する。
    </p>
  
    <button type="submit"> Compute Match </button>
  </form>

  {#if match === -1}
    No match found.
  {:else if match !== null}
    <div id="outputdiv">
      Match found at character {match}: &nbsp;
      <code>{
        quote.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&para;')
      }</code>
    </div>
    <div>{(elapsed / 1000).toFixed(1)}s</div>
  {/if}
</body>

<style>
  textarea {
    width: 100%;
	height: 200px;
  }
</style>