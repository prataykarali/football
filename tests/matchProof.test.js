import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchProofService } from '../src/services/matchProof.js';

// Mock crypto.subtle
const mockDigest = vi.fn(async (algorithm, data) => {
  const bytes = new Uint8Array(data);
  const hash = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i++) {
    hash[i % 32] = (hash[i % 32] + bytes[i]) % 256;
  }
  return hash.buffer;
});

vi.stubGlobal('crypto', {
  subtle: {
    digest: mockDigest,
  },
  getRandomValues: (arr) => {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    return arr;
  },
});

describe('MatchProofService', () => {
  let service;

  beforeEach(() => {
    service = new MatchProofService();
    vi.clearAllMocks();
  });

  describe('Proof ID generation', () => {
    it('should produce same proof_id for same input (deterministic)', async () => {
      const input = {
        matchId: 'match-001',
        userId: 'user-abc',
        events: [{ type: 'goal', minute: 23 }],
        timestamp: 1700000000,
      };

      const proof1 = await service.generateProofId(input);
      const proof2 = await service.generateProofId(input);

      expect(proof1).toBe(proof2);
    });

    it('should produce different proof_ids for different inputs', async () => {
      const input1 = {
        matchId: 'match-001',
        userId: 'user-abc',
        events: [{ type: 'goal', minute: 23 }],
        timestamp: 1700000000,
      };

      const input2 = {
        matchId: 'match-002',
        userId: 'user-xyz',
        events: [{ type: 'red_card', minute: 55 }],
        timestamp: 1700000001,
      };

      const proof1 = await service.generateProofId(input1);
      const proof2 = await service.generateProofId(input2);

      expect(proof1).not.toBe(proof2);
    });

    it('should produce a non-empty proof_id string', async () => {
      const input = {
        matchId: 'match-003',
        userId: 'user-def',
        events: [],
        timestamp: 1700000000,
      };

      const proofId = await service.generateProofId(input);

      expect(proofId).toBeDefined();
      expect(typeof proofId).toBe('string');
      expect(proofId.length).toBeGreaterThan(0);
    });
  });

  describe('Felt252 conversion', () => {
    it('should produce value less than 2^248', async () => {
      const input = {
        matchId: 'match-001',
        userId: 'user-abc',
        events: [{ type: 'goal', minute: 23 }],
        timestamp: 1700000000,
      };

      const felt = await service.toFelt252(input);

      const maxFelt = BigInt(2) ** BigInt(248);
      expect(BigInt(felt)).toBeLessThan(maxFelt);
    });

    it('should produce a positive value', async () => {
      const input = {
        matchId: 'match-005',
        userId: 'user-ghi',
        events: [],
        timestamp: 1700000000,
      };

      const felt = await service.toFelt252(input);

      expect(BigInt(felt)).toBeGreaterThan(BigInt(0));
    });
  });

  describe('Cairo calldata', () => {
    it('should have correct field structure', async () => {
      const input = {
        matchId: 'match-001',
        userId: 'user-abc',
        accuracyBps: 9500,
        events: [{ type: 'goal', minute: 23 }],
        timestamp: 1700000000,
      };

      const calldata = await service.toCairoCalldata(input);

      expect(calldata).toHaveProperty('proof_id');
      expect(calldata).toHaveProperty('accuracy_bps');
      expect(calldata).toHaveProperty('engagement_fingerprint');
      expect(calldata).toHaveProperty('recorded_at');
    });
  });

  describe('Canonical payload', () => {
    it('should sort keys consistently regardless of input order', async () => {
      const input1 = { b: 2, a: 1, c: 3 };
      const input2 = { c: 3, a: 1, b: 2 };

      const canonical1 = service.canonicalize(input1);
      const canonical2 = service.canonicalize(input2);

      expect(canonical1).toBe(canonical2);
    });

    it('should produce valid JSON from canonical payload', () => {
      const input = { matchId: 'match-001', userId: 'user-abc' };
      const canonical = service.canonicalize(input);

      expect(() => JSON.parse(canonical)).not.toThrow();
    });
  });

  describe('Engagement fingerprint', () => {
    it('should be deterministic for same engagement data', async () => {
      const engagement = {
        questionsAnswered: 5,
        correctAnswers: 4,
        reactionsUsed: ['🎉', '⚽'],
        minutesActive: 85,
      };

      const fp1 = await service.generateEngagementFingerprint(engagement);
      const fp2 = await service.generateEngagementFingerprint(engagement);

      expect(fp1).toBe(fp2);
    });

    it('should differ for different engagement data', async () => {
      const engagement1 = {
        questionsAnswered: 5,
        correctAnswers: 4,
        reactionsUsed: ['🎉'],
        minutesActive: 85,
      };

      const engagement2 = {
        questionsAnswered: 10,
        correctAnswers: 2,
        reactionsUsed: ['😢'],
        minutesActive: 45,
      };

      const fp1 = await service.generateEngagementFingerprint(engagement1);
      const fp2 = await service.generateEngagementFingerprint(engagement2);

      expect(fp1).not.toBe(fp2);
    });
  });

  describe('Export', () => {
    it('should generate valid JSON export', async () => {
      const input = {
        matchId: 'match-001',
        userId: 'user-abc',
        accuracyBps: 9500,
        events: [{ type: 'goal', minute: 23 }],
        timestamp: 1700000000,
      };

      const exported = await service.exportProof(input);

      expect(() => JSON.parse(exported)).not.toThrow();
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('proof_id');
      expect(parsed).toHaveProperty('timestamp');
    });
  });

  describe('Verification', () => {
    it('should return true for matching proof', async () => {
      const input = {
        matchId: 'match-001',
        userId: 'user-abc',
        events: [{ type: 'goal', minute: 23 }],
        timestamp: 1700000000,
      };

      const proofId = await service.generateProofId(input);
      const isValid = await service.verifyProof(input, proofId);

      expect(isValid).toBe(true);
    });

    it('should return false for non-matching proof', async () => {
      const input = {
        matchId: 'match-001',
        userId: 'user-abc',
        events: [{ type: 'goal', minute: 23 }],
        timestamp: 1700000000,
      };

      const isValid = await service.verifyProof(input, '0xdeadbeef');

      expect(isValid).toBe(false);
    });
  });
});
