import { generateSwapTestData } from "./src/generateSwapTestData";
import type { Config } from "./src/types";

const RPC_URL = {
	11155111: Bun.env.SEPOLIA_RPC_URL,
};

async function generateTestData() {
	const configFile = './config.json';
	const config = await readConfig(configFile);
	const overWrite = Bun.argv[2] === "true";
	for(const swap of config.swaps) {
		const rpcUrl = RPC_URL[swap.chainId];
		if(!rpcUrl) throw new Error(`Missing RPC env for chain: ${swap.chainId}`);
		await generateSwapTestData({
			...swap,
			rpcUrl
		}, overWrite);
	}
}

async function readConfig(path: string) {
	const file = Bun.file(path);
	const contents = await file.json();
	return contents as Config;
}

generateTestData();
