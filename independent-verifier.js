import { fingerprint } from './artifact-freshness-guard.js';

/**
 * Execute trusted application checks, never a builder-supplied pass flag.
 * checks: [{criterionId, artifactId, check: async (content, context) => boolean | {passed,details}}]
 * Each invocation snapshots artifacts so an asynchronous check cannot certify changed content.
 */
export function createIndependentVerifier({ checks, ledger, clock = () => new Date().toISOString() } = {}) {
  if (!Array.isArray(checks)) throw new TypeError('Verifier checks must be an array');
  for (const check of checks) {
    if (!check.criterionId || !check.artifactId || typeof check.check !== 'function') throw new TypeError('Each check needs criterionId, artifactId, and a check function');
  }
  return {
    async verify({ contract, artifacts }) {
      const snapshot = Object.freeze({ ...artifacts });
      const results = [];
      for (const criterion of contract.criteria) {
        const criterionChecks = checks.filter(check => check.criterionId === criterion.id);
        if (!criterionChecks.length) continue; // Receipt will reject missing mandatory evidence.
        // A criterion aggregates all of its checks into one authoritative result.
        // Multiple artifacts are intentionally rejected: use one criterion per artifact.
        const artifactIds = [...new Set(criterionChecks.map(check => check.artifactId))];
        if (artifactIds.length !== 1) throw new Error(`Criterion ${criterion.id} must verify exactly one artifact`);
        const artifactId = artifactIds[0];
        const exists = Object.hasOwn(snapshot, artifactId) && typeof snapshot[artifactId] === 'string';
        const content = exists ? snapshot[artifactId] : '';
        let passed = exists;
        const details = [];
        if (!exists) details.push('Artifact is missing');
        else for (const check of criterionChecks) {
          try {
            const result = await check.check(content, { contract, artifacts: snapshot });
            const success = result === true || (result && typeof result === 'object' && result.passed === true);
            passed = passed && Boolean(success);
            details.push(typeof result === 'object' && result !== null ? result.details ?? (success ? 'Check passed' : 'Check failed') : success ? 'Check passed' : 'Check failed');
          } catch (error) { passed = false; details.push(`Check threw: ${error.message ?? String(error)}`); }
        }
        const entry = { id: globalThis.crypto.randomUUID(), contractId: contract.id, criterionId: criterion.id, passed, artifactId, fingerprint: await fingerprint(content), createdAt: clock(), details };
        ledger?.append(entry);
        results.push(entry);
      }
      return results;
    },
  };
}
