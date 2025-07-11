import { prepareRouterTransaction, sendRouterTransaction, getWritableAccounts } from './index';
import { Connection, Transaction, Keypair } from '@solana/web3.js';

jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      rpcEndpoint: 'http://localhost',
      sendRawTransaction: jest.fn().mockResolvedValue('mock-signature'),
    })),
    Transaction: jest.fn().mockImplementation(() => ({
      compileMessage: jest.fn(() => ({
        accountKeys: ['key1', 'key2'],
        header: {
          numRequiredSignatures: 1,
          numReadonlySignedAccounts: 0,
          numReadonlyUnsignedAccounts: 1,
        },
      })),
      serialize: jest.fn(() => Buffer.from('mock')),
      sign: jest.fn(),
    })),
    Keypair: {
      generate: jest.fn(() => ({ publicKey: 'mock-public-key' })),
    },
  };
});

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ result: { blockhash: 'mock-blockhash' } }),
  })
) as any;

describe('prepareRouterTransaction', () => {
  it('sets recentBlockhash and returns the transaction', async () => {
    const connection = new Connection('http://localhost');
    const transaction = new Transaction();
    const result = await prepareRouterTransaction(connection, transaction);
    expect(result.recentBlockhash).toBe('mock-blockhash');
    expect(global.fetch).toHaveBeenCalled();
  });
});

describe('sendRouterTransaction', () => {
  it('sets recentBlockhash, feePayer, signs, and sends the transaction', async () => {
    const connection = new Connection('http://localhost');
    const transaction = new Transaction();
    const wallet = { publicKey: 'mock-public-key', sign: jest.fn() } as any;
    const signature = await sendRouterTransaction(connection, transaction, wallet);
    expect(transaction.recentBlockhash).toBe('mock-blockhash');
    expect(transaction.feePayer).toBe('mock-public-key');
    expect(signature).toBe('mock-signature');
    expect(global.fetch).toHaveBeenCalled();
  });
});

describe('getWritableAccounts', () => {
  function makeTx(accountKeys: string[], header: any) {
    return {
      compileMessage: () => ({ accountKeys, header })
    } as any;
  }

  it('returns all accounts as writable if none are readonly', () => {
    const tx = makeTx(['a', 'b', 'c'], {
      numRequiredSignatures: 2,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 0,
    });
    expect(getWritableAccounts(tx)).toEqual(['a', 'b', 'c']);
  });

  it('excludes readonly signed accounts', () => {
    const tx = makeTx(['a', 'b', 'c'], {
      numRequiredSignatures: 2,
      numReadonlySignedAccounts: 1,
      numReadonlyUnsignedAccounts: 0,
    });
    // Only the last signer is readonly
    expect(getWritableAccounts(tx)).toEqual(['a', 'c']);
  });

  it('excludes readonly unsigned accounts', () => {
    const tx = makeTx(['a', 'b', 'c', 'd'], {
      numRequiredSignatures: 2,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 2,
    });
    // Last two unsigned are readonly
    expect(getWritableAccounts(tx)).toEqual(['a', 'b']);
  });

  it('handles mix of readonly signed and unsigned', () => {
    const tx = makeTx(['a', 'b', 'c', 'd', 'e'], {
      numRequiredSignatures: 3,
      numReadonlySignedAccounts: 1,
      numReadonlyUnsignedAccounts: 1,
    });
    // signers: a, b, c (c is readonly), unsigned: d, e (e is readonly)
    expect(getWritableAccounts(tx)).toEqual(['a', 'b', 'd']);
  });
}); 