import { Connection, Transaction, ConfirmOptions, Keypair, TransactionSignature, PublicKey } from "@solana/web3.js";

// Based on a raw transaction, get the writable accounts
export function getWritableAccounts(transaction: Transaction) {
  const writableAccounts = new Set<string>();

  if (transaction.feePayer) {
    writableAccounts.add(transaction.feePayer.toBase58());
  }

  // Check all instruction keys
  for (const instruction of transaction.instructions) {
    for (const key of instruction.keys) {
      if (key.isWritable) {
        writableAccounts.add(key.pubkey.toBase58());
      }
    }
  }

  return Array.from(writableAccounts);
}

export async function getClosestValidator(routerConnection: Connection) {
  const response = await fetch(routerConnection.rpcEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getIdentity',
      params: []
    })
  });

  const identityData = await response.json();
  const validatorKey = new PublicKey(identityData.result.identity);

  return validatorKey;
}

export async function prepareRouterTransaction(connection: Connection, transaction: Transaction, options?: ConfirmOptions): Promise<Transaction> {
  const writableAccounts = getWritableAccounts(transaction);
  const blockHashResponse = await fetch(connection.rpcEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBlockhashForAccounts',
      params: [writableAccounts]
    })
  });

  const blockHashData = await blockHashResponse.json();
  transaction.recentBlockhash = blockHashData.result.blockhash;

  return transaction;
}

export async function sendRouterTransaction(connection: Connection, transaction: Transaction, signers: Keypair[], options?: ConfirmOptions): Promise<TransactionSignature> {
  const writableAccounts = getWritableAccounts(transaction);
  const blockHashResponse = await fetch(connection.rpcEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBlockhashForAccounts',
      params: [writableAccounts]
    })
  });

  const blockHashData = await blockHashResponse.json();
  transaction.recentBlockhash = blockHashData.result.blockhash;
  transaction.feePayer = signers[0].publicKey;
  transaction.sign(...signers);

  return await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true });
}