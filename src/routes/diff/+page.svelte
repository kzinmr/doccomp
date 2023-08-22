<script lang="ts">
    import { diff_match_patch } from 'diff-match-patch';
    import { marked } from 'marked';

    const dmp = new diff_match_patch();
    let text1 = `第２条（秘密の報告及び帰属）
①秘密情報について、その創出または得喪に関わった場合には直ちに貴社に報告致します。
②秘密情報については、私がその秘密の形成、創出に関わった場合であっても、貴社業務上作成したものであることを確認し、当該秘密の帰属が貴社にあることを確認致します。また当該秘密情報について私に帰属する一切の権利を貴社に譲渡し、その権利が私に帰属する旨の主張を致しません。`;
    let text2 = `第 2 条(機密保持)
1. 私は、貴社の在籍前、在籍中及び貴社を退職した以降も、貴社(子会社及び関連会社を含む。)に関する一切の情報及びその業務の過程で知り得た一切の情報 (以下、「機密情報」という。)について、貴社の事前の書面による承諾がない 限り、貴社の従業員としての職務の履行以外の目的に一切利用せず、これを 第三者に開示、漏洩又は利用することは一切しません。
2. 私は、会社の業務に従事する間に取り扱った機密情報を、貴社の事前の承諾がな い限り複製又は複写しません。私が、貴社の承諾を得て機密情報を複製又は複写 した場合、その目的を達した後は貴社の指示に従い、返還又は消去致します。
3. 私は、会社を退職することになった場合、その時点で私が管理又は保有している一切の機密情報及び機密情報が記録されている記録媒体(その複製物も含む。)を退職時 までに会社に返還又は削除し、返還後は私のアクセス可能な範囲に機密情報及び記録媒体を一切残存させないことを誓います。
`;
    let timeout = 1;
    let editcost = 4;

    type cleanupMethod = "semantic" | "efficiency" | "raw";
    let cleanup: cleanupMethod;
    $: ready = text1.length > 0 && text2.length > 0 && timeout >= 0 && editcost >= 3 && cleanup;
    let elapsed = 0;
    let ds: string | null = null;

    function handleSubmit() {
      dmp.Diff_Timeout = timeout;
      dmp.Diff_EditCost = editcost;

      const start = new Date().getTime();
      const d = dmp.diff_main(text1, text2);
      elapsed = (new Date().getTime() - start);

      switch (cleanup) {
      case "semantic":
        dmp.diff_cleanupSemantic(d);
        break;
      case "efficiency":
        dmp.diff_cleanupEfficiency(d);
        break;
      default:
        break;
      }

      ds = dmp.diff_prettyHtml(d);
    }

</script>

<header class="header">
  <title>Diff, Match and Patch</title>
  <nav>
    <ul class="header-links">
      <li><a href="/diff">Diff</a></li>
      <li><a href="/match">Match</a></li>
      <li><a href="/patch">Patch</a></li>
    </ul>
  </nav>
</header>

<body>
  <h1> Diff, Match and Patch </h1>
  <h2> Demo of Diff </h2>
  <p>
    Diffは2つのテキストを受け取り、文字単位で動作し、相違点を見つけます。
  </p>

  <form on:submit|preventDefault={handleSubmit}>

    <table width="100%">
      <td width="50%">
        <h3> Text Version 1: </h3>
        <textarea bind:value={text1} rows=10 />
      </td>
      <td width="50%">
        <h3> Text Version 2: </h3>
        <textarea bind:value={text2} rows=10 />
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
            <input type="radio" bind:group={cleanup} value={"semantic"} />
            Semantic Cleanup
        </label>
        </dt>
        <dd>
          偶然一致する共通点を除外することで、可読性を高める。
        </dd>
        <dt>
        <label>
            <input type="radio" bind:group={cleanup} value={"efficiency"} />
            Efficiency Cleanup
        </label>
        Edit Cost:
        <input type="number" bind:value={editcost} min="0" maxlength="5" />
        </dt>
        <dd>
          無視できる短い共通点をファクタリングして計算効率を上げる。Edit Costが大きいほど、クリーンアップを積極的に行う。
        </dd>
        <dt>
        <label>
            <input type="radio" bind:group={cleanup} value={"raw"} />
            No Cleanup
        </label>
        </dt>
        <dd>
        クリーンアップを行わない。
        </dd>
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