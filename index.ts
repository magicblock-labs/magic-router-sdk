import { Connection, Transaction, ConfirmOptions, TransactionSignature, Signer, BlockhashWithExpiryBlockHeight, SendOptions, PublicKey} from "@solana/web3.js";

/**
 * Get all writable accounts from a transaction.
 */
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


/**
 * Get the closest validator's public key from the router connection.
 */
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

/**
 * Get delegation status for a given account from the router.
 */
export async function getDelegationStatus(connection: Connection, account: PublicKey | string): Promise<{ isDelegated: boolean }> {
  const accountAddress = typeof account === 'string' ? account : account.toBase58();

  const response = await fetch(`${connection.rpcEndpoint}/getDelegationStatus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getDelegationStatus',
      params: [accountAddress]
    })
  });

  const data = await response.json();
  return data.result as { isDelegated: boolean };
}

/**
 * Get the latest blockhash for a transaction based on writable accounts.
 */
export async function getLatestBlockhashForMagicTransaction(connection: Connection, transaction: Transaction, options?: ConfirmOptions): Promise<BlockhashWithExpiryBlockHeight> {
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
  return blockHashData.result;
}

/**
 * Prepare a transaction for sending by setting the recent blockhash.
 */
export async function prepareMagicTransaction(connection: Connection, transaction: Transaction, options?: ConfirmOptions): Promise<Transaction> {

  const blockHashData = await getLatestBlockhashForMagicTransaction(connection, transaction, options);
  transaction.recentBlockhash = blockHashData.blockhash;

  return transaction;
}



/**
 * Send a transaction, returning the signature of the transaction.
 * This function is modified to handle the magic transaction sending strategy by getting the latest blockhash based on writable accounts.
 */
export async function sendMagicTransaction (connection: Connection, transaction: Transaction, signersOrOptions: Array<Signer> | SendOptions = { skipPreflight: true }) : Promise<TransactionSignature> {
    if ('version' in transaction) {
        if (signersOrOptions && Array.isArray(signersOrOptions)) {
            throw new Error('Invalid arguments');
        }
        const wireTransaction = transaction.serialize();
        return await connection.sendRawTransaction(wireTransaction, signersOrOptions as SendOptions);
    }
    if (signersOrOptions === undefined || !Array.isArray(signersOrOptions)) {
        throw new Error('Invalid arguments');
    }
    const signers = signersOrOptions;
    if (transaction.nonceInfo) {
        transaction.sign(...signers);
    } else {
        for (;;) {
            const latestBlockhash = await getLatestBlockhashForMagicTransaction(connection, transaction, signersOrOptions as SendOptions);
            transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
            transaction.recentBlockhash = latestBlockhash.blockhash;
            transaction.sign(...signers);
            if (!transaction.signature) {
                throw new Error('!signature'); // should never happen
            }
            break;
        }
    }
    const wireTransaction = transaction.serialize();
    return await connection.sendRawTransaction(wireTransaction, signersOrOptions as SendOptions);
}
