// RAGSystem.js

import {
  LlamaModel,
  LlamaContext,
  LlamaChatSession,
  LlamaEmbeddingContext,
} from "node-llama-cpp";

/**
 * A comprehensive system for Retrieval-Augmented Generation (RAG).
 * This class handles loading separate models for embedding and generation,
 * creating vector embeddings from text, and answering questions based on
 * a provided context.
 */
export class RAGSystem {
  /**
   * @param {object} config Configuration object for the RAG system.
   * @param {string} config.embeddingModelPath Filesystem path to the GGUF model for embeddings.
   * @param {string} config.generationModelPath Filesystem path to the GGUF model for chat generation.
   */
  constructor(config) {
    if (!config || !config.embeddingModelPath || !config.generationModelPath) {
      throw new Error("Invalid configuration: embeddingModelPath and generationModelPath are required.");
    }

    this.embeddingModelPath = config.embeddingModelPath;
    this.generationModelPath = config.generationModelPath;

    this.embeddingModel = null;
    this.generationModel = null;
    this.embeddingContext = null;
    this.chatSession = null;
  }

  /**
   * Asynchronously loads the embedding and generation models into memory.
   * This method must be called successfully before using other methods.
   */
  async initialize() {
    try {
      console.log("Initializing RAG models...");

      // Load the embedding model
      this.embeddingModel = new LlamaModel({
        modelPath: this.embeddingModelPath,
      });
      const embeddingLlamaContext = new LlamaContext({ model: this.embeddingModel });
      this.embeddingContext = new LlamaEmbeddingContext({
        context: embeddingLlamaContext,
      });
      console.log("Embedding model loaded successfully.");

      // Load the generation model
      this.generationModel = new LlamaModel({
        modelPath: this.generationModelPath,
      });
      const generationLlamaContext = new LlamaContext({ model: this.generationModel });
      this.chatSession = new LlamaChatSession({
        context: generationLlamaContext,
      });
      console.log("Generation model loaded successfully.");
      
      console.log("RAG system initialized.");

    } catch (error) {
      console.error("Failed to initialize RAG system:", error);
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  /**
   * Generates a vector embedding for a given piece of text.
   * @param {string} text The text to generate an embedding for.
   * @returns {Promise<number[]>} A promise that resolves to the vector embedding.
   */
  async generateEmbedding(text) {
    if (!this.embeddingContext) {
      throw new Error("RAG system not initialized. Call initialize() first.");
    }
    const embedding = await this.embeddingContext.getEmbeddingFor(text);
    return embedding.vector;
  }

  /**
   * Answers a user's question based on provided context chunks using the RAG process.
   * @param {string} query The user's question.
   * @param {string[]} contextChunks An array of relevant text chunks to use as context.
   * @returns {Promise<string>} A promise that resolves to the generated answer.
   */
  async answerQuestion(query, contextChunks) {
    if (!this.chatSession) {
      throw new Error("RAG system not initialized. Call initialize() first.");
    }

    const contextString = contextChunks.join("\n---\n");

    // Dynamically construct the prompt
    const prompt = `System: You are an AI assistant. Use the following context to answer the user's question. If the information is not in the context, say so.
Context:
${contextString}

User: ${query}`;

    console.log("Sending prompt to generation model...");
    const answer = await this.chatSession.prompt(prompt);

    return answer;
  }
}
