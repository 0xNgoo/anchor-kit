import {
  Account,
  Memo as StellarMemo,
  TransactionBuilder,
  Asset,
  MuxedAccount,
  Networks,
  Operation,
  StrKey,
  Transaction,
} from '@stellar/stellar-sdk';
import { ValidationUtils } from './validation';

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
  operations: unknown[];
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
      // For hash memo, we expect a 32-byte value. If transactionId is a UUID,
      // it's 16 bytes. We keep it as is, the SDK handles string/buffer.
      return {
        value: transactionId,
        type: 'hash',
      };
    }
    // Text memo is strictly limited to 28 bytes.
    // If using a UUID string, we must truncate, but 28 chars of a UUID v4
    // still provides sufficient uniqueness (> 10^30 combinations).
    return {
      value: transactionId.substring(0, 28),
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

    if (!isValidPaymentAccountAddress(source)) {
      throw new Error('source must be a valid Stellar public or muxed public key');
    }

    if (!isValidPaymentAccountAddress(destination)) {
      throw new Error('destination must be a valid Stellar public or muxed public key');
    }

    if (assetCode !== 'XLM' && !StrKey.isValidEd25519PublicKey(issuer ?? '')) {
      throw new Error('issuer must be a valid Stellar public key for non-native assets');
    }

    const networkPassphrase =
      network === 'public'
        ? Networks.PUBLIC
        : network === 'futurenet'
          ? Networks.FUTURENET
          : Networks.TESTNET;

    const asset = assetCode === 'XLM' ? Asset.native() : new Asset(assetCode, issuer as string);

    // We use a dummy sequence number because the actual submission will be handled later
    // or by a signer that manages sequence numbers.
    const sourceAccount = StrKey.isValidMed25519PublicKey(source)
      ? MuxedAccount.fromAddress(source, '0')
      : new Account(source, '0');

    const builder = new TransactionBuilder(sourceAccount, {
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
    return ValidationUtils.isValidStellarAddress(accountId);
  },
};

function isValidPaymentAccountAddress(address: string): boolean {
  return StrKey.isValidEd25519PublicKey(address) || StrKey.isValidMed25519PublicKey(address);
}
