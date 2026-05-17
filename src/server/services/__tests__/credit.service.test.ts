/**
 * @jest-environment node
 */
import { deductCredits } from "../credit.service";
import { supabaseAdmin } from "@/server/lib/supabase";

// Mock Supabase admin
jest.mock("@/server/lib/supabase", () => ({
  supabaseAdmin: {
    rpc: jest.fn(),
  },
}));

describe("Credit Service", () => {
  const mockRpc = supabaseAdmin.rpc as jest.Mock;

  beforeEach(() => {
    mockRpc.mockClear();
  });

  describe("deductCredits", () => {
    it("should call increment_user_credits_v2 and return true on success", async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });

      const result = await deductCredits("user1", 10.5, "Tokens");

      expect(result).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("increment_user_credits_v2", {
        user_id_arg: "user1",
        amount_arg: -10.5,
        transaction_type_arg: "usage",
        description_arg: "Tokens",
        session_id_arg: null,
        message_id_arg: null,
        model_arg: null,
        base_cost_arg: null,
        margin_arg: null,
        input_tokens_arg: null,
        output_tokens_arg: null,
        enforce_balance: true,
      });
    });

    it("should return false when RPC returns an error", async () => {
      mockRpc.mockResolvedValue({ 
        data: null, 
        error: { message: "Insufficient balance" } 
      });

      const result = await deductCredits("user1", 100, "Expensive prompt");

      expect(result).toBe(false);
      expect(mockRpc).toHaveBeenCalled();
    });

    it("should return false when RPC returns false (enforced balance check)", async () => {
      mockRpc.mockResolvedValue({ data: false, error: null });

      const result = await deductCredits("user1", 100, "Expensive prompt");

      expect(result).toBe(false);
    });
  });
});
