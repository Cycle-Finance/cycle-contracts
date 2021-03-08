# Integration Test —— Borrow

## borrow-1

these case should be successful and simple. The borrower should own deposit at any market.

### borrow-1-1

ether deposit

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[0], 10000 CFSC)

### borrow-1-2

wbtc deposit

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dWBTC, accounts[0], 10 dWBTC)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dWBTC, accounts[0], 10000 CFSC)

### borrow-1-3

USDC deposit

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDC, accounts[0], 10000 USDC)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dUSDC, accounts[0], 7000 CFSC)

### borrow-1-4

USDT deposit

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDT, accounts[0], 10000 USDT)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dUSDT, accounts[0], 7000 CFSC)

## borrow-2

user deposit at more than one market, and borrow CFSC.

### beforeAll

the deposit value is 1*1902 + 1*51234 + 1000*1 + 1000*1.012 = 55148, system borrow limit is 55148*0.9=49633.2, user
borrow limit is 1*1902*0.75 + 1*51234*0.75 + 1000*1*0.75 + 1000*1.012*0.75 = 41361.

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 1 ETH)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dWBTC, accounts[0], 1 dWBTC)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDC, accounts[0], 1000 USDC)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDT, accounts[0], 1000 USDT)

### borrow-2-1

borrow exceed system borrow limit.

- [FailBorrow](./test-function.md#FailBorrow)(dEther, accounts[0], 49655 CFSC, "insufficient system liquidity")

### borrow-2-2

borrow exceed account borrow limit but not exceed system borrow limit.

- [FailBorrow](./test-function.md#FailBorrow)(dEther, accounts[0], 46655 CFSC, "insufficient liquidity")

### borrow-2-3

borrow not exceed account borrow limit.

- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[0], 40655 CFSC)

## borrow-3

if the user has not deposited, he cannot borrow.

- [FailBorrow](./test-function.md#FailBorrow)(dEther, accounts[1], 46655 CFSC, "insufficient liquidity")

## borrow-4

public borrower could borrow some as no requirements of deposit, only if there are sufficient liquidity in system.

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

### borrow-4-1

there are another account borrow some value, but system utilization rate doesn't reach UR threshold.

Then public borrower borrow some value and not reach max system UR. Case should be successful.

- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[0], 33000 CFSC)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[1], 8000 CFSC)

### borrow-4-2

like [borrow-4-1], but public borrower borrow value exceed max system UR. Case should be failed.

- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[0], 33000 CFSC)
- [FailBorrow](./test-function.md#FailBorrow)(dEther, accounts[1], 17000 CFSC, "insufficient system liquidity")