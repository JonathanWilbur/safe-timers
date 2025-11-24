// TODO: https://github.com/Wizcorp/safe-timers/issues/6

// All common browsers limit the interval to 2^31 numbers.
// For this reason, we need some workarounds if we want to use intervals larger than that.

/// All common browsers limit the interval to 2^31 numbers.
let maxInterval: number = Math.pow(2, 31) - 1;

/**
 * **WARNING**: Do not modify this. This is not supposed to be part of the public API.
 */
export const $ = {
	/**
	 * **WARNING**: Do not modify this. This is not supposed to be part of the public API.
	 * @internal
	 */
	__illegally_change_max_interval_for_testing_purposes: (newValue: number): void => {
		maxInterval = newValue;
	},
};

function clamp(interval: number): number {
	return interval <= maxInterval ? interval : maxInterval;
}

export class SafeTimeout {
	/**
	 * **WARNING**: Do not modify this. This is not supposed to be part of the public API.
	 * @internal
	 */
	public cancelled: boolean = false;

	/**
	 * **WARNING**: Do not modify this. This is not supposed to be part of the public API.
	 * @internal
	 */
	public onCancel: (() => void) | null = null;

	constructor() {}

	public cancel(): void {
		this.cancelled = true;
		this.onCancel?.();
	}
}

export class SafeInterval {
	/**
	 * **WARNING**: Do not modify this. This is not supposed to be part of the public API.
	 * @internal
	 */
	public cancelled: boolean = false;

	public next: SafeTimeout | null = null;

	constructor() {}

	public cancel(): void {
		this.cancelled = true;
		this.next?.cancel();
	}

	[Symbol.dispose](): void {
		this.next?.cancel();
	}
}

export function setSafeTimeout<TArgs extends any[]>(callback: (...args: TArgs) => void, delay: number, ...args: TArgs): SafeTimeout {
	const safe = new SafeTimeout();
	const deadlineEpochTimeInMillis: number = Date.now() + delay;
	const realCallback = (...args: TArgs): void => {
		if (safe.cancelled) {
			return;
		}
		const now = Date.now();
		if (now < deadlineEpochTimeInMillis) {
			// It is not really time yet: schedule another callback.
			const timeRemaining = clamp(deadlineEpochTimeInMillis - now);
			const timeout = setTimeout(realCallback, timeRemaining, ...args);
			safe.onCancel = () => { clearTimeout(timeout); };
			return;
		}
		return callback(...args); // It is time now: invoke the callback.
	};
	const timeout = setTimeout(realCallback, clamp(delay), ...args);
	safe.onCancel = () => { clearTimeout(timeout); };
	return safe;
}

export function clearSafeTimeout(timeout: SafeTimeout): void {
	timeout.cancel();
}

export function setSafeInterval<TArgs extends any[]>(callback: (...args: TArgs) => void, delay: number, ...args: TArgs): SafeInterval {
	const safe = new SafeInterval();
	const realCallback = (...args: TArgs): void => {
		if (safe.cancelled || safe.next?.cancelled) {
			return;
		}
		// safe.next?.cancel();
		callback(...args); // Call the current iteration
		// The interval may be cancelled by the callback itself, so we have to check for cancellation again.
		if (safe.cancelled) {
			return;
		}
		// Schedule the next iteration
		safe.next = setSafeTimeout(realCallback, delay, ...args);
	};
	safe.next = setSafeTimeout(realCallback, delay, ...args);
	return safe;
}

export function clearSafeInterval(interval: SafeInterval): void {
	interval.cancel();
}
