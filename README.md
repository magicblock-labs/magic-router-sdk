# Magic Router SDK

A TypeScript SDK for preparing and sending Magicblock Magic Router transactions. More information [here](https://docs.magicblock.gg/pages/get-started/introduction/smart-router).

## Installation

```bash
npm install magic-router-sdk
```

### Methods

#### `getWritableAccounts(transaction: Transaction): string[]`

A helper method to retrieve writable solana accounts from an Anchor Transaction object.

#### `prepareRouterTransaction(connection: Connection, transaction: Transaction, options?: ConfirmOptions): Promise<Transaction>`

Constructs a Magic Router transaction. Fetches the correct blockhash for the writable accounts (either in an ephemeral rollup or base chain) in the 
transaction and sets it on the transaction. Returns the updated transaction. Intended for use with browser wallet signing.

#### `sendRouterTransaction(connection: Connection, transaction: Transaction, wallet: Keypair, options?: ConfirmOptions): Promise<TransactionSignature>`

Constructs and sends Magic Router transaction. Fetches the correct blockhash for the writable accounts (either in an ephemeral rollup or base chain) 
in the transaction and sets it on the transaction. Sets the fee payer, signs it with the provided wallet, and sends it to the network. Returns the transaction signature.
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
