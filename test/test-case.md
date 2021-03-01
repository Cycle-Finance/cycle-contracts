# Cycle Contracts Test Case

There are tow partition of test case: interface test and union test.

## Interface Test

This required
- the call of each interface has not reverted;
- 100% code coverage.

The code about interface test at [here](./TestInterface.js).

## Union Test

UnionTest is also called scenario test.

We use some different accounts to participate Cycle system, and check these accounts' state about Cycle system. Such as
the number of dToken and borrows, deposit Value, distributed CFGT and CFSC interest.
