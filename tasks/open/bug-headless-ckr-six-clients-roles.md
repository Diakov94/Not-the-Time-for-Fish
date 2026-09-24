zone: tools/headless
size: XS
# chase-kennel-rescue-rejoin scenario fails with 6 clients: array bounds error

tools/headless

M

## Command
```
npm run headless -- --scenario chase-kennel-rescue-rejoin --clients 6
```

## Reproduction
All 8 runs with `--clients 6` fail consistently with the same error.

## Error
```
TypeError: [carrier,captive2,rescuer][n] is not a function
    at file:///Users/adyakov/orca/workspaces/gaming-studio/qa-ckr/tools/headless/scenarios/chase-kennel-rescue-rejoin.ts:75:68
```

## Details
The scenario defines exactly 3 cat roles (carrier, captive2, rescuer) in an array at line 75:
```typescript
return side === 'dog' ? dog(c) : [carrier, captive2, rescuer][n]!(c);
```

With 6 clients and 1 dog, there are 5 cats. The `n` index from `place(c)` can be >= 3, which tries to access an undefined array element. When the code tries to invoke the undefined element as a function, it throws a TypeError.

## Root Cause
The scenario was designed for a specific number of clients where the role count matched the array size. With 6 clients, there are more cat players than defined roles.

## Impact
- Scenario completely broken for 6 clients
- All test runs fail immediately at role assignment
- Affects headless testing for this scenario at higher client counts
