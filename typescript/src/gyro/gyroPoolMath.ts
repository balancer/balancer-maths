import { MathSol, WAD } from '../utils/math';

export class GyroPoolMath {
    static _SQRT_1E_NEG_1 = 316227766016837933n;
    static _SQRT_1E_NEG_3 = 31622776601683793n;
    static _SQRT_1E_NEG_5 = 3162277660168379n;
    static _SQRT_1E_NEG_7 = 316227766016837n;
    static _SQRT_1E_NEG_9 = 31622776601683n;
    static _SQRT_1E_NEG_11 = 3162277660168n;
    static _SQRT_1E_NEG_13 = 316227766016n;
    static _SQRT_1E_NEG_15 = 31622776601n;
    static _SQRT_1E_NEG_17 = 3162277660n;

    /// @dev Implements a square root algorithm using Newton's method and a first-guess optimization.
    static sqrt(input: bigint, tolerance: bigint): bigint {
        if (input === 0n) {
            return 0n;
        }

        let guess = this._makeInitialGuess(input);

        // At this point `guess` is an estimation with one bit of precision. We know the true value is a uint128,
        // since it is the square root of a uint256. Newton's method converges quadratically (precision doubles at
        // every iteration). We thus need at most 7 iterations to turn our partial result with one bit of precision
        // into the expected uint128 result.
        guess = (guess + (input * WAD) / guess) / 2n;
        guess = (guess + (input * WAD) / guess) / 2n;
        guess = (guess + (input * WAD) / guess) / 2n;
        guess = (guess + (input * WAD) / guess) / 2n;
        guess = (guess + (input * WAD) / guess) / 2n;
        guess = (guess + (input * WAD) / guess) / 2n;
        guess = (guess + (input * WAD) / guess) / 2n;

        // Check that squaredGuess (guess * guess) is close enough from input. `guess` has less than 1 wei error, but
        // the loss of precision in the 18 decimal representation causes an error in the squared number, which must be
        // less than `(guess * tolerance) / WAD`. Tolerance, in this case, is a very small number (< 10),
        // so the tolerance will be very small too.
        const guessSquared = MathSol.mulDownFixed(guess, guess);
        if (
            !(
                guessSquared <= input + MathSol.mulUpFixed(guess, tolerance) &&
                guessSquared >= input - MathSol.mulUpFixed(guess, tolerance)
            )
        ) {
            throw Error('_sqrt FAILED');
        }

        return guess;
    }

    static _makeInitialGuess(input: bigint): bigint {
        if (input >= WAD) {
            return (1n << this._intLog2Halved(input / WAD)) * WAD;
        } else {
            if (input <= 10n) return this._SQRT_1E_NEG_17;
            if (input <= 100n) return 10n ** 10n;
            if (input <= 1000n) return this._SQRT_1E_NEG_15;
            if (input <= 10000n) return 10n ** 11n;
            if (input <= 100000n) return this._SQRT_1E_NEG_13;
            if (input <= 1000000n) return 10n ** 12n;
            if (input <= 10000000n) return this._SQRT_1E_NEG_11;
            if (input <= 100000000n) return 10n ** 13n;
            if (input <= 1000000000n) return this._SQRT_1E_NEG_9;
            if (input <= 10000000000n) return 10n ** 14n;
            if (input <= 100000000000n) return this._SQRT_1E_NEG_7;
            if (input <= 1000000000000n) return 10n ** 15n;
            if (input <= 10000000000000n) return this._SQRT_1E_NEG_5;
            if (input <= 100000000000000n) return 10n ** 16n;
            if (input <= 1000000000000000n) return this._SQRT_1E_NEG_3;
            if (input <= 10000000000000000n) return 10n ** 17n;
            if (input <= 100000000000000000n) return this._SQRT_1E_NEG_1;
            return input;
        }
    }

    static _intLog2Halved(x: bigint): bigint {
        let n = 0n; // Initialize n as a BigInt

        if (x >= 1n << 128n) {
            x >>= 128n;
            n += 64n;
        }
        if (x >= 1n << 64n) {
            x >>= 64n;
            n += 32n;
        }
        if (x >= 1n << 32n) {
            x >>= 32n;
            n += 16n;
        }
        if (x >= 1n << 16n) {
            x >>= 16n;
            n += 8n;
        }
        if (x >= 1n << 8n) {
            x >>= 8n;
            n += 4n;
        }
        if (x >= 1n << 4n) {
            x >>= 4n;
            n += 2n;
        }
        if (x >= 1n << 2n) {
            x >>= 2n;
            n += 1n;
        }

        return n;
    }
}
