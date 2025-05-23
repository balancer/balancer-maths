export const quantAmmAbi = [
    {
        inputs: [
            {
                components: [
                    { internalType: 'string', name: 'name', type: 'string' },
                    { internalType: 'string', name: 'symbol', type: 'string' },
                    {
                        internalType: 'uint256',
                        name: 'numTokens',
                        type: 'uint256',
                    },
                    { internalType: 'string', name: 'version', type: 'string' },
                    {
                        internalType: 'address',
                        name: 'updateWeightRunner',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'poolRegistry',
                        type: 'uint256',
                    },
                    {
                        internalType: 'string[][]',
                        name: 'poolDetails',
                        type: 'string[][]',
                    },
                ],
                internalType: 'struct QuantAMMWeightedPool.NewPoolParams',
                name: 'params',
                type: 'tuple',
            },
            { internalType: 'contract IVault', name: 'vault', type: 'address' },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    { inputs: [], name: 'BaseOutOfBounds', type: 'error' },
    { inputs: [], name: 'ECDSAInvalidSignature', type: 'error' },
    {
        inputs: [{ internalType: 'uint256', name: 'length', type: 'uint256' }],
        name: 'ECDSAInvalidSignatureLength',
        type: 'error',
    },
    {
        inputs: [{ internalType: 'bytes32', name: 's', type: 'bytes32' }],
        name: 'ECDSAInvalidSignatureS',
        type: 'error',
    },
    {
        inputs: [
            { internalType: 'uint256', name: 'deadline', type: 'uint256' },
        ],
        name: 'ERC2612ExpiredSignature',
        type: 'error',
    },
    {
        inputs: [
            { internalType: 'address', name: 'signer', type: 'address' },
            { internalType: 'address', name: 'owner', type: 'address' },
        ],
        name: 'ERC2612InvalidSigner',
        type: 'error',
    },
    { inputs: [], name: 'ExponentOutOfBounds', type: 'error' },
    {
        inputs: [
            { internalType: 'address', name: 'account', type: 'address' },
            { internalType: 'uint256', name: 'currentNonce', type: 'uint256' },
        ],
        name: 'InvalidAccountNonce',
        type: 'error',
    },
    { inputs: [], name: 'InvalidExponent', type: 'error' },
    { inputs: [], name: 'InvalidInitialization', type: 'error' },
    { inputs: [], name: 'InvalidShortString', type: 'error' },
    { inputs: [], name: 'MaxInRatio', type: 'error' },
    { inputs: [], name: 'MaxOutRatio', type: 'error' },
    { inputs: [], name: 'NotInitializing', type: 'error' },
    { inputs: [], name: 'ProductOutOfBounds', type: 'error' },
    {
        inputs: [{ internalType: 'address', name: 'sender', type: 'address' }],
        name: 'SenderIsNotVault',
        type: 'error',
    },
    {
        inputs: [{ internalType: 'string', name: 'str', type: 'string' }],
        name: 'StringTooLong',
        type: 'error',
    },
    { inputs: [], name: 'WeightedPoolBptRateUnsupported', type: 'error' },
    { inputs: [], name: 'ZeroDivision', type: 'error' },
    { inputs: [], name: 'ZeroInvariant', type: 'error' },
    { inputs: [], name: 'maxTradeSizeRatioExceeded', type: 'error' },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'Approval',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [],
        name: 'EIP712DomainChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'uint64',
                name: 'version',
                type: 'uint64',
            },
        ],
        name: 'Initialized',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'rule',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'address[][]',
                name: 'poolOracles',
                type: 'address[][]',
            },
            {
                indexed: false,
                internalType: 'uint64[]',
                name: 'lambda',
                type: 'uint64[]',
            },
            {
                indexed: false,
                internalType: 'int256[][]',
                name: 'ruleParameters',
                type: 'int256[][]',
            },
            {
                indexed: false,
                internalType: 'uint64',
                name: 'epsilonMax',
                type: 'uint64',
            },
            {
                indexed: false,
                internalType: 'uint64',
                name: 'absoluteWeightGuardRail',
                type: 'uint64',
            },
            {
                indexed: false,
                internalType: 'uint40',
                name: 'updateInterval',
                type: 'uint40',
            },
            {
                indexed: false,
                internalType: 'address',
                name: 'poolManager',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'address',
                name: 'creatorAddress',
                type: 'address',
            },
        ],
        name: 'PoolRuleSet',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'from',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'Transfer',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'oldAddress',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'newAddress',
                type: 'address',
            },
        ],
        name: 'UpdateWeightRunnerAddressUpdated',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'poolAddress',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'int256[]',
                name: 'calculatedWeightsAndMultipliers',
                type: 'int256[]',
            },
            {
                indexed: false,
                internalType: 'uint40',
                name: 'lastInterpolationTimePossible',
                type: 'uint40',
            },
            {
                indexed: false,
                internalType: 'uint40',
                name: 'lastUpdateTime',
                type: 'uint40',
            },
        ],
        name: 'WeightsUpdated',
        type: 'event',
    },
    {
        inputs: [],
        name: 'DOMAIN_SEPARATOR',
        outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'PERMIT_TYPEHASH',
        outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'absoluteWeightGuardRail',
        outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'address', name: 'spender', type: 'address' },
        ],
        name: 'allowance',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256[]',
                name: 'balancesLiveScaled18',
                type: 'uint256[]',
            },
            { internalType: 'uint256', name: 'tokenInIndex', type: 'uint256' },
            {
                internalType: 'uint256',
                name: 'invariantRatio',
                type: 'uint256',
            },
        ],
        name: 'computeBalance',
        outputs: [
            { internalType: 'uint256', name: 'newBalance', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256[]',
                name: 'balancesLiveScaled18',
                type: 'uint256[]',
            },
            { internalType: 'enum Rounding', name: 'rounding', type: 'uint8' },
        ],
        name: 'computeInvariant',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'decimals',
        outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'deploymentTime',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'eip712Domain',
        outputs: [
            { internalType: 'bytes1', name: 'fields', type: 'bytes1' },
            { internalType: 'string', name: 'name', type: 'string' },
            { internalType: 'string', name: 'version', type: 'string' },
            { internalType: 'uint256', name: 'chainId', type: 'uint256' },
            {
                internalType: 'address',
                name: 'verifyingContract',
                type: 'address',
            },
            { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
            {
                internalType: 'uint256[]',
                name: 'extensions',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'emitApproval',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'from', type: 'address' },
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'emitTransfer',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'epsilonMax',
        outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getAggregateFeePercentages',
        outputs: [
            {
                internalType: 'uint256',
                name: 'aggregateSwapFeePercentage',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'aggregateYieldFeePercentage',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getCurrentLiveBalances',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'balancesLiveScaled18',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getMaximumInvariantRatio',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getMaximumSwapFeePercentage',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getMinimumInvariantRatio',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getMinimumSwapFeePercentage',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getNormalizedWeights',
        outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getOracleStalenessThreshold',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'string', name: 'category', type: 'string' },
            { internalType: 'string', name: 'name', type: 'string' },
        ],
        name: 'getPoolDetail',
        outputs: [
            { internalType: 'string', name: '', type: 'string' },
            { internalType: 'string', name: '', type: 'string' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getQuantAMMWeightedPoolDynamicData',
        outputs: [
            {
                components: [
                    {
                        internalType: 'uint256[]',
                        name: 'balancesLiveScaled18',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'tokenRates',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'totalSupply',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bool',
                        name: 'isPoolInitialized',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'isPoolPaused',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'isPoolInRecoveryMode',
                        type: 'bool',
                    },
                    {
                        internalType: 'int256[]',
                        name: 'firstFourWeightsAndMultipliers',
                        type: 'int256[]',
                    },
                    {
                        internalType: 'int256[]',
                        name: 'secondFourWeightsAndMultipliers',
                        type: 'int256[]',
                    },
                    {
                        internalType: 'uint40',
                        name: 'lastUpdateTime',
                        type: 'uint40',
                    },
                    {
                        internalType: 'uint40',
                        name: 'lastInteropTime',
                        type: 'uint40',
                    },
                ],
                internalType:
                    'struct IQuantAMMWeightedPool.QuantAMMWeightedPoolDynamicData',
                name: 'data',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getQuantAMMWeightedPoolImmutableData',
        outputs: [
            {
                components: [
                    {
                        internalType: 'contract IERC20[]',
                        name: 'tokens',
                        type: 'address[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'oracleStalenessThreshold',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'poolRegistry',
                        type: 'uint256',
                    },
                    {
                        internalType: 'int256[][]',
                        name: 'ruleParameters',
                        type: 'int256[][]',
                    },
                    {
                        internalType: 'uint64[]',
                        name: 'lambda',
                        type: 'uint64[]',
                    },
                    {
                        internalType: 'uint64',
                        name: 'epsilonMax',
                        type: 'uint64',
                    },
                    {
                        internalType: 'uint64',
                        name: 'absoluteWeightGuardRail',
                        type: 'uint64',
                    },
                    {
                        internalType: 'uint64',
                        name: 'updateInterval',
                        type: 'uint64',
                    },
                    {
                        internalType: 'uint256',
                        name: 'maxTradeSizeRatio',
                        type: 'uint256',
                    },
                ],
                internalType:
                    'struct IQuantAMMWeightedPool.QuantAMMWeightedPoolImmutableData',
                name: 'data',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getRate',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getStaticSwapFeePercentage',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getTokenInfo',
        outputs: [
            {
                internalType: 'contract IERC20[]',
                name: 'tokens',
                type: 'address[]',
            },
            {
                components: [
                    {
                        internalType: 'enum TokenType',
                        name: 'tokenType',
                        type: 'uint8',
                    },
                    {
                        internalType: 'contract IRateProvider',
                        name: 'rateProvider',
                        type: 'address',
                    },
                    {
                        internalType: 'bool',
                        name: 'paysYieldFees',
                        type: 'bool',
                    },
                ],
                internalType: 'struct TokenInfo[]',
                name: 'tokenInfo',
                type: 'tuple[]',
            },
            {
                internalType: 'uint256[]',
                name: 'balancesRaw',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[]',
                name: 'lastBalancesLiveScaled18',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getTokens',
        outputs: [
            {
                internalType: 'contract IERC20[]',
                name: 'tokens',
                type: 'address[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getVault',
        outputs: [
            { internalType: 'contract IVault', name: '', type: 'address' },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getWithinFixWindow',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'incrementNonce',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    { internalType: 'string', name: 'name', type: 'string' },
                    { internalType: 'string', name: 'symbol', type: 'string' },
                    {
                        components: [
                            {
                                internalType: 'contract IERC20',
                                name: 'token',
                                type: 'address',
                            },
                            {
                                internalType: 'enum TokenType',
                                name: 'tokenType',
                                type: 'uint8',
                            },
                            {
                                internalType: 'contract IRateProvider',
                                name: 'rateProvider',
                                type: 'address',
                            },
                            {
                                internalType: 'bool',
                                name: 'paysYieldFees',
                                type: 'bool',
                            },
                        ],
                        internalType: 'struct TokenConfig[]',
                        name: 'tokens',
                        type: 'tuple[]',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'normalizedWeights',
                        type: 'uint256[]',
                    },
                    {
                        components: [
                            {
                                internalType: 'address',
                                name: 'pauseManager',
                                type: 'address',
                            },
                            {
                                internalType: 'address',
                                name: 'swapFeeManager',
                                type: 'address',
                            },
                            {
                                internalType: 'address',
                                name: 'poolCreator',
                                type: 'address',
                            },
                        ],
                        internalType: 'struct PoolRoleAccounts',
                        name: 'roleAccounts',
                        type: 'tuple',
                    },
                    {
                        internalType: 'uint256',
                        name: 'swapFeePercentage',
                        type: 'uint256',
                    },
                    {
                        internalType: 'address',
                        name: 'poolHooksContract',
                        type: 'address',
                    },
                    {
                        internalType: 'bool',
                        name: 'enableDonation',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'disableUnbalancedLiquidity',
                        type: 'bool',
                    },
                    { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
                    {
                        internalType: 'int256[]',
                        name: '_initialWeights',
                        type: 'int256[]',
                    },
                    {
                        components: [
                            {
                                internalType: 'contract IERC20[]',
                                name: 'assets',
                                type: 'address[]',
                            },
                            {
                                internalType: 'contract IUpdateRule',
                                name: 'rule',
                                type: 'address',
                            },
                            {
                                internalType: 'address[][]',
                                name: 'oracles',
                                type: 'address[][]',
                            },
                            {
                                internalType: 'uint40',
                                name: 'updateInterval',
                                type: 'uint40',
                            },
                            {
                                internalType: 'uint64[]',
                                name: 'lambda',
                                type: 'uint64[]',
                            },
                            {
                                internalType: 'uint64',
                                name: 'epsilonMax',
                                type: 'uint64',
                            },
                            {
                                internalType: 'uint64',
                                name: 'absoluteWeightGuardRail',
                                type: 'uint64',
                            },
                            {
                                internalType: 'uint64',
                                name: 'maxTradeSizeRatio',
                                type: 'uint64',
                            },
                            {
                                internalType: 'int256[][]',
                                name: 'ruleParameters',
                                type: 'int256[][]',
                            },
                            {
                                internalType: 'address',
                                name: 'poolManager',
                                type: 'address',
                            },
                        ],
                        internalType:
                            'struct IQuantAMMWeightedPool.PoolSettings',
                        name: '_poolSettings',
                        type: 'tuple',
                    },
                    {
                        internalType: 'int256[]',
                        name: '_initialMovingAverages',
                        type: 'int256[]',
                    },
                    {
                        internalType: 'int256[]',
                        name: '_initialIntermediateValues',
                        type: 'int256[]',
                    },
                    {
                        internalType: 'uint256',
                        name: '_oracleStalenessThreshold',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'poolRegistry',
                        type: 'uint256',
                    },
                    {
                        internalType: 'string[][]',
                        name: 'poolDetails',
                        type: 'string[][]',
                    },
                ],
                internalType:
                    'struct QuantAMMWeightedPoolFactory.CreationNewPoolParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'initialize',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        name: 'lambda',
        outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'name',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
        name: 'nonces',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'enum SwapKind',
                        name: 'kind',
                        type: 'uint8',
                    },
                    {
                        internalType: 'uint256',
                        name: 'amountGivenScaled18',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'balancesScaled18',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'indexIn',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'indexOut',
                        type: 'uint256',
                    },
                    {
                        internalType: 'address',
                        name: 'router',
                        type: 'address',
                    },
                    { internalType: 'bytes', name: 'userData', type: 'bytes' },
                ],
                internalType: 'struct PoolSwapParams',
                name: 'request',
                type: 'tuple',
            },
        ],
        name: 'onSwap',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'owner', type: 'address' },
            { internalType: 'address', name: 'spender', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
            { internalType: 'uint256', name: 'deadline', type: 'uint256' },
            { internalType: 'uint8', name: 'v', type: 'uint8' },
            { internalType: 'bytes32', name: 'r', type: 'bytes32' },
            { internalType: 'bytes32', name: 's', type: 'bytes32' },
        ],
        name: 'permit',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'poolRegistry',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'uint256', name: '', type: 'uint256' },
            { internalType: 'uint256', name: '', type: 'uint256' },
        ],
        name: 'ruleParameters',
        outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '_updateWeightRunner',
                type: 'address',
            },
        ],
        name: 'setUpdateWeightRunnerAddress',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'int256[]', name: '_weights', type: 'int256[]' },
            { internalType: 'address', name: '_address', type: 'address' },
            {
                internalType: 'uint40',
                name: '_lastInteropTime',
                type: 'uint40',
            },
        ],
        name: 'setWeights',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' },
        ],
        name: 'supportsInterface',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'symbol',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'transfer',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: 'from', type: 'address' },
            { internalType: 'address', name: 'to', type: 'address' },
            { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'transferFrom',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'updateInterval',
        outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'updateWeightRunner',
        outputs: [
            {
                internalType: 'contract UpdateWeightRunner',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'version',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;
