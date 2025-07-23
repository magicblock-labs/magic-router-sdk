import { Connection, Transaction, ConfirmOptions, Keypair, TransactionSignature} from "@solana/web3.js";

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

export async function prepareRouterTransaction(connection: Connection, transaction: Transaction, options?: ConfirmOptions): Promise<Transaction> {
  const writableAccounts = getWritableAccounts(transaction);
  const blockHashResponse = await fetch(connection.rpcEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBlockhashForAccounts',
      params: [[writableAccounts]]
    })
  });
  
  const blockHashData = await blockHashResponse.json();
  transaction.recentBlockhash = blockHashData.result.blockhash;

  return transaction;
}

export async function sendRouterTransaction(connection: Connection, transaction: Transaction, wallet: Keypair, options?: ConfirmOptions): Promise<TransactionSignature> {
  const writableAccounts = getWritableAccounts(transaction);
  const blockHashResponse = await fetch(connection.rpcEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBlockhashForAccounts',
      params: [[writableAccounts]]
    })
  });
  
  const blockHashData = await blockHashResponse.json();
  transaction.recentBlockhash = blockHashData.result.blockhash;
  transaction.feePayer = wallet.publicKey;
  transaction.sign(wallet);

  return await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true });
}