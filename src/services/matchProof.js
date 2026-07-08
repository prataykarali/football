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

    // Secure, standard pure JS SHA-256 fallback
    const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const result = [];
    const words = [];
    const asciiLength = str.length;
    const hash = [];
    const k = [];
    let primeCounter = 0;

    const isPrime = (n) => {
      for (let factor = 2; factor * factor <= n; factor++) {
        if (n % factor === 0) return false;
      }
      return true;
    };

    let candidate = 2;
    while (primeCounter < 64) {
      if (isPrime(candidate)) {
        if (primeCounter < 8) {
          hash[primeCounter] = (mathPow(candidate, 1/2) * maxWord) | 0;
        }
        k[primeCounter] = (mathPow(candidate, 1/3) * maxWord) | 0;
        primeCounter++;
      }
      candidate++;
    }

    const utf8 = [];
    for (let i = 0; i < asciiLength; i++) {
      let charcode = str.charCodeAt(i);
      if (charcode < 0x80) utf8.push(charcode);
      else if (charcode < 0x800) {
        utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
      } else if (charcode < 0xd800 || charcode >= 0xe000) {
        utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
      } else {
        i++;
        charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
        utf8.push(
          0xf0 | (charcode >> 18),
          0x80 | ((charcode >> 12) & 0x3f),
          0x80 | ((charcode >> 6) & 0x3f),
          0x80 | (charcode & 0x3f)
        );
      }
    }

    const utf8Length = utf8.length;
    utf8.push(0x80);
    while (utf8.length % 64 !== 56) utf8.push(0);
    
    const totalBits = utf8Length * 8;
    for (let i = 7; i >= 0; i--) {
      utf8.push((totalBits >>> (i * 8)) & 0xff);
    }

    for (let i = 0; i < utf8.length; i += 4) {
      words.push((utf8[i] << 24) | (utf8[i+1] << 16) | (utf8[i+2] << 8) | utf8[i+3]);
    }

    for (let i = 0; i < words.length; i += 16) {
      const w = new Array(64);
      for (let j = 0; j < 16; j++) w[j] = words[i + j];
      for (let j = 16; j < 64; j++) {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      let a = hash[0], b = hash[1], c = hash[2], d = hash[3], e = hash[4], f = hash[5], g = hash[6], h = hash[7];

      for (let j = 0; j < 64; j++) {
        const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + k[j] + w[j]) | 0;
        const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) | 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) | 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) | 0;
      }

      hash[0] = (hash[0] + a) | 0;
      hash[1] = (hash[1] + b) | 0;
      hash[2] = (hash[2] + c) | 0;
      hash[3] = (hash[3] + d) | 0;
      hash[4] = (hash[4] + e) | 0;
      hash[5] = (hash[5] + f) | 0;
      hash[6] = (hash[6] + g) | 0;
      hash[7] = (hash[7] + h) | 0;
    }

    for (let i = 0; i < 8; i++) {
      const hexStr = (hash[i] >>> 0).toString(16).padStart(8, '0');
      result.push(hexStr);
    }
    return result.join('');
  }
}
