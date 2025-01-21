import type { TestInput, TestOutput } from './types';
import { getSwaps } from './getSwaps';
import { getPool } from './getPool';
import { getAddLiquiditys } from './getAdds';
import { getRemoveLiquiditys } from './getRemoves';

export async function generatePoolTestData(
    input: TestInput,
    overwrite = false,
) {
    const path = `./testData/${input.chainId}-${input.blockNumber}-${input.testName}.json`;
    if (!overwrite) {
        const file = Bun.file(path);
        if (await file.exists()) {
            console.log(
                'File already exists and overwrite set to false.',
                path,
            );
            return;
        }
    }
    console.log('Generating test data with input:\n', input);
    const testData = await fetchTestData(input);
    console.log('Saving test data to: ', path);
    await Bun.write(path, JSON.stringify(testData, null, 4));
    console.log('Complete');
}

async function fetchTestData(input: TestInput): Promise<TestOutput> {
    const {
        rpcUrl,
        chainId,
        poolAddress,
        poolType,
        blockNumber,
        adds,
        swaps,
        removes,
    } = input;
    const pool = await getPool(
        rpcUrl,
        chainId,
        blockNumber,
        poolType,
        poolAddress,
    );
    const swapResults = await getSwaps(
        swaps,
        rpcUrl,
        chainId,
        poolAddress,
        blockNumber,
        poolType,
    );
    const addResults = await getAddLiquiditys(
        adds,
        rpcUrl,
        chainId,
        poolAddress,
        poolType,
        blockNumber,
    );
    const removeResults = await getRemoveLiquiditys(
        removes,
        rpcUrl,
        chainId,
        poolAddress,
        poolType,
        blockNumber,
    );
    return {
        swaps: swapResults,
        adds: addResults,
        removes: removeResults,
        pool,
    };
}
