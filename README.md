# Magic Router SDK

A TypeScript SDK for preparing and sending Magicblock Magic Router transactions. More information [here](https://docs.magicblock.gg/pages/get-started/introduction/smart-router).

## Installation

```bash
npm install magic-router-sdk
```

### Methods

#### `getWritableAccounts(transaction: Transaction): string[]`

A helper method to retrieve writable solana accounts from an Anchor Transaction object.

#### `getClosestValidator(routerConnection: Connection): Promise<PublicKey>`

Fetches the identity of the closest validator to the router connection. Makes a JSON-RPC call to the `getIdentity` method and returns the validator's public key.

#### `prepareRouterTransaction(connection: Connection, transaction: Transaction, options?: ConfirmOptions): Promise<Transaction>`

Constructs a Magic Router transaction. Fetches the correct blockhash for the writable accounts (either in an ephemeral rollup or base chain) in the 
transaction and sets it on the transaction. Returns the updated transaction. Intended for use with browser wallet signing.

#### `sendRouterTransaction(connection: Connection, transaction: Transaction, signers: Keypair[], options?: ConfirmOptions): Promise<TransactionSignature>`

Constructs and sends Magic Router transaction. Fetches the correct blockhash for the writable accounts (either in an ephemeral rollup or base chain) 
in the transaction and sets it on the transaction. Sets the fee payer to the first signer, signs it with the provided signers, and sends it to the network. Returns the transaction signature.
Intended for use with local wallet or session key signing.

## Running & Building

To build the SDK:

```bash
npm run build
```

## Testing

This project uses Jest and ts-jest for testing.

To run all tests:

```bash
npm test
```
