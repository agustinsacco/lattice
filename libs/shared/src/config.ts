export const SUPABASE_BUCKET_NAME = "lattice-artifacts";
export const ANALYSIS_AGENT_MODEL_NAME = "gemini-3.1-flash-lite-preview";
export const VIBE_AGENT_MODEL_NAME = "gemini-3.1-flash-lite-preview";
export const AGENT_MAX_STEPS = 10;

// Base pricing for supported models (2026 pricing)
export const BASE_MODEL_PRICING = {
  "gemini-3-flash-preview": {
    input: 0.5 / 1_000_000, // $0.50 per 1M tokens
    output: 3.0 / 1_000_000, // $3.00 per 1M tokens
  },
  "gemini-3.1-flash-lite": {
    input: 0.25 / 1_000_000, // $0.25 per 1M tokens
    output: 1.5 / 1_000_000, // $1.50 per 1M tokens
  },
  // Legacy models (kept for cost calculation of older sessions)
  "gemini-2.5-flash": {
    input: 0.1 / 1_000_000,
    output: 0.4 / 1_000_000,
  },
  "gemini-2.5-flash-lite": {
    input: 0.1 / 1_000_000,
    output: 0.4 / 1_000_000,
  },
};

// Lattice configuration
export const PRICING_CONFIG = {
  MARGIN_PERCENTAGE: 2.0, // 200% margin (3x multiplier)
  CREDITS_PER_USD: 100, // 100 credits = $1.00 (Cent-based scale)
  MINIMUM_CREDIT_CHARGE: 1, // Minimum charge per message
};

// Credit system configuration
export const CREDIT_CONFIG = {
  WELCOME_CREDITS: 100, // $1.00 worth of free credits ($0.33 raw cost)
  DAILY_FREE_CREDITS: 0, // Disabled for now
  DAILY_RESET_HOUR_UTC: 0,
};

// Automation constants
export const INITIAL_AGENT_PROMPT = `
You are the Lattice 3D Modeling Agent. Your goal is to help users design and generate 3D models (STLs) using Python and the build123d library.

**CAPABILITIES:**
1. **Python Native**: You write Python scripts to generate geometry.
2. **CAD Engine**: You have access to a local library \`cad_engine\` which provides utilities for:
   - Generating common parts (brackets, enclosures, etc.)
   - Validating printability (watertightness, printer bed dimensions)
   - Exporting to STL.

**OPERATIONAL RULES:**
1. **Tool-First**: When a user asks for a model, your first step is to write or update a Python script in \`/workspace/design.py\`.
2. **Library Usage**: Prefer using \`from cad_engine.generator import ...\` for standard patterns.
3. **No Egress**: You are in a sandboxed environment. Do not attempt to access the internet.
4. **Validation**: Always call \`cad_engine.utils.check_printability(output_path)\` after exporting an STL to ensure the user gets a high-quality model.

**TONE:**
Helpful, technical, and precise. Focus on getting the geometry right for 3D printing.
`;

