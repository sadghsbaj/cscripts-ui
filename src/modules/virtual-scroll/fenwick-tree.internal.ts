/**
 * Row-indexed Binary Indexed Tree (Fenwick Tree) backed by `Float64Array`
 * for O(log R) prefix sums, point updates, and binary-lifting offset lookup.
 */
export class FenwickTree {
    #length = 0;
    #total = 0;
    #values = new Float64Array(0);
    #tree = new Float64Array(1);

    constructor(length = 0) {
        if (length > 0) {
            this.resize(length);
        }
    }

    get length(): number {
        return this.#length;
    }

    get total(): number {
        return this.#total;
    }

    /**
     * Returns the stored value at row `index`.
     */
    get(index: number): number {
        if (index < 0 || index >= this.#length) return 0;
        return this.#values[index] ?? 0;
    }

    /**
     * Sets row `index` to `value` and returns the delta (`value - oldValue`).
     */
    set(index: number, value: number): number {
        if (index < 0 || index >= this.#length) return 0;
        const oldValue = this.#values[index] ?? 0;
        const delta = value - oldValue;
        if (delta === 0) return 0;

        this.#values[index] = value;
        this.#total += delta;

        for (let i = index + 1; i <= this.#length; i += i & -i) {
            this.#tree[i] = (this.#tree[i] ?? 0) + delta;
        }

        return delta;
    }

    /**
     * Adds `delta` to row `index`.
     */
    add(index: number, delta: number): void {
        if (index < 0 || index >= this.#length || delta === 0) return;

        this.#values[index] = (this.#values[index] ?? 0) + delta;
        this.#total += delta;

        for (let i = index + 1; i <= this.#length; i += i & -i) {
            this.#tree[i] = (this.#tree[i] ?? 0) + delta;
        }
    }

    /**
     * Returns the prefix sum of rows `[0, count)`.
     */
    sum(count: number): number {
        const clamped = Math.min(Math.max(0, count), this.#length);
        let acc = 0;
        for (let i = clamped; i > 0; i -= i & -i) {
            acc += this.#tree[i] ?? 0;
        }
        return acc;
    }

    /**
     * Binary-lifting search returning the largest row index `r` in `[0, length]`
     * such that `sum(r) <= offset`.
     */
    lowerBound(offset: number): number {
        if (this.#length === 0 || offset <= 0) return 0;
        if (offset >= this.#total) return this.#length;

        let pos = 0;
        let acc = 0;
        // Highest power of 2 <= this.#length
        const highestBit = 1 << Math.floor(Math.log2(this.#length));

        for (let step = highestBit; step > 0; step >>= 1) {
            const next = pos + step;
            if (next <= this.#length) {
                const branchSum = this.#tree[next] ?? 0;
                if (acc + branchSum <= offset) {
                    pos = next;
                    acc += branchSum;
                }
            }
        }

        return pos;
    }

    /**
     * Resizes internal storage for `newLength` rows, zero-initializing entries.
     */
    resize(newLength: number): void {
        const len = Math.max(0, Math.floor(newLength));
        this.#length = len;
        this.#total = 0;

        if (this.#values.length < len) {
            this.#values = new Float64Array(len);
        } else {
            this.#values.fill(0, 0, len);
        }

        if (this.#tree.length < len + 1) {
            this.#tree = new Float64Array(len + 1);
        } else {
            this.#tree.fill(0, 0, len + 1);
        }
    }

    /**
     * Rebuilds the tree in O(N) time from `values`.
     */
    build(values: ArrayLike<number>): void {
        const len = values.length;
        this.#length = len;

        if (this.#values.length < len) {
            this.#values = new Float64Array(len);
        }
        if (this.#tree.length < len + 1) {
            this.#tree = new Float64Array(len + 1);
        } else {
            this.#tree.fill(0, 0, len + 1);
        }

        let total = 0;
        for (let i = 0; i < len; i++) {
            const val = values[i] ?? 0;
            this.#values[i] = val;
            total += val;
            this.#tree[i + 1] = (this.#tree[i + 1] ?? 0) + val;
            const parent = i + 1 + ((i + 1) & -(i + 1));
            if (parent <= len) {
                this.#tree[parent] = (this.#tree[parent] ?? 0) + (this.#tree[i + 1] ?? 0);
            }
        }

        this.#total = total;
    }
}
