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