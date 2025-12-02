import { parseAbi } from 'abitype';

export default parseAbi([
    'function getSurgeThresholdPercentage(address pool) view returns (uint256)',
    'function getMaxSurgeFeePercentage(address pool) view returns (uint256)',
]);
