# Independent Verifier Kit

Run application-owned checks and record artifact-bound evidence.

Standalone ES module. No npm install required. Works in **Node.js 20+** and modern browsers (serve over HTTP for browser demos).

## Included files

This repository vendors local dependencies needed by the module:

- `independent-verifier.js` (main)
- `artifact-freshness-guard.js`

## Install / import

Copy the files into your project, or clone this repository:

```js
import { createContract } from './dod-contract.js';
import { createIndependentVerifier } from './independent-verifier.js';
const contract = createContract({id:'invoice', task:'Produce invoice total 42',
  criteria:[{id:'total',description:'JSON total equals 42'}]});
const artifacts={'invoice.json':'{"total":41}'};
const verifier=createIndependentVerifier({checks:[
  {criterionId:'total',artifactId:'invoice.json',
   check:content=>JSON.parse(content).total===42}
]});
console.log(await verifier.verify({contract,artifacts})); // passed: false
```

## Use cases

### 1. Challenge a builder’s “done” claim

- **Scenario:** A builder says the invoice is complete, but its total is 41 rather than 42.
- **Outcome:** Run an application-owned check and record a failed result.

### 2. Require several checks to pass

- **Scenario:** An output needs both valid JSON and an expected value.
- **Outcome:** Aggregate the trusted checks rather than accepting one passing assertion.

## Exports

- `createIndependentVerifier`

## Notes

- Keep API keys and secrets out of this module and out of browser storage.
- Treat verification callbacks, ledger writers, and permission checks as trusted application code.
- This library is intentional local reliability plumbing, not a claim of cryptographic attestation unless stated in the source comments.

## License

MIT
