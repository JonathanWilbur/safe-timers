/// <reference lib="deno.ns" />
import { setSafeTimeout, setSafeInterval, $, clearSafeInterval, clearSafeTimeout } from "./index.mts";
import { delay } from "jsr:@std/async";
import { deadline } from "jsr:@std/async";
import { fail } from "jsr:@std/assert";

$.__illegally_change_max_interval_for_testing_purposes(3000);

Deno.test("short timeout behaves normally", () => {
	return deadline(new Promise<void>((cb) => setSafeTimeout(cb, 500)), 1000);
});

Deno.test("long timeout behaves normally", () => {
	return deadline(new Promise<void>((cb) => setSafeTimeout(cb, 3500)), 5000);
});

Deno.test("short timeout can be cancelled", () => {
	return deadline(new Promise<void>(async (cb) => {
		const timeout = setSafeTimeout(() => fail("timeout failed to be cancelled"), 500);
		clearSafeTimeout(timeout);
		await delay(1000);
		cb();
	}), 2000);
});

Deno.test("long timeout can be cancelled (takes about five seconds)", () => {
	return deadline(new Promise<void>(async (cb) => {
		const timeout = setSafeTimeout(() => fail("timeout failed to be cancelled"), 3500);
		clearSafeTimeout(timeout);
		await delay(5000);
		cb();
	}), 7000);
});

Deno.test("short interval works and can be cancelled", () => {
	let calls: number = 0;
	return deadline(new Promise<void>((cb) => {
		const safe = setSafeInterval(() => {
			calls++;
			if (calls === 4) {
				fail("interval failed to be cancelled");
			}
			if (calls === 3) {
				clearSafeInterval(safe);
				delay(1000).then(cb);
			}
		}, 500);
	}), 5000);
});

Deno.test("long interval works and can be cancelled (takes about fifteen seconds)", () => {
	let calls: number = 0;
	return deadline(new Promise<void>((cb) => {
		const safe = setSafeInterval(() => {
			calls++;
			if (calls === 4) {
				fail("interval failed to be cancelled");
			}
			if (calls === 3) {
				clearSafeInterval(safe);
				delay(5000).then(cb);
			}
		}, 3500);
	}), 20000);
});

Deno.test("intervals do not cause a memory leak (takes about 30 seconds)", () => {
	let calls: number = 0;
	let climbs: number = 0;
	let biggestHeapSize: number = 0;
	return new Promise<void>((cb) => {
		const safe = setSafeInterval(() => {
			const heapSize = Deno.memoryUsage().heapUsed;
			if (heapSize > biggestHeapSize) {
				climbs++;
				if (climbs > 400) {
					fail("memory seems to grow: check for memory leaks");
				}
				biggestHeapSize = heapSize;
			}
			calls++;
			if (calls === 1000) {
				clearSafeInterval(safe);
				cb();
			}
		}, 25);
	});
});
