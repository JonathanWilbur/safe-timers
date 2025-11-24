# Safe Timers

[![JSR](https://jsr.io/badges/@wildboar/safe-timers)](https://jsr.io/@wildboar/safe-timers)

`setTimeout` and `setInterval`, but they do not execute immediately if given a
large `delay`: they can handle a virtually infinite delay correctly.

The standard timer functions only accept (either by specification or just as an
accident) up to the max of a signed 32-bit integer for the `delay` parameter,
which means the longest these can delay is about 24.85 days. If you supply a
`delay` greater than this value, the callback is executed immediately. From the
NodeJS documentation (as of version 25.2.1):

> When delay is larger than 2147483647 or less than 1 or NaN, the delay will be
> set to 1.

This is fine for most use cases, but it is conceivable that you could have a
long-running server process that needs to run a task on a monthly basis, in
which case, these would not suffice.

This API is meant to be a drop-in replacement for the standard timer functions
in the following manner:

| Standard Timer Function | This Module's Replacement |
|-------------------------|---------------------------|
| `setTimeout`            | `setSafeTimeout`          |
| `setInterval`           | `setSafeInterval`         |
| `clearTimeout`          | `clearSafeTimeout`        |
| `clearInterval`         | `clearSafeInterval`       |

They have unit tests and are believed to work the same in all of the major
Javascript runtimes.

This module was inspired by
[this one](https://www.npmjs.com/package/safe-timers). I re-implemented it so
you can have:

- Pure Typescript implementation
- ESM
- Publication on [JSR](https://jsr.io/)

## Example Usage

```typescript
setSafeTimeout((word) => {
    console.log(`Hello ${word}`);
}, 500, "world");

const family = ["mom", "dad", "grammy"];
const interval = setSafeInterval(() => {
    const member = family.pop();
    if (!member) {
        clearSafeInterval(interval);
    }
    console.log(`...and hello ${member}`);
}, 500);
```

## Development

- Build using: `tsc ./index.mts`
- Test in Deno using: `deno test ./deno.test.mts` (no need to build prior)
- Test in NodeJS using: `node --test ./node.tests.mjs` (after building)
- Test in Bun using: `node --test ./node.tests.mjs` (after building)

Please report any [issues](https://github.com/JonathanWilbur/safe-timers/issues) you see.

## AI Usage Statement

None of the code in this library was produced by AI, but the GitHub Actions
workflow files were.
