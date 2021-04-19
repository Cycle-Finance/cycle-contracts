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

withdraw when there are no deposit at any market, the withdrawal should fail, the reason is "calculate account liquidity
failed".

### withdraw-2-1

withdraw from dEther

- [FailWithdraw](./test-function.md#FailWithdraw)(dEther, accounts[0], 10 ETH, "calculate account liquidity failed")

### withdraw-2-2

withdraw from dWBTC

- [FailWithdraw](./test-function.md#FailWithdraw)(dWBTC, accounts[0], 10 WBTC, "calculate account liquidity failed")

### withdraw-2-3

withdraw from dUSDC

- [FailWithdraw](./test-function.md#FailWithdraw)(dUSDC, accounts[0], 10 USDT, "calculate account liquidity failed")

### withdraw-2-4

withdraw from dUSDT

- [FailWithdraw](./test-function.md#FailWithdraw)(dUSDT, accounts[0], 10 USDC, "calculate account liquidity failed")

## withdraw-3

withdraw when system liquidity is insufficient, but more than 0, and the borrows is 0, the withdrawal should fail, the
reason should be "calculate account liquidity failed".

so, let user deposit some value firstly:

### beforeAll

deposit 10 ETH to system, the value should be $19020

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH);

### withdraw-3-1

withdraw 100 ETH

- [FailWithdraw](./test-function.md#FailWithdraw)(dEther, accounts[0], 100 ETH, "calculate account liquidity failed")

### withdraw-3-2

withdraw 100 WBTC

- [FailWithdraw](./test-function.md#FailWithdraw)(dWBTC, accounts[0], 100 WBTC, "calculate account liquidity failed")

### withdraw-3-3

withdraw 20000 USDC

- [FailWithdraw](./test-function.md#FailWithdraw)(dUSDC, accounts[0], 20000 USDC, "calculate account liquidity failed")

### withdraw-3-3

withdraw 20000 USDT

- [FailWithdraw](./test-function.md#FailWithdraw)(dUSDT, accounts[0], 20000 USDT, "calculate account liquidity failed")

## withdraw-4

like [withdraw-3](#withdraw-3), let's add some borrows to system.

### beforeAll

deposit 10 ETH and then borrow 10000 CFSC, so the remained liquidity  ~= 9000*0.9 = 8100 CFSC approximately.

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH);
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[0], 10000 CFSC);

### withdraw-4-1

withdraw 100 ETH (more user deposit, should fail)

- [FailWithdraw](./test-function.md#FailWithdraw)(dEther, accounts[0], 100 ETH, "calculate account liquidity failed")

### withdraw-4-2

withdraw 10 ETH (equals user deposit, should fail)

- [FailWithdraw](./test-function.md#FailWithdraw)(dEther, accounts[0], 10 ETH, "insufficient liquidity")

### withdraw-4-3

withdraw asset from other market

- [FailWithdraw](./test-function.md#FailWithdraw)(dEther, accounts[0], 10 USDT, "calculate account liquidity failed")

### withdraw-4-4

withdraw 4 ETH, in this way, the liquidity of the system is met, but the liquidity requirement of the account is not met

- [FailWithdraw](./test-function.md#FailWithdraw)(dEther, accounts[0], 4 ETH, "insufficient liquidity")

### withdraw-4-5

withdraw 1 ETH (less than user deposit, should success)

- [SimpleWithdraw](./test-function.md#SimpleWithdraw)(dEther, accounts[0], 1 ETH)

## withdraw-5

we use the same account at above test, now we use another account withdraw asset. It doesn't matter whether the system
borrows money or not.

### beforeAll

deposit 10 ETH and then borrow 10000 CFSC, so the remained liquidity  ~= 9000*0.9 = 8100 CFSC approximately.

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH);
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[0], 10000 CFSC);

### withdraw-5-1

accounts[1] withdraw large amount

- [FailWithdraw](./test-function.md#FailWithdraw)(dEther, accounts[1], 100 ETH, "calculate account liquidity failed")

### withdraw-5-2

accounts[1] withdraw middle amount

- [FailWithdraw](./test-function.md#FailWithdraw)(dEther, accounts[1], 10 ETH, "calculate account liquidity failed")

### withdraw-5-3

accounts[1] withdraw middle amount at other assets

- [FailWithdraw](./test-function.md#FailWithdraw)(dEther, accounts[1], 1000 USDT, "calculate account liquidity failed")

## withdraw-6

when public borrower borrow some money, user cannot withdraw while system liquidity is insufficient

### beforeAll

someone(not public borrower) deposit enough liquidity.

the deposit value is 1*1902 + 1*51234 + 1000*1 + 1000*1.012 = 55148, system borrow limit is 55148*0.9=49633.2, system
enable public borrow threshold is 55148*0.6 = 33088.8, user borrow limit is 1*1902*0.75 + 1*51234*0.75 + 1000*1*0.75 +
1000*1.012*0.75 = 41361.

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 1 ETH)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dWBTC, accounts[0], 1 dWBTC)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDC, accounts[0], 1000 USDC)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDT, accounts[0], 1000 USDT)
- [SetPublicBorrower](./test-function.md#SetPublicBorrower)(accounts[1])
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[1], 49600 CFSC)

the remain liquidity is 49633.2 - 49600 = 33.2, about 33.2/0.75/1=44.2667 USDC, or 33.2/0.75/1.012=43.7418 USDT

### withdraw-6-1

user could withdraw 20 USDC

- [SimpleWithdraw](./test-function.md#SimpleWithdraw)(dUSDC, accounts[0], 20 USDC)

### withdraw-6-2

user couldn't withdraw 30 USDC

- [FailWithdraw](./test-function.md#FailWithdraw)(dUSDC, accounts[0], 30 USDC, "insufficient system liquidity")

### withdraw-6-3

user couldn't withdraw > 55148 CFSC

- [FailWithdraw](./test-function.md#FailWithdraw)(dUSDC, accounts[0], 55149 USDC, "calculate system liquidity failed")

### withdraw-6-4

could withdraw all asset after system borrow has been repaid.

- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dUSDC, accounts[1], CFSCContract, -1)
- [SimpleWithdraw](./test-function.md#SimpleWithdraw)(dEther, accounts[0], 1 ETH)
- [SimpleWithdraw](./test-function.md#SimpleWithdraw)(dWBTC, accounts[0], 1 dWBTC)
- [SimpleWithdraw](./test-function.md#SimpleWithdraw)(dUSDC, accounts[0], 980 USDC)
- [SimpleWithdraw](./test-function.md#SimpleWithdraw)(dUSDT, accounts[0], 1000 USDT)

## withdraw-7

if account withdraw 0, in any case, the withdrawal will be successful

So these cases just need to change the amount param of failed cases to zero and operate those case again.