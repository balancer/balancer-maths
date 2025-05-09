import { BufferState } from '@/buffer/data';
import { GyroECLPState } from '@/gyro';
import { ReClammState } from '@/reClamm';
import type { StableState } from '@/stable/data';
import type { WeightedState } from '@/weighted/data';
import type { LiquidityBootstrappingState } from '@/liquidityBootstrapping';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { QuantAmmState } from '@/quantAmm/quantAmmData';

type PoolBase = {
    chainId: number;
    blockNumber: number;
    poolAddress: string;
};

type WeightedPool = PoolBase & WeightedState;

type StablePool = PoolBase & StableState;

type BufferPool = PoolBase & BufferState;

type GyroEPool = PoolBase & GyroECLPState;

type ReClammPool = PoolBase & ReClammState;

type LiquidityBootstrappingPool = PoolBase & LiquidityBootstrappingState;

type QuantAmmPool = PoolBase & QuantAmmState;

type SupportedPools =
    | WeightedPool
    | StablePool
    | BufferPool
    | GyroEPool
    | ReClammPool
    | LiquidityBootstrappingPool
    | QuantAmmPool;

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
                            kind: add.kind === 'Unbalanced' ? 0 : 1,
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
    if (pool.poolType === 'WEIGHTED') {
        return {
            ...pool,
            scalingFactors: pool.scalingFactors.map((sf) => BigInt(sf)),
            swapFee: BigInt(pool.swapFee),
            balancesLiveScaled18: pool.balancesLiveScaled18.map((b) =>
                BigInt(b),
            ),
            tokenRates: pool.tokenRates.map((r) => BigInt(r)),
            totalSupply: BigInt(pool.totalSupply),
            weights: (
                pool as TransformBigintToString<WeightedPool>
            ).weights.map((w) => BigInt(w)),
            aggregateSwapFee: BigInt(pool.aggregateSwapFee ?? '0'),
            supportsUnbalancedLiquidity:
                pool.supportsUnbalancedLiquidity === undefined
                    ? true
                    : pool.supportsUnbalancedLiquidity,
        };
    }
    if (pool.poolType === 'STABLE') {
        return {
            ...pool,
            scalingFactors: pool.scalingFactors.map((sf) => BigInt(sf)),
            swapFee: BigInt(pool.swapFee),
            balancesLiveScaled18: pool.balancesLiveScaled18.map((b) =>
                BigInt(b),
            ),
            tokenRates: pool.tokenRates.map((r) => BigInt(r)),
            totalSupply: BigInt(pool.totalSupply),
            amp: BigInt((pool as TransformBigintToString<StablePool>).amp),
            aggregateSwapFee: BigInt(pool.aggregateSwapFee ?? '0'),
            supportsUnbalancedLiquidity:
                pool.supportsUnbalancedLiquidity === undefined
                    ? true
                    : pool.supportsUnbalancedLiquidity,
        };
    }
    if (pool.poolType === 'Buffer') {
        return {
            ...pool,
            rate: BigInt(pool.rate),
        };
    }
    if (pool.poolType === 'GYROE') {
        return {
            ...pool,
            scalingFactors: pool.scalingFactors.map((sf) => BigInt(sf)),
            swapFee: BigInt(pool.swapFee),
            balancesLiveScaled18: pool.balancesLiveScaled18.map((b) =>
                BigInt(b),
            ),
            tokenRates: pool.tokenRates.map((r) => BigInt(r)),
            totalSupply: BigInt(pool.totalSupply),
            aggregateSwapFee: BigInt(pool.aggregateSwapFee ?? '0'),
            supportsUnbalancedLiquidity:
                pool.supportsUnbalancedLiquidity === undefined
                    ? true
                    : pool.supportsUnbalancedLiquidity,
            paramsAlpha: BigInt(pool.paramsAlpha),
            paramsBeta: BigInt(pool.paramsBeta),
            paramsC: BigInt(pool.paramsC),
            paramsS: BigInt(pool.paramsS),
            paramsLambda: BigInt(pool.paramsLambda),
            tauAlphaX: BigInt(pool.tauAlphaX),
            tauAlphaY: BigInt(pool.tauAlphaY),
            tauBetaX: BigInt(pool.tauBetaX),
            tauBetaY: BigInt(pool.tauBetaY),
            u: BigInt(pool.u),
            v: BigInt(pool.v),
            w: BigInt(pool.w),
            z: BigInt(pool.z),
            dSq: BigInt(pool.dSq),
        };
    }
    if (pool.poolType === 'RECLAMM') {
        return {
            ...pool,
            scalingFactors: pool.scalingFactors.map((sf) => BigInt(sf)),
            swapFee: BigInt(pool.swapFee),
            balancesLiveScaled18: pool.balancesLiveScaled18.map((b) =>
                BigInt(b),
            ),
            tokenRates: pool.tokenRates.map((r) => BigInt(r)),
            totalSupply: BigInt(pool.totalSupply),
            aggregateSwapFee: BigInt(pool.aggregateSwapFee ?? '0'),
            supportsUnbalancedLiquidity: false,
            lastVirtualBalances: pool.lastVirtualBalances.map((b) => BigInt(b)),
            dailyPriceShiftBase: BigInt(pool.dailyPriceShiftBase),
            lastTimestamp: BigInt(pool.lastTimestamp),
            currentTimestamp: BigInt(pool.currentTimestamp),
            centerednessMargin: BigInt(pool.centerednessMargin),
            startFourthRootPriceRatio: BigInt(pool.startFourthRootPriceRatio),
            endFourthRootPriceRatio: BigInt(pool.endFourthRootPriceRatio),
            priceRatioUpdateStartTime: BigInt(pool.priceRatioUpdateStartTime),
            priceRatioUpdateEndTime: BigInt(pool.priceRatioUpdateEndTime),
        };
    }
    if (pool.poolType === 'LIQUIDITY_BOOTSTRAPPING') {
        return {
            ...pool,
            scalingFactors: pool.scalingFactors.map((sf) => BigInt(sf)),
            swapFee: BigInt(pool.swapFee),
            balancesLiveScaled18: pool.balancesLiveScaled18.map((b) =>
                BigInt(b),
            ),
            startTime: BigInt(pool.startTime),
            endTime: BigInt(pool.endTime),
            tokenRates: pool.tokenRates.map((r) => BigInt(r)),
            totalSupply: BigInt(pool.totalSupply),
            weights: (
                pool as TransformBigintToString<LiquidityBootstrappingPool>
            ).weights.map((w) => BigInt(w)),
            startWeights: pool.startWeights.map((w) => BigInt(w)),
            endWeights: pool.endWeights.map((w) => BigInt(w)),
            aggregateSwapFee: BigInt(pool.aggregateSwapFee ?? '0'),
            // smart contracts allow for unbalanced liquidity. Due to low likelihood
            // of this being within maths/SOR, we set it to false
            supportsUnbalancedLiquidity: false,
            currentTimestamp: BigInt(pool.currentTimestamp ?? Date.now()),
        };
    }
    if (pool.poolType === 'QUANT_AMM_WEIGHTED') {
        return {
            ...pool,
            scalingFactors: pool.scalingFactors.map((sf) => BigInt(sf)),
            swapFee: BigInt(pool.swapFee),
            balancesLiveScaled18: pool.balancesLiveScaled18.map((b) =>
                BigInt(b),
            ),
            tokenRates: pool.tokenRates.map((r) => BigInt(r)),
            totalSupply: BigInt(pool.totalSupply),
            aggregateSwapFee: BigInt(pool.aggregateSwapFee ?? '0'),
            supportsUnbalancedLiquidity:
                pool.supportsUnbalancedLiquidity === undefined
                    ? true
                    : pool.supportsUnbalancedLiquidity,
            maxTradeSizeRatio: BigInt(pool.maxTradeSizeRatio),
            firstFourWeightsAndMultipliers:
                pool.firstFourWeightsAndMultipliers.map((w) => BigInt(w)),
            secondFourWeightsAndMultipliers:
                pool.secondFourWeightsAndMultipliers.map((w) => BigInt(w)),
            currentTimestamp: BigInt(pool.currentTimestamp),
            lastInteropTime: BigInt(pool.lastInteropTime),
            lastUpdateTime: BigInt(pool.lastUpdateTime),
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
