/**
 * Open Text Embeddings
 * Custom embeddings class for the Open Text Embeddings API
 * https://api.opentextembeddings.com/
 */

import { Embeddings } from "@langchain/core/embeddings";
import axios from "axios";

/**
 * Interface for Open Text Embeddings parameters
 */
export interface OpenTextEmbeddingsParams {
  /** Model name to use */
  modelName?: string;
  /** API base URL */
  apiBase?: string;
  /** Batch size for embedding documents */
  batchSize?: number;
  /** Number of dimensions in the embedding vectors */
  dimensions?: number;
}

/**
 * Class for generating embeddings using the Open Text Embeddings API
 */
export class OpenTextEmbeddings extends Embeddings {
  modelName: string;
  apiBase: string;
  batchSize: number;
  dimensions: number;

  constructor(params: OpenTextEmbeddingsParams = {}) {
    super();
    this.modelName = params.modelName || "bge-large-en";
    this.apiBase = params.apiBase || "https://api.opentextembeddings.com/v1";
    this.batchSize = params.batchSize || 512;
    this.dimensions = params.dimensions || 1024;
  }

  /**
   * Get embeddings for a batch of texts
   */
  private async getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post(
        `${this.apiBase}/embeddings`,
        {
          model: this.modelName,
          input: texts,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status !== 200) {
        throw new Error(`API returned status code ${response.status}`);
      }

      return response.data.data.map((item: any) => item.embedding);
    } catch (error) {
      console.error("Error calling Open Text Embeddings API:", error);
      throw error;
    }
  }

  /**
   * Get embeddings for multiple documents
   */
  async embedDocuments(documents: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Process in batches
    for (let i = 0; i < documents.length; i += this.batchSize) {
      const batch = documents.slice(i, i + this.batchSize);
      const batchEmbeddings = await this.getEmbeddingsBatch(batch);
      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  /**
   * Get embedding for a single document
   */
  async embedQuery(document: string): Promise<number[]> {
    const embeddings = await this.getEmbeddingsBatch([document]);
    return embeddings[0];
  }

  /**
   * Get the dimensions of the embeddings
   */
  async dimensionality(): Promise<number> {
    return this.dimensions;
  }
}
