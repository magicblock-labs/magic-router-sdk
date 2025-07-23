import { prepareRouterTransaction, sendRouterTransaction, getWritableAccounts, getClosestValidator } from './index';
import { Connection, Transaction, Keypair, PublicKey } from '@solana/web3.js';

// Mock PublicKey class
const mockPublicKey = (address: string) => ({
  toBase58: () => address,
  toString: () => address,
});

jest.mock('@solana/web3.js', () => {
  const actual = jest.requireActual('@solana/web3.js');
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      rpcEndpoint: 'http://localhost',
      sendRawTransaction: jest.fn().mockResolvedValue('mock-signature'),
    })),
    Transaction: jest.fn().mockImplementation(() => ({
      feePayer: mockPublicKey('mock-fee-payer'),
      instructions: [
        {
          keys: [
            { pubkey: mockPublicKey('key1'), isSigner: true, isWritable: true },
            { pubkey: mockPublicKey('key2'), isSigner: false, isWritable: false }
          ]
        }
      ],
      serialize: jest.fn(() => Buffer.from('mock')),
      sign: jest.fn(),
    })),
    Keypair: jest.fn().mockImplementation(() => ({ 
      publicKey: mockPublicKey('mock-public-key'),
      sign: jest.fn()
    })),
    PublicKey: jest.fn().mockImplementation((address) => mockPublicKey(address)),
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
    expect(global.fetch).toHaveBeenCalledWith('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBlockhashForAccounts',
        params: [['mock-fee-payer', 'key1']]
      })
    });
  });
});

describe('sendRouterTransaction', () => {
  it('sets recentBlockhash, feePayer, signs, and sends the transaction', async () => {
    const connection = new Connection('http://localhost');
    const transaction = new Transaction();
    const signers = [new Keypair()];
    const signature = await sendRouterTransaction(connection, transaction, signers);
    
    expect(transaction.recentBlockhash).toBe('mock-blockhash');
    expect(transaction.feePayer?.toBase58()).toBe('mock-public-key');
    expect(transaction.sign).toHaveBeenCalledWith(...signers);
    expect(signature).toBe('mock-signature');
    expect(global.fetch).toHaveBeenCalledWith('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBlockhashForAccounts',
        params: [['mock-fee-payer', 'key1']]
      })
    });
  });
});

describe('getWritableAccounts', () => {
  it('returns writable accounts from transaction', () => {
    const transaction = {
      feePayer: mockPublicKey('fee-payer'),
      instructions: [
        {
          keys: [
            { pubkey: mockPublicKey('key1'), isWritable: true },
            { pubkey: mockPublicKey('key2'), isWritable: false },
            { pubkey: mockPublicKey('key3'), isWritable: true }
          ]
        }
      ]
    } as any;
    
    const result = getWritableAccounts(transaction);
    expect(result).toEqual(['fee-payer', 'key1', 'key3']);
  });

  it('handles transaction without feePayer', () => {
    const transaction = {
      feePayer: null,
      instructions: [
        {
          keys: [
            { pubkey: mockPublicKey('key1'), isWritable: true },
            { pubkey: mockPublicKey('key2'), isWritable: false }
          ]
        }
      ]
    } as any;
    
    const result = getWritableAccounts(transaction);
    expect(result).toEqual(['key1']);
  });

  it('handles transaction without instructions', () => {
    const transaction = {
      feePayer: mockPublicKey('fee-payer'),
      instructions: []
    } as any;
    
    const result = getWritableAccounts(transaction);
    expect(result).toEqual(['fee-payer']);
  });

  it('deduplicates writable accounts', () => {
    const transaction = {
      feePayer: mockPublicKey('fee-payer'),
      instructions: [
        {
          keys: [
            { pubkey: mockPublicKey('key1'), isWritable: true },
            { pubkey: mockPublicKey('key1'), isWritable: true }, // Duplicate
            { pubkey: mockPublicKey('key2'), isWritable: false }
          ]
        }
      ]
    } as any;
    
    const result = getWritableAccounts(transaction);
    expect(result).toEqual(['fee-payer', 'key1']);
  });
}); 

describe('getClosestValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and returns the closest validator public key', async () => {
    const mockIdentityData = {
      result: {
        identity: 'mock-validator-identity'
      }
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve(mockIdentityData)
    });

    const connection = new Connection('http://localhost');
    const result = await getClosestValidator(connection);

    expect(global.fetch).toHaveBeenCalledWith('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getIdentity',
        params: []
      })
    });

    expect(result.toBase58()).toBe('mock-validator-identity');
  });

  it('handles fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const connection = new Connection('http://localhost');
    
    await expect(getClosestValidator(connection)).rejects.toThrow('Network error');
  });

  it('handles invalid response format', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ error: 'Invalid response' })
    });

    const connection = new Connection('http://localhost');
    
    await expect(getClosestValidator(connection)).rejects.toThrow();
  });
}); 