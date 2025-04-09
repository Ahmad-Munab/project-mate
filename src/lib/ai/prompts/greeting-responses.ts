/**
 * Greeting patterns and responses
 * Extracted from agent.ts to remove hardcoded elements
 */

export interface GreetingPattern {
  patterns: string[];
  type: string;
}

export const greetingPatterns: GreetingPattern[] = [
  { patterns: ["hello", "hi", "hey", "howdy", "hola", "greetings"], type: "hello" },
  { patterns: ["good morning", "morning"], type: "morning" },
  { patterns: ["good afternoon", "afternoon"], type: "afternoon" },
  { patterns: ["good evening", "evening"], type: "evening" },
  { patterns: ["what's up", "whats up", "sup", "wassup"], type: "whatsup" },
  { patterns: ["how are you", "how are u", "how r u", "how r you", "how you doing", "how's it going", "hows it going"], type: "howareyou" },
];

export interface GreetingResponses {
  [key: string]: string[];
}

export const greetingResponses: GreetingResponses = {
  hello: [
    "Hey there! How can I help with your project today?",
    "Hi! Need any help with your project?",
    "Hello! What would you like to work on today?",
    "Hey! How can I assist you with your project?"
  ],
  morning: [
    "Good morning! Ready to be productive today?",
    "Morning! What's on the agenda for today?",
    "Good morning! How can I help you start your day?"
  ],
  afternoon: [
    "Good afternoon! What can I help you with?",
    "Hey there! Need any assistance this afternoon?",
    "Good afternoon! What are you working on?"
  ],
  evening: [
    "Good evening! Still working? How can I help?",
    "Evening! What can I help you with before you wrap up?",
    "Good evening! Need any help with your project?"
  ],
  whatsup: [
    "Not much, just here to help with your project! What's up with you?",
    "Ready to help with whatever you need! What's on your mind?",
    "Just waiting to assist you! What do you need help with?"
  ],
  howareyou: [
    "I'm doing great, thanks for asking! How can I help with your project?",
    "All good here! Ready to help you with whatever you need. What's on your mind?",
    "I'm excellent! Ready to assist with your project. What do you need help with?"
  ]
};
