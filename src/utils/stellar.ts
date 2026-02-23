import {
  Keypair,
  Memo as StellarMemo,
  TransactionBuilder,
  Asset,
  Networks,
  Operation,
  Transaction,
} from '@stellar/stellar-sdk';

/**
 * Stellar memo types
 */
export type Memo = {
  value: string;
  type: 'text' | 'id' | 'hash' | 'return';
};

/**
 * Parsed transaction structure
 */
export interface ParsedTransaction {
  source: string;
  sequence: string;
  fee: string;
  memo?: Memo;
  operations: any[];
}

/**
 * Parameters for building a payment transaction
 */
export interface PaymentParams {
  source: string;
  destination: string;
  amount: string;
  assetCode: string;
  issuer?: string;
  memo?: Memo;
  network?: 'testnet' | 'public' | 'futurenet' | string;
}

/**
 * StellarUtils helper object providing reusable utilities for common Stellar tasks.
 */
export const StellarUtils = {
  /**
   * Generates a Stellar memo based on the transaction ID.
   *
   * @param transactionId - The internal transaction ID to use as the memo value
   * @param type - The memo type ('hash' or 'text')
   * @returns A Memo object
   */
  generateMemo(transactionId: string, type: 'hash' | 'text' = 'hash'): Memo {
    if (type === 'hash') {
      // For hash memo, we usually expect a 64-character hex string (32 bytes)
      return {
        value: transactionId,
        type: 'hash',
      };
    }
    return {
      value: transactionId.substring(0, 28), // Text memo is limited to 28 bytes
      type: 'text',
    };
  },

  /**
   * Parses a Base64-encoded XDR transaction.
   *
   * @param xdr - Base64-encoded Stellar transaction XDR
   * @returns ParsedTransaction object with key details
   */
  parseXdrTransaction(xdr: string): ParsedTransaction {
    try {
      // We don't know the network here, but for parsing core fields it might not matter
      // unless we're verifying signatures. Defaulting to Testnet for parsing.
      const tx = new Transaction(xdr, Networks.TESTNET);

      let memo: Memo | undefined;
      if (tx.memo && tx.memo.type !== 'none') {
        memo = {
          value: tx.memo.value ? tx.memo.value.toString() : '',
          type: tx.memo.type as 'text' | 'id' | 'hash' | 'return',
        };
      }

      return {
        source: tx.source,
        sequence: tx.sequence,
        fee: tx.fee.toString(),
        memo,
        operations: tx.operations,
      };
    } catch (error) {
      throw new Error(`Failed to parse XDR transaction: ${(error as Error).message}`, {
        cause: error,
      });
    }
  },

  /**
   * Builds a payment transaction XDR.
   *
   * @param params - Payment parameters
   * @returns Base64-encoded transaction XDR
   */
  async buildPaymentXdr(params: PaymentParams): Promise<string> {
    const { source, destination, amount, assetCode, issuer, memo, network } = params;

    const networkPassphrase =
      network === 'public'
        ? Networks.PUBLIC
        : network === 'futurenet'
          ? Networks.FUTURENET
          : Networks.TESTNET;

    const asset = assetCode === 'XLM' ? Asset.native() : new Asset(assetCode, issuer as string);

    // We use a dummy sequence number because the actual submission will be handled later
    // or by a signer that manages sequence numbers.
    const sourceAccount = {
      sequenceNumber: () => '0',
      incrementSequenceNumber: () => {},
      accountId: () => source,
    };

    const builder = new TransactionBuilder(sourceAccount, {
      // Removed 'as any'
      fee: '100',
      networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination,
          asset,
          amount,
        }),
      )
      .setTimeout(0); // Added .setTimeout(0)

    if (memo) {
      let stellarMemo: StellarMemo;
      switch (memo.type) {
        case 'text':
          stellarMemo = StellarMemo.text(memo.value);
          break;
        case 'id':
          stellarMemo = StellarMemo.id(memo.value);
          break;
        case 'hash':
          stellarMemo = StellarMemo.hash(memo.value);
          break;
        case 'return':
          stellarMemo = StellarMemo.return(memo.value);
          break;
        default:
          throw new Error(`Unsupported memo type: ${memo.type}`);
      }
      builder.addMemo(stellarMemo);
    }

    return builder.build().toXDR();
  },

  /**
   * Validates a Stellar account ID (starting with 'G').
   *
   * @param accountId - The public key to validate
   * @returns true if valid, false otherwise
   */
  validateAccountId(accountId: string): boolean {
    try {
      Keypair.fromPublicKey(accountId);
      return accountId.startsWith('G');
    } catch {
      return false;
    }
  },

  /**
   * Checks if a string is a valid Stellar address/account ID.
   * Simple alias for validateAccountId to match common naming.
   *
   * @param address - The string to check
   * @returns true if it's a valid Stellar account ID
   */
  isStellarAddress(address: string): boolean {
    return this.validateAccountId(address);
  },
};
