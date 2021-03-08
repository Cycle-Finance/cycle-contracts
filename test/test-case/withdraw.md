# Integration Test —— Withdraw

## withdraw-1

these case should be successful and simple.

### withdraw-1-1

withdraw from dEther

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH)
- [SimpleWithdraw](./test-function.md#SimpleWithdraw)(dEther, accounts[0], 10 ETH)

### withdraw-1-2

withdraw from dWBTC

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dWBTC, accounts[0], 10 WBTC)
- [SimpleWithdraw](./test-function.md#SimpleWithdraw)(dWBTC, accounts[0], 10 WBTC)

### withdraw-1-3

withdraw from dUSDC

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDC, accounts[0], 10 USDC)
- [SimpleWithdraw](./test-function.md#SimpleWithdraw)(dUSDC, accounts[0], 10 USDC)

### withdraw-1-4

withdraw from dUSDT

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDT, accounts[0], 10 USDT)
- [SimpleWithdraw](./test-function.md#SimpleWithdraw)(dUSDT, accounts[0], 10 USDT)

## withdraw-2

withdraw when there are no deposit at any market, the withdrawal should fail, the reason is "calculate system liquidity
failed".

### withdraw-2-1

withdraw from dEther

- [FailWithdraw](./test-function.md#FailWithdraw)(dEther, accounts[0], 10 ETH, "calculate system liquidity failed")

### withdraw-2-2

withdraw from dWBTC

- [FailWithdraw](./test-function.md#FailWithdraw)(dWBTC, accounts[0], 10 WBTC, "calculate system liquidity failed")

### withdraw-2-3

withdraw from dUSDC

- [FailWithdraw](./test-function.md#FailWithdraw)(dUSDC, accounts[0], 10 USDT, "calculate system liquidity failed")

### withdraw-2-4

withdraw from dUSDT

- [FailWithdraw](./test-function.md#FailWithdraw)(dUSDT, accounts[0], 10 USDC, "calculate system liquidity failed")

## withdraw-3

withdraw when system liquidity is insufficient, but more than 0, and the borrows is 0, the withdrawal should fail, the
reason should be "calculate system liquidity failed".

so, let user deposit some value firstly:

### beforeAll

deposit 10 ETH to system, the value should be $19020

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH);

### withdraw-3-1

withdraw 100 ETH

- [FailWithdraw](./test-function.md#FailWithdraw)(dEther, accounts[0], 100 ETH, "calculate system liquidity failed")

### withdraw-3-2

withdraw 100 WBTC

- [FailWithdraw](./test-function.md#FailWithdraw)(dWBTC, accounts[0], 100 WBTC, "calculate system liquidity failed")

### withdraw-3-3

withdraw 20000 USDC

- [FailWithdraw](./test-function.md#FailWithdraw)(dUSDC, accounts[0], 20000 USDC, "calculate system liquidity failed")

### withdraw-3-3

withdraw 20000 USDT

- [FailWithdraw](./test-function.md#FailWithdraw)(dUSDT, accounts[0], 20000 USDT, "calculate system liquidity failed")

## withdraw-4

like [withdraw-3](#withdraw-3), let's add some borrows to system.

### beforeAll

deposit 10 ETH and then borrow 10000 CFSC, so the remained liquidity  ~= 9000*0.9 = 8100 CFSC approximately.

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH);
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[0], 10000 CFSC);

### withdraw-4-1

withdraw 100 ETH (more user deposit, should fail)

- [FailWithdraw](./test-function.md#FailWithdraw)(dEther, accounts[0], 100 ETH, "calculate system liquidity failed")

### withdraw-4-2

withdraw 10 ETH (equals user deposit, should fail)

- [FailWithdraw](./test-function.md#FailWithdraw)(dEther, accounts[0], 10 ETH, "insufficient system liquidity")

### withdraw-4-3

withdraw 1 ETH (less than user deposit, should success)

- [SimpleWithdraw](./test-function.md#SimpleWithdraw)(dEther, accounts[0], 1 ETH)
