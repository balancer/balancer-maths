import type { Address } from 'viem';

export type HookType =
    | 'FEE_TAKING'
    | 'EXIT_FEE'
    | 'STABLE_SURGE'
    | 'MEV_TAX'
    | 'UNKNOWN';

export const HOOK_CONFIG: Record<number, Record<string, HookType>> = {
    // Sepolia
    11155111: {
        '0xbb1761af481364a6bd7fdbdb8cfa23abd85f0263': 'FEE_TAKING',
        '0xea672a54f0aa38fc5f0a1a481467bebfe3c71046': 'EXIT_FEE',
        '0x1adc55adb4caae71abb4c33f606493f4114d2091': 'STABLE_SURGE',
        '0xc0cbcdd6b823a4f22aa6bbdde44c17e754266aef': 'STABLE_SURGE',
        '0x30ce53fa38a1399f0ca158b5c38362c80e423ba9': 'STABLE_SURGE',
        '0x18b10fe9ec4815c31c4ab04fa6f91dce0695132f': 'MEV_TAX',
        '0xec9578e79d412537095501584284b092d2f6b9f7': 'MEV_TAX',
    },
    // Base
    8453: {
        '0xb2007b8b7e0260042517f635cfd8e6dd2dd7f007': 'STABLE_SURGE',
        '0xdb8d758bcb971e482b2c45f7f8a7740283a1bd3a': 'STABLE_SURGE',
        '0x7a2535f5fb47b8e44c02ef5d9990588313fe8f05': 'MEV_TAX',
    },
    // Mainnet
    1: {
        '0xb18fa0cb5de8cecb8899aae6e38b1b7ed77885da': 'STABLE_SURGE',
        '0xbdbadc891bb95dee80ebc491699228ef0f7d6ff1': 'STABLE_SURGE',
        '0x1bca39b01f451b0a05d7030e6e6981a73b716b1c': 'MEV_TAX',
    },
};

export function getHookType(chainId: number, address: Address): HookType {
    const chainConfig = HOOK_CONFIG[chainId];
    if (!chainConfig) return 'UNKNOWN';
    return chainConfig[address.toLowerCase()] || 'UNKNOWN';
}
