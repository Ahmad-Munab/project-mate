/**
 * Types for the multi-agent system
 * This file contains type definitions for the multi-agent system
 */

/**
 * Agent types for specialized tasks
 */
export enum AgentType {
  PLANNER = "PLANNER",
  EXECUTOR = "EXECUTOR",
  ANALYZER = "ANALYZER",
  CREATOR = "CREATOR",
  REFLECTOR = "REFLECTOR",
  CONVERSATIONAL = "CONVERSATIONAL"
}

/**
 * Message type for the multi-agent system
 */
export interface AgentMessage {
  role: string;
  content: string;
  timestamp?: Date;
}

/**
 * Plan step type for the multi-agent system
 */
export interface PlanStep {
  step_number: number;
  description: string;
  agent_type: AgentType;
  expected_output: string;
  is_api_call_required: boolean;
}

/**
 * Plan type for the multi-agent system
 */
export interface Plan {
  goal: string;
  requires_specialized_agents: boolean;
  steps: PlanStep[];
  potential_issues: string[];
  fallback_plan: string;
}

/**
 * Result type for the multi-agent system
 */
export interface AgentResult {
  output: string;
  metadata?: Record<string, unknown>;
}
