# Cycle Contracts Test Case

There are tow partition of test case: interface test and union test.

## Interface Test

This required
- the call of each interface has not reverted;
- 100% code coverage.

The code about interface test at [here](../TestInterface.js).

## Union Test

UnionTest is also called scenario test.

We use some different accounts to participate Cycle system, and check these accounts' state about Cycle system. Such as
the number of dToken and borrows, deposit Value, distributed CFGT and CFSC interest.

### Case

Case Type: deposit/withdraw/borrow/repayBorrow/liquidateBorrow/modifySystemConfig

>note: All test cases use the default configuration unless specifically stated in the precondition.

All cases consist of 5 attributes:
- description: describe what case does;
- precondition: the precondition of case;
- param: test case param, used to specify user and dToken;
- action: contract invoke;
  - there maybe more than one action in case;
- expected results: the system state change caused by case action;
  - there maybe more than one expected results in case, each expected results correspond to each action;

We will check whether the change of system state is consistent with expected results, if not, the case if failed. 

All Case listed below:

| Type | Case |
| --- | --- |
| deposit | [deposit test case](./deposit.md) |