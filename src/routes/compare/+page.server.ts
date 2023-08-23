import { fail } from '@sveltejs/kit';
import type { Actions, RequestEvent } from '@sveltejs/kit';
import { OPENAI_API_KEY } from "$env/static/private";
import getNTokens from '$lib/utils/tokenizer';

import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { RetrievalQAChain } from "langchain/chains";
import { ChainTool } from "langchain/tools";
import { initializeAgentExecutorWithOptions } from "langchain/agents";

export const actions: Actions = {
  default: async (event: RequestEvent) => {
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY env variable not set');
      }
      const openaikey = OPENAI_API_KEY;

      let tokenCount = 0;
      const data = await event.request.formData();
      const question = data.get('query')?.toString() ?? "";
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
      const model_name = "gpt-4-0613";  // "gpt-3.5-turbo-0613";
      if (comparison === "concat") {
        // https://js.langchain.com/docs/use_cases/question_answering/
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 200,
          chunkOverlap: 3,
        });
        const texts1 = await splitter.splitText(text1)
        const docs1 = texts1.map((chunk: string, c_index:number) =>
          new Document({
            pageContent: chunk,
            metadata: { source: `1-${c_index}` }
          })
        );
        const texts2 = await splitter.splitText(text2)
        const docs2 = texts2.map((chunk: string, c_index:number) =>
          new Document({
            pageContent: chunk,
            metadata: { source: `2-${c_index}` }
          })
        );
        const docs: Document[] = docs1.concat(docs2);
        try {
          const start_embed = new Date().getTime();
          const embeddings = new OpenAIEmbeddings({ openAIApiKey: openaikey});
          const store = await MemoryVectorStore.fromDocuments(docs, embeddings);
          const elapsed_embed = (new Date().getTime() - start_embed);
          try {
            const start_chain = new Date().getTime();
            const model = new ChatOpenAI({
              modelName: model_name,
              temperature: 0,
              openAIApiKey: openaikey
            });
            const chain = RetrievalQAChain.fromLLM(
              model,
              store.asRetriever(),
            );
            console.log("Q:", question);
            const res = await chain.call({
              query: question,
            });
            const elapsed_chain = (new Date().getTime() - start_chain);
            const answer: string = res.text;
            // res.sourceDocuments
            return {
              answer: answer,
              elapsed_embed: elapsed_embed,
              elapsed_chain: elapsed_chain,
              model_name: model_name,
              steps: []
            }
          } catch(e) {
            console.error(e);
            throw new Error("failed to call LLM chain");
          }
        } catch(e) {
          console.error(e);
          throw new Error("failed to create vector store");
        }
      } else if (comparison === "function_calling") {
        // https://js.langchain.com/docs/modules/agents/tools/how_to/agents_with_vectorstores
        // https://python.langchain.com/docs/integrations/toolkits/document_comparison_toolkit
        const splitter = new RecursiveCharacterTextSplitter({
          chunkSize: 200,
          chunkOverlap: 3,
        });
        const start_embed = new Date().getTime();
        const toolPromises = [text1, text2].map(async (text: string, index: number) => {
          const texts = await splitter.splitText(text)
          const docs = texts.map((chunk: string, c_index:number) =>
            new Document({
              pageContent: chunk,
              metadata: { source: `${index+1}-${c_index}` }
            })
          );
          const embeddings = new OpenAIEmbeddings({ openAIApiKey: openaikey});
          const store = await MemoryVectorStore.fromDocuments(docs, embeddings);
          const model = new ChatOpenAI({
            modelName: model_name,
            temperature: 0,
            openAIApiKey: openaikey
          });
          const chain = RetrievalQAChain.fromLLM(
            model,
            store.asRetriever(),
          );
          return new ChainTool({
            name: `document-${index+1}-QA`,
            description: `useful when you want to answer questions about a document-${index+1}`,
            chain: chain
          });
        });
        const tools = await Promise.all(toolPromises);
        const elapsed_embed = (new Date().getTime() - start_embed);
        console.log("elapsed_embed", elapsed_embed);

        const start_chain = new Date().getTime();
        const prefix = "You are a useful assitant for answering questions by comparing two documents."
        const chat = new ChatOpenAI({
          modelName: model_name,
          temperature: 0,
          openAIApiKey: openaikey
        });
        const executor = await initializeAgentExecutorWithOptions(
          tools,
          chat,
          {
            agentType: "openai-functions",
            verbose: true,
            returnIntermediateSteps: true,
            agentArgs: {
              prefix,
            },
          }
        );
        const prompt = `document-1とdocument-2について比較し日本語で回答せよ: ${question}`;
        const result = await executor.call({input: prompt});
        const answer: string = result.output;
        const steps = result.intermediateSteps.map((step: any) => {
          const {action, observation} = step;
          const { log } = action;
          return { action_log: log, observation: observation }
        });
        const elapsed_chain = (new Date().getTime() - start_chain);
        return {
          answer: answer,
          elapsed_embed: elapsed_embed,
          elapsed_chain: elapsed_chain,
          model_name: model_name,
          steps: steps
        }
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