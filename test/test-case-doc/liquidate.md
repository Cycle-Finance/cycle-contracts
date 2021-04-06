# Integration Test —— Liquidate

there are many errors if liquidate failed:

- disable liquidate public borrower;
- calculate account liquidity failed;
    - this circumstance couldn't occur;
- insufficient shortfall;
- calculate maxClose failed;
    - this circumstance couldn't occur;
- liquidate too much;
- stale accrual block;
    - this reason couldn't occur.
- liquidator is same as borrower;
- illegal liquidation amount;

There are many reasons could cause tx revert:

- `liquidateCalculateSeizeTokens` function return error
    - this circumstance couldn't occur;
- liquidate seize too much;
- seize failed.
    - this circumstance couldn't occur at liquidation;

## liquidate-1

disable liquidate public borrower.

### beforeAll

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH)
- [SetPublicBorrower](./test-function.md#SetPublicBorrower)(accounts[1])
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[1], 8000 CFSC)

### liquidate-1-1

liquidate 0 or -1.

- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[1], USDCContract, 0, "
  disable liquidate public borrower")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[1], USDTContract, 0, "
  disable liquidate public borrower")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[1], CFSCContract, 0, "
  disable liquidate public borrower")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[1], USDCContract, -1, "
  disable liquidate public borrower")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[1], USDTContract, -1, "
  disable liquidate public borrower")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[1], CFSCContract, -1, "
  disable liquidate public borrower")

### liquidate-1-2

liquidate some value

- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[1], USDCContract, 800, "
  disable liquidate public borrower")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[1], USDTContract, 800, "
  disable liquidate public borrower")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[1], CFSCContract, 800, "
  disable liquidate public borrower")

### liquidate-1-3

liquidate some value that exceed borrows.

- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[1], USDCContract, 8100
  CFSC, "disable liquidate public borrower")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[1], USDTContract, 8100
  CFSC, "disable liquidate public borrower")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[1], CFSCContract, 8100
  CFSC, "disable liquidate public borrower")

## liquidate-2

insufficient shortfall

### beforeAll

10 ETH value is $19020, collateral factor is 0.75, so the borrow limit is $14265

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[0], 14000 CFSC)

### liquidate-2-1

liquidate 0 or -1.

- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDCContract, 0, "
  insufficient shortfall")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDTContract, 0, "
  insufficient shortfall")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], CFSCContract, 0, "
  insufficient shortfall")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDCContract, -1, "
  insufficient shortfall")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDTContract, -1, "
  insufficient shortfall")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], CFSCContract, -1, "
  insufficient shortfall")

### liquidate-2-2

liquidate some value.

- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDCContract, 1000, "
  insufficient shortfall")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDTContract, 1000, "
  insufficient shortfall")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], CFSCContract, 1000, "
  insufficient shortfall")

### liquidate-2-3

liquidate some value that exceed borrower debt.

- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDCContract, 14265
  CFSC, "insufficient shortfall")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDTContract, 14265
  CFSC, "insufficient shortfall")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], CFSCContract, 14265
  CFSC, "insufficient shortfall")

## liquidate-3

liquidate too much.

This means that liquidator requirements exceed borrower's max close position.

We should decrease ETH price after borrow so that enable liquidate borrower position.

### beforeAll

10 ETH value is $19020, collateral factor is 0.75, so the borrow limit is $14265.

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[0], 14000 CFSC)
- [SetPrice](./test-function.md#SetPrice)(zeroAddress, $1500)

after price change, the borrow limit is 10*1500*0.75=11250<14000, so we can liquidate now.

### liquidate-3-1

liquidate 0. The tx will fail, but the reason should be "illegal liquidation amount", not "liquidate too much".

- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDCContract, 0, "
  illegal liquidation amount")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDTContract, 0, "
  illegal liquidation amount")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], CFSCContract, 0, "
  illegal liquidation amount")

### liquidate-3-2

liquidate -1.

- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDCContract, -1, "
  liquidate too much")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDTContract, -1, "
  liquidate too much")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], CFSCContract, -1, "
  liquidate too much")

### liquidate-3-3

the max close factor is 0.8(default value), so the max close position is 14000*0.8 = 11200 approximately(there maybe
some accrued interest).

- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDCContract, 11300
  CFSC, "liquidate too much")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], USDTContract, 11300
  CFSC, "liquidate too much")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[1], accounts[0], CFSCContract, 11300
  CFSC, "liquidate too much")

## liquidate-4

liquidator is same as borrower.

we should liquidate correct value so that we can reach trigger this error.

### beforeAll

10 ETH value is $19020, collateral factor is 0.75, so the borrow limit is $14265.

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[0], 14000 CFSC)
- [SetPrice](./test-function.md#SetPrice)(zeroAddress, $1500)

### liquidate-4-1

- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[0], USDCContract, 10000
  CFSC, "liquidator is same as borrower")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[0], USDTContract, 10000
  CFSC, "liquidator is same as borrower")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[0], CFSCContract, 10000
  CFSC, "liquidator is same as borrower")

