import { generatePoolTestData } from './src/generatePoolTestData';
import type { Config } from './src/types';

const RPC_URL = {
    1: Bun.env.ETHEREUM_RPC_URL,
    11155111: Bun.env.SEPOLIA_RPC_URL,
    8453: Bun.env.BASE_RPC_URL,
};

async function generateSimulationData() {
    const configFile = './config_simulator.json';
    const config = await readConfig(configFile);
    const overWrite = Bun.argv[2] === 'true';
    const outputDir = './simulationData'; // Use simulationData instead of testData

    for (const poolTest of config.poolTests) {
        const rpcUrl = RPC_URL[poolTest.chainId];
        if (!rpcUrl)
            throw new Error(`Missing RPC env for chain: ${poolTest.chainId}`);
        await generatePoolTestData(
            {
                ...poolTest,
                rpcUrl,
            },
            overWrite,
            outputDir, // Pass custom output directory
        );
    }
}

async function readConfig(path: string) {
    const file = Bun.file(path);
    const contents = await file.json();
    return contents as Config;
}

generateSimulationData();
