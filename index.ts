import { Connection, Transaction, ConfirmOptions, Keypair, TransactionSignature} from "@solana/web3.js";

// Based on a raw transaction, get the writable accounts
function getWritableAccounts(transaction: Transaction) {
  const msg = transaction.compileMessage();
  const accountKeys = msg.accountKeys;

  const numSigners = msg.header.numRequiredSignatures;
  const numReadonlySigned = msg.header.numReadonlySignedAccounts;
  const numReadonlyUnsigned = msg.header.numReadonlyUnsignedAccounts;

  const totalKeys = accountKeys.length;
  const writableAccounts = accountKeys.filter((key, i) => {
    const isSigner = i < numSigners;
    const isReadonly = isSigner
      ? i >= numSigners - numReadonlySigned
      : i >= totalKeys - numReadonlyUnsigned;

    return !isReadonly;
  });

  return writableAccounts;
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