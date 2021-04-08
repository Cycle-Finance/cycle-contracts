# Cycle Contracts Test Case

There are tow partition of test case: interface test and integration test.

## Interface Test

This required

- the call of each interface has not reverted;
- 100% code coverage.

The code about interface test at [here](../TestInterface.js).

## integration Test

UnionTest is also called scenario test.

We use some different accounts to participate Cycle system, and check these accounts' state about Cycle system. Such as
the number of dToken and borrows, deposit Value, distributed CFGT and CFSC interest.

### Case

Case Type: deposit/withdraw/borrow/repayBorrow/liquidateBorrow/transfer/modifySystemConfig

> note: All test cases use the default configuration unless specifically stated in the precondition.

We define test function that consist of 4 attributes:

- param: function param, used to specify user, dToken and amount;
- description: describe what function does;
- action: contract invoke;
- expected results: the system state change caused by action;
    - We will check whether the change of system state is consistent with expected results, if not, the case if failed.
    - Or we return the change to caller, caller should check the change;

Each test case consist of one or more function.

All Case listed below:

| Type | Case |
| --- | --- |
| deposit | [deposit test case](./deposit.md) |
| withdraw | [withdraw test case](./withdraw.md) |
| borrow | [borrow test case](./borrow.md) |
| repayBorrow | [repayBorrow test case](./repay-borrow.md) |
| liquidateBorrow | [liquidateBorrow test case](./liquidate.md) |
| transfer | [transfer test case](./transfer.md) |
| modifySystemConfig | [modifySystemConfig test case](./system-config.md) |

Case implementation locate here: [Integration Test Feature](../integration-test-feature).

### Exact Quantitative Case

assert exact amount change for above integration test case.The above test case is functional qualitative test, we need
more accurate quantitative test to ensure the precise operation of the system.

#### Basic Variable

There are two parts of variable is system basic variable: outsides input and system config param.

> note: some system parameters are only used for comparison threshold, not for calculation, so we don't think about them.

System config param:

| Variable | Desc |
| --- | --- |
| comptroller.supplySpeed | CFGT distribution num per block of supplier |
| comptroller.borrowSpeed | CFGT distribution num per block of borrower |
| comptroller.collateralFactor | deposit discount factor used in borrow limit calculation |
| comptroller.liquidationIncentive | liquidation bonus factor |
| borrowPool.reserveFactor | interest income ration of whole interest |
| interestRateModel.multiplierPerBlock | param used in interest calculation |
| interestRateModel.baseRatePerBlock | param used in interest calculation |

Outsides input:

| Variable | Desc |
| --- | --- |
| Oracle.price | price of diverse asset |
| DToken.balanceOf | user deposit amount |
| Borrows.accountBorrows | user borrows |

#### Dependent Variable

The change of basic variable will cause the change of dependent variable.

All state of contracts both are dependent variable, we should check the contract state change with exact amount after
user operation. That is **Exact Quantitative Test**.