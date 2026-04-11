import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const embeddingModel = openai.embedding("text-embedding-3-small");

/**
 * Generate embedding for a single text query (for search)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
  });
  return embedding;
}

/**
 * Generate embeddings for multiple chunks (for indexing)
 */
export async function generateEmbeddings(
  chunks: string[]
): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  return embeddings;
}

/**
 * Split text into chunks with overlap for better retrieval
 * Target: ~500 tokens per chunk, ~100 token overlap
 */
export function chunkText(
  text: string,
  maxChars = 1500,
  overlapChars = 300
): string[] {
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= maxChars) return [cleaned];

  const chunks: string[] = [];
  // Split by paragraphs first
  const paragraphs = cleaned.split(/\n\n+/);
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap from the end of current chunk
      const overlap = current.slice(-overlapChars);
      current = overlap + "\n\n" + para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  // If no paragraph splits worked (one giant block), force split by sentences
  if (chunks.length === 1 && cleaned.length > maxChars) {
    const sentences = cleaned.split(/(?<=[。！？.!?])\s*/);
    const sentenceChunks: string[] = [];
    let buf = "";

    for (const sentence of sentences) {
      if (buf.length + sentence.length > maxChars && buf.length > 0) {
        sentenceChunks.push(buf.trim());
        const overlap = buf.slice(-overlapChars);
        buf = overlap + sentence;
      } else {
        buf += sentence;
      }
    }
    if (buf.trim()) sentenceChunks.push(buf.trim());
    return sentenceChunks;
  }

  return chunks;
}
