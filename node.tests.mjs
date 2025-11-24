import { test } from 'node:test';
import { setSafeTimeout, setSafeInterval, $, clearSafeInterval, clearSafeTimeout } from "./index.mjs";

$.__illegally_change_max_interval_for_testing_purposes(3000);

function delay (ms) {
    return new Promise((cb1) => setTimeout(cb1, ms));
}

function fail (msg) {
    throw new Error(msg);
}

test("short timeout behaves normally", { timeout: 3000 }, () => {
    return new Promise((cb) => setSafeTimeout(cb, 500));
});

test("long timeout behaves normally", { timeout: 5000 }, () => {
    return new Promise((cb) => setSafeTimeout(cb, 3500));
});

test("short timeout can be cancelled", { timeout: 2000 }, () => {
    return new Promise(async (cb) => {
        const timeout = setSafeTimeout(() => fail("timeout failed to be cancelled"), 500);
        clearSafeTimeout(timeout);
        await delay(1000);
        cb();
    });
});

test("long timeout can be cancelled (takes about five seconds)", { timeout: 7000 }, () => {
    return new Promise(async (cb) => {
        const timeout = setSafeTimeout(() => fail("timeout failed to be cancelled"), 3500);
        clearSafeTimeout(timeout);
        await delay(5000);
        cb();
    });
});

test("short interval works and can be cancelled", { timeout: 5000 }, () => {
    let calls = 0;
    return new Promise((cb) => {
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
    });
});

test("long interval works and can be cancelled (takes about fifteen seconds)", { timeout: 20000 }, () => {
    let calls = 0;
    return new Promise((cb) => {
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
    });
});

test("intervals do not cause a memory leak (takes about 30 seconds)", { timeout: 60000 }, () => {
    let calls = 0;
    let climbs = 0;
    let biggestHeapSize = 0;
    return new Promise((cb) => {
        const safe = setSafeInterval(() => {
            const heapSize = process.memoryUsage().heapUsed;
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