## liquidate-5

illegal liquidation amount.

### beforeAll

10 ETH value is $19020, collateral factor is 0.75, so the borrow limit is $14265.

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[0], 14000 CFSC)
- [SetPrice](./test-function.md#SetPrice)(zeroAddress, $1500)

### liquidate-5-1

liquidate 0 would fail, the reason is "illegal liquidation amount". If we liquidate -1, the reason is "liquidate too
much".

- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[0], USDCContract, 0, "
  illegal liquidation amount")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[0], USDTContract, 0, "
  illegal liquidation amount")
- [FailLiquidateBorrow](./test-function.md#FailLiquidateBorrow)(dEther, accounts[0], accounts[0], CFSCContract, 0, "
  illegal liquidation amount")

## liquidate-6

normal liquidate.

Let account[0] deposits at all markets so that we can test any circumstance.

As for the change of liquidation incentive and max close factor, we will reserve it for quantitative test

### beforeAll

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dWBTC, accounts[0], 1 WBTC)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDC, accounts[0], 10000 USDC)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDT, accounts[0], 10000 USDT)

user total deposit is: 10*1902+1*51234+10000*1+10000*1.012=90374. Because the collateral factor of all assets are 0.75,
so the borrow limit is 90374*0.75=67780.5. We let account[0] borrow 67780 CFSC.

- [SimpleBorrow](./test-function.md#SimpleBorrow)(dUSDT, accounts[0], 67780 CFSC)

Then, we reduce the price of ETH.

- [SetPrice](./test-function.md#SetPrice)(zeroAddress, $1500)

So, the total deposit value is 10*1500+1*51234+10000*1+10000*1.012=86354, the borrow limit is 86354*0.75=64765.5. Now,
we can liquidate debts.

### liquidate-6-1

let we liquidate seize too much, tx should be reverted.

- [RevertLiquidateBorrow](./test-function.md#RevertLiquidateBorrow)(dEther, accounts[1], accounts[0], CFSCContract,
  54000 CFSC)

### liquidate-6-2

let we liquidate some value at each market

- [SimpleLiquidateBorrow](./test-function.md#SimpleLiquidateBorrow)(dEther, accounts[1], accounts[0], USDCContract, 1000
  CFSC)
- [SimpleLiquidateBorrow](./test-function.md#SimpleLiquidateBorrow)(dWBTC, accounts[1], accounts[0], USDCContract, 1000
  CFSC)
- [SimpleLiquidateBorrow](./test-function.md#SimpleLiquidateBorrow)(dUSDC, accounts[1], accounts[0], USDCContract, 1000
  CFSC)
- [SimpleLiquidateBorrow](./test-function.md#SimpleLiquidateBorrow)(dUSDT, accounts[1], accounts[0], USDCContract, 1000
  CFSC)
- [SimpleLiquidateBorrow](./test-function.md#SimpleLiquidateBorrow)(dEther, accounts[1], accounts[0], USDTContract, 1000
  CFSC)
- [SimpleLiquidateBorrow](./test-function.md#SimpleLiquidateBorrow)(dWBTC, accounts[1], accounts[0], USDTContract, 1000
  CFSC)
- [SimpleLiquidateBorrow](./test-function.md#SimpleLiquidateBorrow)(dUSDC, accounts[1], accounts[0], USDTContract, 1000
  CFSC)
- [SimpleLiquidateBorrow](./test-function.md#SimpleLiquidateBorrow)(dUSDT, accounts[1], accounts[0], USDTContract, 1000
  CFSC)
- [SimpleLiquidateBorrow](./test-function.md#SimpleLiquidateBorrow)(dEther, accounts[1], accounts[0], CFSCContract, 1000
  CFSC)
- [SimpleLiquidateBorrow](./test-function.md#SimpleLiquidateBorrow)(dWBTC, accounts[1], accounts[0], CFSCContract, 1000
  CFSC)
- [SimpleLiquidateBorrow](./test-function.md#SimpleLiquidateBorrow)(dUSDC, accounts[1], accounts[0], CFSCContract, 1000
  CFSC)
- [SimpleLiquidateBorrow](./test-function.md#SimpleLiquidateBorrow)(dUSDT, accounts[1], accounts[0], CFSCContract, 1000
  CFSC)

## liquidate-7

If we invoke `seize` function straightly, the tx should be failed.

The case is very simple, so we don't use any [test-function], we call contract straightly.

- dEther.seize(accounts[1], accounts[0], 100);
    - tx failed: borrow pool mismatch;
- dWBTC.seize(accounts[1], accounts[0], 100);
    - tx failed: borrow pool mismatch;
- dUSDC.seize(accounts[1], accounts[0], 100);
    - tx failed: borrow pool mismatch;
- dUSDT.seize(accounts[1], accounts[0], 100);
    - tx failed: borrow pool mismatch;