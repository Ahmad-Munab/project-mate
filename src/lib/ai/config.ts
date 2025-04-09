/**
 * AI configuration
 * Extracted from agent.ts to remove hardcoded elements
 */

/**
 * Model configuration for the AI
 */
export const modelConfig = {
  // Model name
  model: "llama3-70b-8192",
  
  // Temperature (0-1): Higher values make output more random, lower values more deterministic
  temperature: 0.75,
  
  // Maximum number of tokens to generate
  maxTokens: 2000,
  
  // Top-p sampling (0-1): Controls diversity via nucleus sampling
  topP: 0.95,
  
  // Frequency penalty (0-2): Penalizes new tokens based on their frequency in text so far
  frequencyPenalty: 0.5,
  
  // Presence penalty (0-2): Penalizes new tokens based on whether they appear in text so far
  presencePenalty: 0.5
};
