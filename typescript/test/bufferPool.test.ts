// pnpm test -- bufferPool.test.ts
import { describe, expect, test } from 'vitest';
import { BufferState, Vault } from '../src/index';

describe('buffer pool', () => {
    test('should wrap when < maxDeposit', () => {
        const vault = new Vault();

        const pool: BufferState = {
            poolType: 'Buffer',
            rate: 1122761623535914092n,
            poolAddress: '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
            tokens: [
                '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            ],
            maxDeposit: 1900471418535512n,
            maxMint: 1692675790387594n,
        };

        const calculatedAmount = vault.swap(
            {
                amountRaw: 100000000n,
                tokenIn: '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
                tokenOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                swapKind: 0,
            },
            pool,
        );
        expect(calculatedAmount).toEqual(112276162n);
    });
    test('should throw when > maxDeposit', () => {
        const vault = new Vault();

        const pool: BufferState = {
            poolType: 'Buffer',
            rate: 1122761623535914092n,
            poolAddress: '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
            tokens: [
                '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            ],
            maxDeposit: 1900471418535512n,
            maxMint: 1692675790387594n,
        };
        expect(() => {
            vault.swap(
                {
                    amountRaw: pool.maxDeposit! + 1n,
                    tokenIn: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
                    tokenOut: '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
                    swapKind: 0,
                },
                pool,
            );
        }).toThrowError(
            'ERC4626ExceededMaxDeposit 1900471418535513 1900471418535512',
        );
    });
    test('should wrap when < maxMint', () => {
        const vault = new Vault();

        const pool: BufferState = {
            poolType: 'Buffer',
            rate: 1122761623535914092n,
            poolAddress: '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
            tokens: [
                '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            ],
            maxDeposit: 1900471418535512n,
            maxMint: 1692675790387594n,
        };

        const calculatedAmount = vault.swap(
            {
                amountRaw: 100000000n,
                tokenIn: '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
                tokenOut: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                swapKind: 1,
            },
            pool,
        );
        expect(calculatedAmount).toEqual(89066101n);
    });
    test('should throw when > maxMint', () => {
        const vault = new Vault();

        const pool: BufferState = {
            poolType: 'Buffer',
            rate: 1122761623535914092n,
            poolAddress: '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
            tokens: [
                '0xd4fa2d31b7968e448877f69a96de69f5de8cd23e',
                '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            ],
            maxDeposit: 1900471418535512n,
            maxMint: 1692675790387594n,
        };
        expect(() => {
            vault.swap(
                {
                    amountRaw: pool.maxMint! + 1n,
                    tokenIn: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
                    tokenOut: '0xb19382073c7A0aDdbb56Ac6AF1808Fa49e377B75',
                    swapKind: 1,
                },
                pool,
            );
        }).toThrowError(
            'ERC4626ExceededMaxMint 1692675790387595 1692675790387594',
        );
    });
});
