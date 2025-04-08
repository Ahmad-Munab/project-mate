import { Groq } from "groq-sdk";
import { ChatGroq } from "@langchain/groq";
import { getProjectTools } from "./langchain-tools";
import { createProjectMemory, getEnhancedProjectContext } from "./enhanced-memory";
import { storeEnhancedMessage } from "./enhanced-memory";
import { AIMessage } from "./memory";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// Create a LangChain model
const createModel = () => {
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY!,
    model: "llama3-70b-8192",
    temperature: 0.7,
  });
};

// Process a user message and generate a response
export async function processUserMessage(projectId: string, userMessage: string) {
  try {
    // Get the model
    const model = createModel();

    // Get the tools
    const tools = getProjectTools(projectId);

    // Get the system message
    const systemMessage = await getEnhancedProjectContext(projectId, userMessage);

    // Call Groq API directly
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      model: "llama3-70b-8192",
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 0.95,
    });

    // Get AI response
    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    return aiResponse;
  } catch (error) {
    console.error("Failed to process user message:", error);
    throw error;
  }
}

// Run the project agent with a user message
export async function runProjectAgent(
  projectId: string,
  userMessage: string
) {
  try {
    // Store the user message
    await storeEnhancedMessage(
      projectId,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      }
    );

    // Process the user message
    const aiResponse = await processUserMessage(projectId, userMessage);

    // Store the assistant message
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      }
    );

    return aiResponse;
  } catch (error) {
    console.error("Failed to run project agent:", error);

    // Store the error message
    await storeEnhancedMessage(
      projectId,
      {
        role: "assistant",
        content: `I'm sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      }
    );

    throw error;
  }
}
