class FixedPointError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FixedPointError';
    }
}

export class SignedFixedPoint {
    public static readonly ONE = BigInt('1000000000000000000'); // 1e18
    public static readonly ONE_XP = BigInt(
        '100000000000000000000000000000000000000',
    ); // 1e38

    static add(a: bigint, b: bigint): bigint {
        const c = a + b;
        if (!(b >= 0n ? c >= a : c < a)) {
            throw new FixedPointError('AddOverflow');
        }
        return c;
    }

    static addMag(a: bigint, b: bigint): bigint {
        return a > 0n ? this.add(a, b) : this.sub(a, b);
    }

    static sub(a: bigint, b: bigint): bigint {
        const c = a - b;
        if (!(b <= 0n ? c >= a : c < a)) {
            throw new FixedPointError('SubOverflow');
        }
        return c;
    }

    static mulDownMag(a: bigint, b: bigint): bigint {
        const product = a * b;
        if (!(a === 0n || product / a === b)) {
            throw new FixedPointError('MulOverflow');
        }
        return product / this.ONE;
    }

    static mulDownMagU(a: bigint, b: bigint): bigint {
        return (a * b) / this.ONE;
    }

    static mulUpMag(a: bigint, b: bigint): bigint {
        const product = a * b;
        if (!(a === 0n || product / a === b)) {
            throw new FixedPointError('MulOverflow');
        }

        if (product > 0n) {
            return (product - 1n) / this.ONE + 1n;
        } else if (product < 0n) {
            return (product + 1n) / this.ONE - 1n;
        }
        return 0n;
    }

    static mulUpMagU(a: bigint, b: bigint): bigint {
        const product = a * b;
        if (product > 0n) {
            return (product - 1n) / this.ONE + 1n;
        } else if (product < 0n) {
            return (product + 1n) / this.ONE - 1n;
        }
        return 0n;
    }

    static divDownMag(a: bigint, b: bigint): bigint {
        if (b === 0n) {
            throw new FixedPointError('ZeroDivision');
        }
        if (a === 0n) {
            return 0n;
        }

        const aInflated = a * this.ONE;
        if (aInflated / a !== this.ONE) {
            throw new FixedPointError('DivInterval');
        }

        return aInflated / b;
    }

    static divDownMagU(a: bigint, b: bigint): bigint {
        if (b === 0n) {
            throw new FixedPointError('ZeroDivision');
        }
        return (a * this.ONE) / b;
    }

    static divUpMag(a: bigint, b: bigint): bigint {
        if (b === 0n) {
            throw new FixedPointError('ZeroDivision');
        }
        if (a === 0n) {
            return 0n;
        }

        let localA = a;
        let localB = b;
        if (b < 0n) {
            localB = -b;
            localA = -a;
        }

        const aInflated = localA * this.ONE;
        if (aInflated / localA !== this.ONE) {
            throw new FixedPointError('DivInterval');
        }

        if (aInflated > 0n) {
            return (aInflated - 1n) / localB + 1n;
        }
        return (aInflated + 1n) / localB - 1n;
    }

    static divUpMagU(a: bigint, b: bigint): bigint {
        if (b === 0n) {
            throw new FixedPointError('ZeroDivision');
        }
        if (a === 0n) {
            return 0n;
        }

        let localA = a;
        let localB = b;
        if (b < 0n) {
            localB = -b;
            localA = -a;
        }

        if (localA > 0n) {
            return (localA * this.ONE - 1n) / localB + 1n;
        }
        return (localA * this.ONE + 1n) / localB - 1n;
    }

    static mulXp(a: bigint, b: bigint): bigint {
        const product = a * b;
        if (!(a === 0n || product / a === b)) {
            throw new FixedPointError('MulOverflow');
        }
        return product / this.ONE_XP;
    }

    static mulXpU(a: bigint, b: bigint): bigint {
        return (a * b) / this.ONE_XP;
    }

    static divXp(a: bigint, b: bigint): bigint {
        if (b === 0n) {
            throw new FixedPointError('ZeroDivision');
        }
        if (a === 0n) {
            return 0n;
        }

        const aInflated = a * this.ONE_XP;
        if (aInflated / a !== this.ONE_XP) {
            throw new FixedPointError('DivInterval');
        }

        return aInflated / b;
    }

    static divXpU(a: bigint, b: bigint): bigint {
        if (b === 0n) {
            throw new FixedPointError('ZeroDivision');
        }
        return (a * this.ONE_XP) / b;
    }

    static mulDownXpToNp(a: bigint, b: bigint): bigint {
        const E19 = BigInt('10000000000000000000');
        const b1 = b / E19;
        const prod1 = a * b1;
        if (!(a === 0n || prod1 / a === b1)) {
            throw new FixedPointError('MulOverflow');
        }
        const b2 = b % E19;
        const prod2 = a * b2;
        if (!(a === 0n || prod2 / a === b2)) {
            throw new FixedPointError('MulOverflow');
        }
        return prod1 >= 0n && prod2 >= 0n
            ? (prod1 + prod2 / E19) / E19
            : (prod1 + prod2 / E19 + 1n) / E19 - 1n;
    }

    static mulDownXpToNpU(a: bigint, b: bigint): bigint {
        const E19 = BigInt('10000000000000000000');
        const b1 = b / E19;
        const b2 = b % E19;
        const prod1 = a * b1;
        const prod2 = a * b2;
        return prod1 >= 0n && prod2 >= 0n
            ? (prod1 + prod2 / E19) / E19
            : (prod1 + prod2 / E19 + 1n) / E19 - 1n;
    }

    static mulUpXpToNp(a: bigint, b: bigint): bigint {
        const E19 = BigInt('10000000000000000000');
        const b1 = b / E19;
        const prod1 = a * b1;
        if (!(a === 0n || prod1 / a === b1)) {
            throw new FixedPointError('MulOverflow');
        }
        const b2 = b % E19;
        const prod2 = a * b2;
        if (!(a === 0n || prod2 / a === b2)) {
            throw new FixedPointError('MulOverflow');
        }
        return prod1 <= 0n && prod2 <= 0n
            ? (prod1 + prod2 / E19) / E19
            : (prod1 + prod2 / E19 - 1n) / E19 + 1n;
    }

    static mulUpXpToNpU(a: bigint, b: bigint): bigint {
        const E19 = BigInt('10000000000000000000');
        const b1 = b / E19;
        const b2 = b % E19;
        const prod1 = a * b1;
        const prod2 = a * b2;
        return prod1 <= 0n && prod2 <= 0n
            ? (prod1 + prod2 / E19) / E19
            : (prod1 + prod2 / E19 - 1n) / E19 + 1n;
    }

    static complement(x: bigint): bigint {
        if (x >= this.ONE || x <= 0n) {
            return 0n;
        }
        return this.ONE - x;
    }
}
