# Library Profile from reference Labs

## Runtime and Language

- Node.js with ESM in API modules (`"type": "module"` in API package.json files).
- Solidity target: `0.8.24`.

## Backend Dependencies

Consistent across labs 1-4 API modules:

- `express`: `^4.19.2`
- `cors`: `^2.8.5`
- `ethers`: `^6.13.2`

## Blockchain Toolchain

Consistent across labs 1, 3, 4 blockchain modules:

- `hardhat`: `^2.22.10`
- `@nomicfoundation/hardhat-ethers`: `^3.0.8`
- `ethers`: `^6.13.2`

## Frontend Stack

- No SPA framework.
- HTML + CSS + vanilla JavaScript.
- Browser-side fetch for API calls and explicit DOM updates.

## Operational Defaults

- Local RPC endpoint style: `http://127.0.0.1:8545`.
- Hardhat local node workflow via scripts: `hardhat node`, `hardhat compile`, `hardhat run scripts/deploy.js --network localhost`.

## Migration Guidance

When refactoring to identity parity:

1. Keep existing project features and tests as source of truth.
2. Prefer adapting code shape and boundaries first before downgrading/upgrading major libraries.
3. If you retain newer versions (for security/runtime reasons), preserve API/style semantics from labs.
4. Document any intentional version divergence in refactor notes.
