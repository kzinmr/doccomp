import { fail } from '@sveltejs/kit';
import type { Actions, RequestEvent } from '@sveltejs/kit';
import { OPENAI_API_KEY } from "$env/static/private";
import getNTokens from '$lib/utils/tokenizer';
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAI } from "langchain/llms/openai";
import { RetrievalQAChain } from "langchain/chains";
import { Document } from "langchain/document";

export const actions: Actions = {
  default: async (event: RequestEvent) => {
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY env variable not set');
      }
      const openaikey = OPENAI_API_KEY;

      let tokenCount = 0;
      const data = await event.request.formData();
      const question = data.get('question')?.toString() ?? "";
      tokenCount += getNTokens(question);
      const text1: string = data.get('doc1')?.toString() ?? "";
      tokenCount += getNTokens(text1);
      const text2: string = data.get('doc2')?.toString() ?? "";
      tokenCount += getNTokens(text2);
      if (tokenCount > 16000) {
        console.error("Too many tokens", tokenCount);
        throw new Error('Too many tokens');
      }
      const comparison = data.get('comparison')?.toString() ?? "";
      if (comparison === "concat") {
        const doc1 = new Document({ pageContent: text1, metadata: { source: "1" } });
        const doc2 = new Document({ pageContent: text2, metadata: { source: "2" } });
        const docs: Document[] = [doc1, doc2];
        try {
          const start_embed = new Date().getTime();
          const embeddings = new OpenAIEmbeddings({ openAIApiKey: openaikey});
          const store = await MemoryVectorStore.fromDocuments(docs, embeddings);
          const elapsed_embed = (new Date().getTime() - start_embed);
          try {
            const start_chain = new Date().getTime();
            const model = new OpenAI({ openAIApiKey: openaikey});
            const chain = RetrievalQAChain.fromLLM(model, store.asRetriever());
            const res = await chain.call({
              query: question,
            });
            const elapsed_chain = (new Date().getTime() - start_chain);
            const answer: string = res.text;
            return {
              answer: answer,
              elapsed_embed: elapsed_embed,
              elapsed_chain: elapsed_chain,
            }
          } catch(e) {
            console.error(e);
            console.error("failed to call LLM chain");
          }
        } catch(e) {
          console.error("failed to create vector store");
        }
      } else if (comparison === "function_calling") {
        console.error("Function Calling is not implemented yet.");
      } else {
        console.error("Comparison", comparison, event, data);
      }
    } catch(e) {
      console.error(e);
      return fail(500, {
        incorrect: true
      });
    }
  }
}