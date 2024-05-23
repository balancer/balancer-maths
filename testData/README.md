# testdata

Helper to generate common test data that maths references can test against.

Generate script will use onchain calls to retrieve pool data (mutable and immutable required for maths) and swap results. These will be saved to local json file so that maths libraries can use them as a common data and result source to test against.

## To Use

Add .env with following:
```
SEPOLIA_RPC_URL=
```

Install dependencies:

```bash
bun install
```

Generate some test data:

Edit `index.ts` to include your test data input. 
(WIP > CLI to configure to come)

Run `bun run generate`.

Test data will be retrieved and saved in ./swapData.

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.0.5. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
