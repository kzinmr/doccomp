<script lang="ts">
  import { diff_match_patch } from 'diff-match-patch';
  import { marked } from 'marked';

  const dmp = new diff_match_patch();

  let new_text = `Hamlet: Do you see yonder cloud that's almost in shape of a camel?
Polonius: By the mass, and 'tis like a camel, indeed.
Hamlet: Methinks it is like a weasel.
Polonius: It is backed like a weasel.
Hamlet: Or like a whale?
Polonius: Very like a whale.
-- Shakespeare`;
  let old_text = `Hamlet: Do you see the cloud over there that's almost the shape of a camel?
Polonius: By golly, it is like a camel, indeed.
Hamlet: I think it looks like a weasel.
Polonius: It is shaped like a weasel.
Hamlet: Or like a whale?
Polonius: It's totally like a whale.
-- Shakespeare`;
  let old_text_target = `Kirk: Do you see yonder cloud that's almost in shape of a Klingon?
Spock: By the mass, and 'tis like a Klingon, indeed.
Kirk: Methinks it is like a Vulcan.
Spock: It is backed like a Vulcan.
Kirk: Or like a Romulan?
Spock: Very like a Romulan.
-- Trekkie`;
  let new_text_target = '';
  let diff = '';
  let patch_list;
  let patch_text = '';
  let patched = false;
  let results;
  let html = '';
  let elapsed_diff = 0;
  let elapsed_patch = 0;

  function diff_launch() {
    const start = new Date().getTime();
    diff = dmp.diff_main(new_text, old_text, true);
    elapsed_diff = new Date().getTime() - start;
    if (diff.length > 2) {
      dmp.diff_cleanupSemantic(diff);
    }
    patch_list = dmp.patch_make(new_text, old_text, diff);
    patch_text = dmp.patch_toText(patch_list);
    patched = true;
  }
  function patch_launch() {
    const patches = dmp.patch_fromText(patch_text);
    const start = new Date().getTime();
    results = dmp.patch_apply(patches, old_text_target);
    elapsed_patch = new Date().getTime() - start;
    new_text_target = results[0];
    results = results[1];
    for (const result of results) {
      if (result) {
        html += '<li><font color="#009900">Ok</font>';
      } else {
        html += '<li><font color="#990000">Fail</font>';
      }
    }
  }
</script>

<h1>Diff, Match and Patch</h1>
<h2>Demo of Patch</h2>
<p>
  2つのテキストを互いに差分し、パッチのリストを生成することができる。
  そしてこれらのパッチを第三のテキストに対して適用することができる。
  第三のテキストにそれ自身の編集がある場合、このバージョンのパッチはベストエフォートで変更を適用し、どのパッチが成功し、どのパッチが失敗したかを報告する。
</p>
<p>
  このシナリオでは、シェイクスピアは原典である近世英語で『ハムレット』を書いた。
  その後、2つの派生作品が作られた。 ひとつは現代英語にアップデートされた『ハムレット』。
  もう一つは近世英語で書かれたスタートレックのパロディである。
  このデモンストレーションでは、原典と現代英語版の間のパッチのリストを作成する。
  そして、それらのパッチをスタートレックのパロディに適用し、現代英語のスタートレックのパロディを作成する。
</p>

<form on:submit|preventDefault={diff_launch}>
  <h3>Shakespeare's copy:</h3>
  <table width="100%">
    <td width="50%"
      >Old Version:<br />
      <textarea bind:value={new_text} rows="10" />
    </td>
    <td width="50%"
      >New Version:<br />
      <textarea bind:value={old_text} rows="10" />
    </td>
  </table>
  <p>
    <button type="submit"> Compute Patch </button>
  </p>
  {#if patch_text.length > 0}
    <blockquote>
      <div id="diffoutputdiv">
        {@html marked(`<fieldset><legend>Patch:</legend><pre>${patch_text}</pre></fieldset>`)}
      </div>
    </blockquote>
    <div id="diffdatediv">{(elapsed_diff / 1000).toFixed(3)}s</div>
  {/if}
</form>
<form on:submit|preventDefault={patch_launch}>
  <h3>Trekkie's copy:</h3>
  <table width="100%">
    <tr>
      <td width="50%"
        >Old Version:<br />
        <textarea bind:value={old_text_target} rows="10" />
      </td>
      <td width="50%"
        >New Version:<br />
        <textarea bind:value={new_text_target} rows="10" />
      </td>
    </tr>
  </table>
  <p>
    <button disabled={!patched}> Apply Patch </button>
  </p>
</form>
{#if html.length > 0}
  <ol id="passfaildiv">{@html marked(html)}</ol>
  <div id="patchdatediv">{(elapsed_patch / 1000).toFixed(3)}s</div>
{/if}

<style>
  textarea {
    width: 100%;
    height: 200px;
  }
</style>
