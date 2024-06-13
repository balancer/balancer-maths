export const vaultV3Abi = [
    {
        inputs: [
            {
                internalType: 'contract IVaultExtension',
                name: 'vaultExtension',
                type: 'address',
            },
            {
                internalType: 'contract IAuthorizer',
                name: 'authorizer',
                type: 'address',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'target',
                type: 'address',
            },
        ],
        name: 'AddressEmptyCode',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
        ],
        name: 'AddressInsufficientBalance',
        type: 'error',
    },
    {
        inputs: [],
        name: 'AfterAddLiquidityHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'AfterInitializeHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'AfterRemoveLiquidityHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'AfterSwapHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'AllZeroInputs',
        type: 'error',
    },
    {
        inputs: [],
        name: 'AmountGivenZero',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'AmountInAboveMax',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'AmountOutBelowMin',
        type: 'error',
    },
    {
        inputs: [],
        name: 'BalanceNotSettled',
        type: 'error',
    },
    {
        inputs: [],
        name: 'BalanceOverflow',
        type: 'error',
    },
    {
        inputs: [],
        name: 'BeforeAddLiquidityHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'BeforeInitializeHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'BeforeRemoveLiquidityHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'BeforeSwapHookFailed',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'BptAmountInAboveMax',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'BptAmountOutBelowMin',
        type: 'error',
    },
    {
        inputs: [],
        name: 'CannotReceiveEth',
        type: 'error',
    },
    {
        inputs: [],
        name: 'CannotSwapSameToken',
        type: 'error',
    },
    {
        inputs: [],
        name: 'DoesNotSupportAddLiquidityCustom',
        type: 'error',
    },
    {
        inputs: [],
        name: 'DoesNotSupportRemoveLiquidityCustom',
        type: 'error',
    },
    {
        inputs: [],
        name: 'DoesNotSupportUnbalancedLiquidity',
        type: 'error',
    },
    {
        inputs: [],
        name: 'DynamicSwapFeeHookFailed',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'allowance',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'needed',
                type: 'uint256',
            },
        ],
        name: 'ERC20InsufficientAllowance',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'balance',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'needed',
                type: 'uint256',
            },
        ],
        name: 'ERC20InsufficientBalance',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'approver',
                type: 'address',
            },
        ],
        name: 'ERC20InvalidApprover',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'receiver',
                type: 'address',
            },
        ],
        name: 'ERC20InvalidReceiver',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
        ],
        name: 'ERC20InvalidSender',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
        ],
        name: 'ERC20InvalidSpender',
        type: 'error',
    },
    {
        inputs: [],
        name: 'FailedInnerCall',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InputLengthMismatch',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidAddLiquidityKind',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidRemoveLiquidityKind',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidToken',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidTokenConfiguration',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidTokenType',
        type: 'error',
    },
    {
        inputs: [],
        name: 'MaxTokens',
        type: 'error',
    },
    {
        inputs: [],
        name: 'MinTokens',
        type: 'error',
    },
    {
        inputs: [],
        name: 'MultipleNonZeroInputs',
        type: 'error',
    },
    {
        inputs: [],
        name: 'NotStaticCall',
        type: 'error',
    },
    {
        inputs: [],
        name: 'NotVaultDelegateCall',
        type: 'error',
    },
    {
        inputs: [],
        name: 'OperationNotSupported',
        type: 'error',
    },
    {
        inputs: [],
        name: 'PauseBufferPeriodDurationTooLarge',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolAlreadyInitialized',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolAlreadyRegistered',
        type: 'error',
    },
    {
        inputs: [],
        name: 'PoolCreatorFeePercentageTooHigh',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolInRecoveryMode',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolNotInRecoveryMode',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolNotInitialized',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolNotPaused',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolNotRegistered',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolPauseWindowExpired',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolPaused',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ProtocolFeesExceedSwapFee',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ProtocolSwapFeePercentageTooHigh',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ProtocolYieldFeePercentageTooHigh',
        type: 'error',
    },
    {
        inputs: [],
        name: 'QueriesDisabled',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ReentrancyGuardReentrantCall',
        type: 'error',
    },
    {
        inputs: [],
        name: 'RouterNotTrusted',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'SafeCastOverflowedUintToInt',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'SafeERC20FailedOperation',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
        ],
        name: 'SenderIsNotVault',
        type: 'error',
    },
    {
        inputs: [],
        name: 'SwapFeePercentageTooHigh',
        type: 'error',
    },
    {
        inputs: [],
        name: 'SwapFeePercentageTooLow',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'SwapLimit',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'TokenAlreadyRegistered',
        type: 'error',
    },
    {
        inputs: [],
        name: 'TokenNotRegistered',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'expectedToken',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'actualToken',
                type: 'address',
            },
        ],
        name: 'TokensMismatch',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'TotalSupplyTooLow',
        type: 'error',
    },
    {
        inputs: [],
        name: 'UserDataNotSupported',
        type: 'error',
    },
    {
        inputs: [],
        name: 'VaultIsNotUnlocked',
        type: 'error',
    },
    {
        inputs: [],
        name: 'VaultNotPaused',
        type: 'error',
    },
    {
        inputs: [],
        name: 'VaultPauseWindowDurationTooLarge',
        type: 'error',
    },
    {
        inputs: [],
        name: 'VaultPauseWindowExpired',
        type: 'error',
    },
    {
        inputs: [],
        name: 'VaultPaused',
        type: 'error',
    },
    {
        inputs: [],
        name: 'WrongVaultAdminDeployment',
        type: 'error',
    },
    {
        inputs: [],
        name: 'WrongVaultExtensionDeployment',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ZeroDivision',
        type: 'error',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
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
        inputs: [
            {
                indexed: true,
                internalType: 'contract IAuthorizer',
                name: 'newAuthorizer',
                type: 'address',
            },
        ],
        name: 'AuthorizerChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'liquidityProvider',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'contract IERC20[]',
                name: 'tokens',
                type: 'address[]',
            },
            {
                indexed: false,
                internalType: 'int256[]',
                name: 'deltas',
                type: 'int256[]',
            },
        ],
        name: 'PoolBalanceChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'PoolCreatorFeeCollected',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'uint256',
                name: 'poolCreatorFeePercentage',
                type: 'uint256',
            },
        ],
        name: 'PoolCreatorFeePercentageChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'PoolCreatorSwapFeeCharged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'PoolCreatorYieldFeeCharged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolInitialized',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'bool',
                name: 'paused',
                type: 'bool',
            },
        ],
        name: 'PoolPausedStateChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'bool',
                name: 'recoveryMode',
                type: 'bool',
            },
        ],
        name: 'PoolRecoveryModeStateChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'factory',
                type: 'address',
            },
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
                indexed: false,
                internalType: 'struct TokenConfig[]',
                name: 'tokenConfig',
                type: 'tuple[]',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'pauseWindowEndTime',
                type: 'uint256',
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
                indexed: false,
                internalType: 'struct PoolRoleAccounts',
                name: 'roleAccounts',
                type: 'tuple',
            },
            {
                components: [
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeInitialize',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterInitialize',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallComputeDynamicSwapFee',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeSwap',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterSwap',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeAddLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterAddLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeRemoveLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterRemoveLiquidity',
                        type: 'bool',
                    },
                ],
                indexed: false,
                internalType: 'struct PoolHooks',
                name: 'poolHooks',
                type: 'tuple',
            },
            {
                components: [
                    {
                        internalType: 'bool',
                        name: 'disableUnbalancedLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'enableAddLiquidityCustom',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'enableRemoveLiquidityCustom',
                        type: 'bool',
                    },
                ],
                indexed: false,
                internalType: 'struct LiquidityManagement',
                name: 'liquidityManagement',
                type: 'tuple',
            },
        ],
        name: 'PoolRegistered',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'ProtocolFeeCollected',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'ProtocolSwapFeeCharged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'uint256',
                name: 'swapFeePercentage',
                type: 'uint256',
            },
        ],
        name: 'ProtocolSwapFeePercentageChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'ProtocolYieldFeeCharged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'uint256',
                name: 'yieldFeePercentage',
                type: 'uint256',
            },
        ],
        name: 'ProtocolYieldFeePercentageChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'contract IERC20',
                name: 'tokenIn',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'contract IERC20',
                name: 'tokenOut',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amountIn',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amountOut',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'swapFeePercentage',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'swapFeeAmount',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'contract IERC20',
                name: 'swapFeeToken',
                type: 'address',
            },
        ],
        name: 'Swap',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'uint256',
                name: 'swapFeePercentage',
                type: 'uint256',
            },
        ],
        name: 'SwapFeePercentageChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
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
                indexed: false,
                internalType: 'bool',
                name: 'paused',
                type: 'bool',
            },
        ],
        name: 'VaultPausedStateChanged',
        type: 'event',
    },
    {
        stateMutability: 'payable',
        type: 'fallback',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'pool',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'to',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'maxAmountsIn',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'uint256',
                        name: 'minBptAmountOut',
                        type: 'uint256',
                    },
                    {
                        internalType: 'enum AddLiquidityKind',
                        name: 'kind',
                        type: 'uint8',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct AddLiquidityParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'addLiquidity',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'amountsIn',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256',
                name: 'bptAmountOut',
                type: 'uint256',
            },
            {
                internalType: 'bytes',
                name: 'returnData',
                type: 'bytes',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getAuthorizer',
        outputs: [
            {
                internalType: 'contract IAuthorizer',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'getPoolTokenCountAndIndexOfToken',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getVaultExtension',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'reentrancyGuardEntered',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'pool',
                        type: 'address',
                    },
                    {
                        internalType: 'address',
                        name: 'from',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'maxBptAmountIn',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256[]',
                        name: 'minAmountsOut',
                        type: 'uint256[]',
                    },
                    {
                        internalType: 'enum RemoveLiquidityKind',
                        name: 'kind',
                        type: 'uint8',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct RemoveLiquidityParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'removeLiquidity',
        outputs: [
            {
                internalType: 'uint256',
                name: 'bptAmountIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256[]',
                name: 'amountsOut',
                type: 'uint256[]',
            },
            {
                internalType: 'bytes',
                name: 'returnData',
                type: 'bytes',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'sendTo',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'settle',
        outputs: [
            {
                internalType: 'uint256',
                name: 'paid',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
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
                        internalType: 'address',
                        name: 'pool',
                        type: 'address',
                    },
                    {
                        internalType: 'contract IERC20',
                        name: 'tokenIn',
                        type: 'address',
                    },
                    {
                        internalType: 'contract IERC20',
                        name: 'tokenOut',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'amountGivenRaw',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'limitRaw',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct SwapParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'swap',
        outputs: [
            {
                internalType: 'uint256',
                name: 'amountCalculated',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'amountIn',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'amountOut',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes',
                name: 'data',
                type: 'bytes',
            },
        ],
        name: 'unlock',
        outputs: [
            {
                internalType: 'bytes',
                name: 'result',
                type: 'bytes',
            },
        ],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        stateMutability: 'payable',
        type: 'receive',
    }, // extension starts here
    {
        inputs: [
            {
                internalType: 'contract IVault',
                name: 'mainVault',
                type: 'address',
            },
            {
                internalType: 'contract IVaultAdmin',
                name: 'vaultAdmin',
                type: 'address',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'target',
                type: 'address',
            },
        ],
        name: 'AddressEmptyCode',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
        ],
        name: 'AddressInsufficientBalance',
        type: 'error',
    },
    {
        inputs: [],
        name: 'AfterAddLiquidityHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'AfterInitializeHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'AfterRemoveLiquidityHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'AfterSwapHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'AmountGivenZero',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'AmountInAboveMax',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'AmountOutBelowMin',
        type: 'error',
    },
    {
        inputs: [],
        name: 'BalanceNotSettled',
        type: 'error',
    },
    {
        inputs: [],
        name: 'BalanceOverflow',
        type: 'error',
    },
    {
        inputs: [],
        name: 'BeforeAddLiquidityHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'BeforeInitializeHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'BeforeRemoveLiquidityHookFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'BeforeSwapHookFailed',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'BptAmountInAboveMax',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'BptAmountOutBelowMin',
        type: 'error',
    },
    {
        inputs: [],
        name: 'CannotReceiveEth',
        type: 'error',
    },
    {
        inputs: [],
        name: 'CannotSwapSameToken',
        type: 'error',
    },
    {
        inputs: [],
        name: 'CodecOverflow',
        type: 'error',
    },
    {
        inputs: [],
        name: 'DoesNotSupportAddLiquidityCustom',
        type: 'error',
    },
    {
        inputs: [],
        name: 'DoesNotSupportRemoveLiquidityCustom',
        type: 'error',
    },
    {
        inputs: [],
        name: 'DoesNotSupportUnbalancedLiquidity',
        type: 'error',
    },
    {
        inputs: [],
        name: 'DynamicSwapFeeHookFailed',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'allowance',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'needed',
                type: 'uint256',
            },
        ],
        name: 'ERC20InsufficientAllowance',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'balance',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'needed',
                type: 'uint256',
            },
        ],
        name: 'ERC20InsufficientBalance',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'approver',
                type: 'address',
            },
        ],
        name: 'ERC20InvalidApprover',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'receiver',
                type: 'address',
            },
        ],
        name: 'ERC20InvalidReceiver',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
        ],
        name: 'ERC20InvalidSender',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
        ],
        name: 'ERC20InvalidSpender',
        type: 'error',
    },
    {
        inputs: [],
        name: 'FailedInnerCall',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InputLengthMismatch',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidAddLiquidityKind',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidRemoveLiquidityKind',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidToken',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidTokenConfiguration',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidTokenType',
        type: 'error',
    },
    {
        inputs: [],
        name: 'MaxTokens',
        type: 'error',
    },
    {
        inputs: [],
        name: 'MinTokens',
        type: 'error',
    },
    {
        inputs: [],
        name: 'NotStaticCall',
        type: 'error',
    },
    {
        inputs: [],
        name: 'NotVaultDelegateCall',
        type: 'error',
    },
    {
        inputs: [],
        name: 'OperationNotSupported',
        type: 'error',
    },
    {
        inputs: [],
        name: 'OutOfBounds',
        type: 'error',
    },
    {
        inputs: [],
        name: 'PauseBufferPeriodDurationTooLarge',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolAlreadyInitialized',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolAlreadyRegistered',
        type: 'error',
    },
    {
        inputs: [],
        name: 'PoolCreatorFeePercentageTooHigh',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolInRecoveryMode',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolNotInRecoveryMode',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolNotInitialized',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolNotPaused',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolNotRegistered',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolPauseWindowExpired',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolPaused',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ProtocolFeesExceedSwapFee',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ProtocolSwapFeePercentageTooHigh',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ProtocolYieldFeePercentageTooHigh',
        type: 'error',
    },
    {
        inputs: [],
        name: 'QueriesDisabled',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ReentrancyGuardReentrantCall',
        type: 'error',
    },
    {
        inputs: [],
        name: 'RouterNotTrusted',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'SafeCastOverflowedUintToInt',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
        ],
        name: 'SenderIsNotVault',
        type: 'error',
    },
    {
        inputs: [],
        name: 'SwapFeePercentageTooHigh',
        type: 'error',
    },
    {
        inputs: [],
        name: 'SwapFeePercentageTooLow',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'SwapLimit',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'TokenAlreadyRegistered',
        type: 'error',
    },
    {
        inputs: [],
        name: 'TokenNotRegistered',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'expectedToken',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'actualToken',
                type: 'address',
            },
        ],
        name: 'TokensMismatch',
        type: 'error',
    },
    {
        inputs: [],
        name: 'TokensNotSorted',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'limit',
                type: 'uint256',
            },
        ],
        name: 'TotalSupplyTooLow',
        type: 'error',
    },
    {
        inputs: [],
        name: 'UserDataNotSupported',
        type: 'error',
    },
    {
        inputs: [],
        name: 'VaultIsNotUnlocked',
        type: 'error',
    },
    {
        inputs: [],
        name: 'VaultNotPaused',
        type: 'error',
    },
    {
        inputs: [],
        name: 'VaultPauseWindowDurationTooLarge',
        type: 'error',
    },
    {
        inputs: [],
        name: 'VaultPauseWindowExpired',
        type: 'error',
    },
    {
        inputs: [],
        name: 'VaultPaused',
        type: 'error',
    },
    {
        inputs: [],
        name: 'WrongVaultAdminDeployment',
        type: 'error',
    },
    {
        inputs: [],
        name: 'WrongVaultExtensionDeployment',
        type: 'error',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
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
        inputs: [
            {
                indexed: true,
                internalType: 'contract IAuthorizer',
                name: 'newAuthorizer',
                type: 'address',
            },
        ],
        name: 'AuthorizerChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'liquidityProvider',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'contract IERC20[]',
                name: 'tokens',
                type: 'address[]',
            },
            {
                indexed: false,
                internalType: 'int256[]',
                name: 'deltas',
                type: 'int256[]',
            },
        ],
        name: 'PoolBalanceChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'PoolCreatorFeeCollected',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'uint256',
                name: 'poolCreatorFeePercentage',
                type: 'uint256',
            },
        ],
        name: 'PoolCreatorFeePercentageChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'PoolCreatorSwapFeeCharged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'PoolCreatorYieldFeeCharged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'PoolInitialized',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'bool',
                name: 'paused',
                type: 'bool',
            },
        ],
        name: 'PoolPausedStateChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'bool',
                name: 'recoveryMode',
                type: 'bool',
            },
        ],
        name: 'PoolRecoveryModeStateChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'factory',
                type: 'address',
            },
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
                indexed: false,
                internalType: 'struct TokenConfig[]',
                name: 'tokenConfig',
                type: 'tuple[]',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'pauseWindowEndTime',
                type: 'uint256',
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
                indexed: false,
                internalType: 'struct PoolRoleAccounts',
                name: 'roleAccounts',
                type: 'tuple',
            },
            {
                components: [
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeInitialize',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterInitialize',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallComputeDynamicSwapFee',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeSwap',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterSwap',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeAddLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterAddLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeRemoveLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterRemoveLiquidity',
                        type: 'bool',
                    },
                ],
                indexed: false,
                internalType: 'struct PoolHooks',
                name: 'poolHooks',
                type: 'tuple',
            },
            {
                components: [
                    {
                        internalType: 'bool',
                        name: 'disableUnbalancedLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'enableAddLiquidityCustom',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'enableRemoveLiquidityCustom',
                        type: 'bool',
                    },
                ],
                indexed: false,
                internalType: 'struct LiquidityManagement',
                name: 'liquidityManagement',
                type: 'tuple',
            },
        ],
        name: 'PoolRegistered',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'ProtocolFeeCollected',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'ProtocolSwapFeeCharged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'uint256',
                name: 'swapFeePercentage',
                type: 'uint256',
            },
        ],
        name: 'ProtocolSwapFeePercentageChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'ProtocolYieldFeeCharged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'uint256',
                name: 'yieldFeePercentage',
                type: 'uint256',
            },
        ],
        name: 'ProtocolYieldFeePercentageChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'uint256',
                name: 'swapFeePercentage',
                type: 'uint256',
            },
        ],
        name: 'SwapFeePercentageChanged',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
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
                indexed: false,
                internalType: 'bool',
                name: 'paused',
                type: 'bool',
            },
        ],
        name: 'VaultPausedStateChanged',
        type: 'event',
    },
    {
        stateMutability: 'payable',
        type: 'fallback',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
        ],
        name: 'allowance',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'approve',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
        ],
        name: 'balanceOf',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
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
                        name: 'sender',
                        type: 'address',
                    },
                    {
                        internalType: 'bytes',
                        name: 'userData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct IBasePool.PoolSwapParams',
                name: 'swapParams',
                type: 'tuple',
            },
        ],
        name: 'computeDynamicSwapFee',
        outputs: [
            {
                internalType: 'bool',
                name: 'success',
                type: 'bool',
            },
            {
                internalType: 'uint256',
                name: 'dynamicSwapFee',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getNonzeroDeltaCount',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'getPoolConfig',
        outputs: [
            {
                components: [
                    {
                        components: [
                            {
                                internalType: 'bool',
                                name: 'shouldCallBeforeInitialize',
                                type: 'bool',
                            },
                            {
                                internalType: 'bool',
                                name: 'shouldCallAfterInitialize',
                                type: 'bool',
                            },
                            {
                                internalType: 'bool',
                                name: 'shouldCallComputeDynamicSwapFee',
                                type: 'bool',
                            },
                            {
                                internalType: 'bool',
                                name: 'shouldCallBeforeSwap',
                                type: 'bool',
                            },
                            {
                                internalType: 'bool',
                                name: 'shouldCallAfterSwap',
                                type: 'bool',
                            },
                            {
                                internalType: 'bool',
                                name: 'shouldCallBeforeAddLiquidity',
                                type: 'bool',
                            },
                            {
                                internalType: 'bool',
                                name: 'shouldCallAfterAddLiquidity',
                                type: 'bool',
                            },
                            {
                                internalType: 'bool',
                                name: 'shouldCallBeforeRemoveLiquidity',
                                type: 'bool',
                            },
                            {
                                internalType: 'bool',
                                name: 'shouldCallAfterRemoveLiquidity',
                                type: 'bool',
                            },
                        ],
                        internalType: 'struct PoolHooks',
                        name: 'hooks',
                        type: 'tuple',
                    },
                    {
                        components: [
                            {
                                internalType: 'bool',
                                name: 'disableUnbalancedLiquidity',
                                type: 'bool',
                            },
                            {
                                internalType: 'bool',
                                name: 'enableAddLiquidityCustom',
                                type: 'bool',
                            },
                            {
                                internalType: 'bool',
                                name: 'enableRemoveLiquidityCustom',
                                type: 'bool',
                            },
                        ],
                        internalType: 'struct LiquidityManagement',
                        name: 'liquidityManagement',
                        type: 'tuple',
                    },
                    {
                        internalType: 'uint256',
                        name: 'staticSwapFeePercentage',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'poolCreatorFeePercentage',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'tokenDecimalDiffs',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'pauseWindowEndTime',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bool',
                        name: 'isPoolRegistered',
                        type: 'bool',
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
                ],
                internalType: 'struct PoolConfig',
                name: '',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'getPoolCreator',
        outputs: [
            {
                internalType: 'address',
                name: 'poolCreator',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'getPoolCreatorFees',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'getPoolPausedState',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'getPoolTokenInfo',
        outputs: [
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
                name: 'tokenConfig',
                type: 'tuple[]',
            },
            {
                internalType: 'uint256[]',
                name: 'balancesRaw',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[]',
                name: 'decimalScalingFactors',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'getPoolTokens',
        outputs: [
            {
                internalType: 'contract IERC20[]',
                name: '',
                type: 'address[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'getProtocolFees',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getProtocolSwapFeePercentage',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getProtocolYieldFeePercentage',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'getReservesOf',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'getStaticSwapFeeManager',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'getStaticSwapFeePercentage',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'contract IERC20',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'getTokenDelta',
        outputs: [
            {
                internalType: 'int256',
                name: '',
                type: 'int256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'getVaultAdmin',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                internalType: 'contract IERC20[]',
                name: 'tokens',
                type: 'address[]',
            },
            {
                internalType: 'uint256[]',
                name: 'exactAmountsIn',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256',
                name: 'minBptAmountOut',
                type: 'uint256',
            },
            {
                internalType: 'bytes',
                name: 'userData',
                type: 'bytes',
            },
        ],
        name: 'initialize',
        outputs: [
            {
                internalType: 'uint256',
                name: 'bptAmountOut',
                type: 'uint256',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'isPoolInRecoveryMode',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'isPoolInitialized',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'isPoolPaused',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
        ],
        name: 'isPoolRegistered',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'isQueryDisabled',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'isUnlocked',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes',
                name: 'data',
                type: 'bytes',
            },
        ],
        name: 'quote',
        outputs: [
            {
                internalType: 'bytes',
                name: 'result',
                type: 'bytes',
            },
        ],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'reentrancyGuardEntered',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
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
                name: 'tokenConfig',
                type: 'tuple[]',
            },
            {
                internalType: 'uint256',
                name: 'swapFeePercentage',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'pauseWindowEndTime',
                type: 'uint256',
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
                components: [
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeInitialize',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterInitialize',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallComputeDynamicSwapFee',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeSwap',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterSwap',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeAddLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterAddLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallBeforeRemoveLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'shouldCallAfterRemoveLiquidity',
                        type: 'bool',
                    },
                ],
                internalType: 'struct PoolHooks',
                name: 'poolHooks',
                type: 'tuple',
            },
            {
                components: [
                    {
                        internalType: 'bool',
                        name: 'disableUnbalancedLiquidity',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'enableAddLiquidityCustom',
                        type: 'bool',
                    },
                    {
                        internalType: 'bool',
                        name: 'enableRemoveLiquidityCustom',
                        type: 'bool',
                    },
                ],
                internalType: 'struct LiquidityManagement',
                name: 'liquidityManagement',
                type: 'tuple',
            },
        ],
        name: 'registerPool',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'pool',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'from',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'exactBptAmountIn',
                type: 'uint256',
            },
        ],
        name: 'removeLiquidityRecovery',
        outputs: [
            {
                internalType: 'uint256[]',
                name: 'amountsOutRaw',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'totalSupply',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'transfer',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'from',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
        ],
        name: 'transferFrom',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'vault',
        outputs: [
            {
                internalType: 'contract IVault',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        stateMutability: 'payable',
        type: 'receive',
    },
] as const;
