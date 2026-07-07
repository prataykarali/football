/**
 * Match Proof Layer — Cairo-ready session proof generator
 */

export class MatchProofService {
  constructor() {}

  canonicalize(input) {
    if (typeof input === 'string') return input;
    if (typeof input !== 'object' || input === null) return String(input);

    const sortObjectKeys = (obj) => {
      if (Array.isArray(obj)) return obj.map(sortObjectKeys);
      if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj)
          .sort()
          .reduce((acc, key) => {
            acc[key] = sortObjectKeys(obj[key]);
            return acc;
          }, {});
      }
      return obj;
    };

    return JSON.stringify(sortObjectKeys(input));
  }

  buildCanonicalPayload(sessionData) {
    return this.canonicalize(sessionData);
  }

  async generateProofId(input) {
    const canonical = this.canonicalize(input);
    return this._sha256(canonical);
  }

  async generateEngagementFingerprint(categoryTotals = {}) {
    const canonical = this.canonicalize(categoryTotals);
    return this._sha256(canonical);
  }



  toFelt252Sync(hexHash) {
    if (!hexHash) return BigInt(0);
    const cleanHex = hexHash.replace(/^0x/, '');
    const first31Bytes = cleanHex.substring(0, 62);
    const val = BigInt('0x' + (first31Bytes || '0'));
    const maxFelt = (BigInt(2) ** BigInt(248)) - BigInt(1);
    return val % maxFelt;
  }

  /** Async version for backward-compat — delegates to sync implementation. */
  async toFelt252(input) {
    let hexHash;
    if (typeof input === 'string') {
      hexHash = input;
    } else {
      hexHash = await this.generateProofId(input);
    }
    return this.toFelt252Sync(hexHash);
  }

  async toCairoCalldata(input) {
    const proofIdHex = await this.generateProofId(input);
    const proofIdFelt = await this.toFelt252(proofIdHex);

    const engagement = input.engagement || input.categoryTotals || {};
    const fingerprintHex = await this.generateEngagementFingerprint(engagement);
    const fingerprintFelt = await this.toFelt252(fingerprintHex);
    const ts = input.timestamp || Math.floor(Date.now() / 1000);

    return {
      proof_id: proofIdFelt.toString(),
      proof_id_hex: proofIdHex,
      accuracy_bps: input.accuracyBps || 0,
      engagement_fingerprint: fingerprintFelt.toString(),
      engagement_fingerprint_hex: fingerprintHex,
      recorded_at: ts,
      timestamp: ts
    };
  }

  buildCairoCalldata(proofIdHex, accuracyBps, fingerprintHex, timestamp) {
    const proofIdFelt = this.toFelt252Sync(proofIdHex);
    const fingerprintFelt = this.toFelt252Sync(fingerprintHex);

    return {
      proof_id: proofIdFelt.toString(),
      proof_id_hex: proofIdHex,
      accuracy_bps: accuracyBps,
      engagement_fingerprint: fingerprintFelt.toString(),
      engagement_fingerprint_hex: fingerprintHex,
      recorded_at: timestamp,
      timestamp: timestamp
    };
  }

  async exportProof(calldataOrInput) {
    let calldata;
    if (calldataOrInput && calldataOrInput.proof_id) {
      calldata = calldataOrInput;
    } else {
      calldata = await this.toCairoCalldata(calldataOrInput);
    }

    const jsonStr = JSON.stringify(calldata, null, 2);

    if (typeof document !== 'undefined') {
      try {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vantage_proof_${calldata.recorded_at || Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        // Fallback for non-DOM environments
      }
    }

    return jsonStr;
  }

  async verifyProof(sessionData, expectedProofIdHex) {
    const actualProofIdHex = await this.generateProofId(sessionData);
    return actualProofIdHex === expectedProofIdHex;
  }



  async _sha256(str) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch {
        // fallback
      }
    }

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}
