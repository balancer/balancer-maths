import { BufferState } from '@/buffer/data';
import type { StableState } from '@/stable/data';
import type { WeightedState } from '@/weighted/data';
import * as fs from 'node:fs';
import * as path from 'node:path';

type PoolBase = {
    chainId: number;
    blockNumber: number;
    poolAddress: string;
};

type WeightedPool = PoolBase & WeightedState;

type StablePool = PoolBase & StableState;

type BufferPool = PoolBase & BufferState;

type SupportedPools = WeightedPool | StablePool | BufferPool;

type PoolsMap = Map<string, SupportedPools>;

type Swap = {
    swapKind: number;
    amountRaw: bigint;
    outputRaw: bigint;
    tokenIn: string;
    tokenOut: string;
    test: string;
};

type Add = {
    kind: number;
    inputAmountsRaw: bigint[];
    bptOutRaw: bigint;
    test: string;
};

type Remove = {
    kind: number;
    amountsOutRaw: bigint[];
    bptInRaw: bigint;
    test: string;
};

type TestData = {
    swaps: Swap[];
    adds: Add[];
    pools: PoolsMap;
    removes: Remove[];
};

// Reads all json test files and parses to relevant swap/pool bigint format
export function readTestData(directoryPath: string): TestData {
    const pools: PoolsMap = new Map<string, SupportedPools>();
    const swaps: Swap[] = [];
    const adds: Add[] = [];
    const removes: Remove[] = [];
    const testData: TestData = {
        swaps,
        adds,
        pools,
        removes,
    };

    // Resolve the directory path relative to the current file's directory
    const absoluteDirectoryPath = path.resolve(__dirname, directoryPath);

    // Read all files in the directory
    const files = fs.readdirSync(absoluteDirectoryPath);

    // Iterate over each file
    for (const file of files) {
        // Check if the file ends with .json
        if (file.endsWith('.json')) {
            // Read the file content
            const fileContent = fs.readFileSync(
                path.join(absoluteDirectoryPath, file),
                'utf-8',
            );

            // Parse the JSON content
            try {
                const jsonData = JSON.parse(fileContent);
                if (jsonData.swaps)
                    swaps.push(
                        ...jsonData.swaps.map((swap) => ({
                            ...swap,
                            swapKind: Number(swap.swapKind),
                            amountRaw: BigInt(swap.amountRaw),
                            outputRaw: BigInt(swap.outputRaw),
                            test: file,
                        })),
                    );
                if (jsonData.adds)
                    adds.push(
                        ...jsonData.adds.map((add) => ({
                            ...add,
                            kind: add.kind === 'Proportional' ? 0 : 1,
                            inputAmountsRaw: add.inputAmountsRaw.map((a) =>
                                BigInt(a),
                            ),
                            bptOutRaw: BigInt(add.bptOutRaw),
                            test: file,
                        })),
                    );
                if (jsonData.removes)
                    removes.push(
                        ...jsonData.removes.map((remove) => ({
                            ...remove,
                            kind: mapRemoveKind(remove.kind),
                            amountsOutRaw: remove.amountsOutRaw.map((a) =>
                                BigInt(a),
                            ),
                            bptInRaw: BigInt(remove.bptInRaw),
                            test: file,
                        })),
                    );

                pools.set(file, mapPool(jsonData.pool));
            } catch (error) {
                console.error(`Error parsing JSON file ${file}:`, error);
            }
        }
    }

    return testData;
}

type TransformBigintToString<T> = {
    [K in keyof T]: T[K] extends bigint
        ? string
        : T[K] extends bigint[]
          ? string[]
          : T[K];
};

function mapPool(
    pool: TransformBigintToString<SupportedPools>,
): SupportedPools {
    if (pool.poolType === 'Weighted') {
        return {
            ...pool,
            scalingFactors: pool.scalingFactors.map((sf) => BigInt(sf)),
            swapFee: BigInt(pool.swapFee),
            balancesLiveScaled18: pool.balancesLiveScaled18.map((b) => BigInt(b)),
            tokenRates: pool.tokenRates.map((r) => BigInt(r)),
            totalSupply: BigInt(pool.totalSupply),
            weights: (
                pool as TransformBigintToString<WeightedPool>
            ).weights.map((w) => BigInt(w)),
        };
    }
    if (pool.poolType === 'Stable') {
        return {
            ...pool,
            scalingFactors: pool.scalingFactors.map((sf) => BigInt(sf)),
            swapFee: BigInt(pool.swapFee),
            balancesLiveScaled18: pool.balancesLiveScaled18.map((b) => BigInt(b)),
            tokenRates: pool.tokenRates.map((r) => BigInt(r)),
            totalSupply: BigInt(pool.totalSupply),
            amp: BigInt((pool as TransformBigintToString<StablePool>).amp),
        };
    }
    if (pool.poolType === 'Buffer') {
        return {
            ...pool,
            rate: BigInt(pool.rate),
        };
    }
    console.log(pool);
    throw new Error('mapPool: Unsupported Pool Type');
}

function mapRemoveKind(kind: string): number {
    if (kind === 'Proportional') return 0;
    else if (kind === 'SingleTokenExactIn') return 1;
    else if (kind === 'SingleTokenExactOut') return 2;
    else throw new Error(`Unsupported RemoveKind: ${kind}`);
}
