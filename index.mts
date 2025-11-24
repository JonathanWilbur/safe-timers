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

/**
 * A safe timeout that correctly handles large delays. This is a safe equivalent
 * of NodeJS's `Timeout` class.
 */
export class SafeTimeout {
	/**
	 * @summary Whether this was cancelled
	 * @description
	 * 
	 * If set to `true`, the timeout callback will abort.
	 * 
	 * **WARNING**: Do not modify this. This is not supposed to be part of the
	 * public API.
	 * 
	 * @internal
	 * @type {boolean}
	 */
	public cancelled: boolean = false;

	/**
	 * @summary Callback for cancelling this timeout
	 * @description
	 * 
	 * This intended usage of this is clearing the underlying timeout.
	 * 
	 * **WARNING**: Do not modify this. This is not supposed to be part of the
	 * public API.
	 *
	 * @internal
	 */
	public onCancel: (() => void) | null = null;

	/**
	 * @constructor
	 */
	constructor() {}

	/**
	 * @summary Cancel this timeout
	 * @description
	 * 
	 * You should use `clearSafeTimeout` instead of this.
	 * 
	 * @internal
	 */
	public cancel(): void {
		this.cancelled = true;
		this.onCancel?.();
	}
}

/**
 * A safe timeout that correctly handles large delays. This is a safe equivalent
 * of NodeJS's `Timeout` class.
 */
export class SafeInterval {
	/**
	 * @summary Whether this was cancelled
	 * @description
	 * 
	 * If set to `true`, the interval callback will abort and no further
	 * iterations will be scheduled.
	 * 
	 * **WARNING**: Do not modify this. This is not supposed to be part of the
	 * public API.
	 * 
	 * @internal
	 * @type {boolean}
	 */
	public cancelled: boolean = false;

	/**
	 * @summary The safe timeout that underlies the next iteration of this interval
	 * @description
	 * 
	 * Yes, the `SafeInterval` is implemented just using repeated creation of
	 * `SafeTimeout`s.
	 */
	public next: SafeTimeout | null = null;

	/**
	 * @constructor
	 */
	constructor() {}

	/**
	 * @summary Cancel this interval
	 * @description
	 * 
	 * You should use `clearSafeInterval` instead of this.
	 * 
	 * @internal
	 */
	public cancel(): void {
		this.cancelled = true;
		this.next?.cancel();
	}
}

/**
 * @summary Create a safe timeout
 * @param callback The function to call when the timer elapses.
 * @param delay The number of milliseconds to wait before calling the callback.
 * @param args Optional arguments to pass when the callback is called.
 * @returns A `SafeTimeout`, which can be cancelled using `clearSafeTimeout`
 * @function
 */
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

/**
 * @summary Clear / cancel a timeout
 * @param timeout The timeout to clear / cancel
 * @function
 */
export function clearSafeTimeout(timeout: SafeTimeout): void {
	timeout.cancel();
}

/**
 * @summary Create a safe interval
 * @param callback The function to call when the timer elapses.
 * @param delay The number of milliseconds to wait before calling the callback.
 * @param args Optional arguments to pass when the callback is called.
 * @returns A `SafeInterval`, which can be cancelled using `clearSafeInterval`
 * @function
 */
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

/**
 * @summary Clear / cancel an interval
 * @param interval The interval to clear / cancel
 * @function
 */
export function clearSafeInterval(interval: SafeInterval): void {
	interval.cancel();
}
