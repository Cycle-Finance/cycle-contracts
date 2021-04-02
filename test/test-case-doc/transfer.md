# Integration Test —— Transfer

dToken transfer is base feature, but it is limited by holder liquidity. And it would make influence at supply CFGT
distribution.

## beforeAll

deposit asset to get some dToken return.

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDC, accounts[0], 10000 USDC)

## transfer-1

transfer 0 dToken

- [SimpleTransfer](./test-function.md#SimpleTransfer)(dUSDC, accounts[0], account[1], 0 dUSDC)

## transfer-2

transfer some dToken

- [SimpleTransfer](./test-function.md#SimpleTransfer)(dUSDC, accounts[0], account[1], 100 dUSDC)

## transfer-3

transfer amount is more than balance of from account

- [FailTransfer](./test-function.md#FailTransfer)(dUSDC, accounts[0], account[1], 10000 dUSDC, "calculate account
  liquidity failed")

## transfer-4

transfer after borrow some value

- [SimpleBorrow](./test-function.md#SimpleBorrow)(dUSDC, accounts[0], 7000 CFSC)
- [SimpleTransfer](./test-function.md#SimpleTransfer)(dUSDC, accounts[0], account[1], 0 dUSDC)
    - transfer 0 dUSDC
- [SimpleTransfer](./test-function.md#SimpleTransfer)(dUSDC, accounts[0], account[1], 100 dUSDC)
    - after transfer, user has enough liquidity
- [FailTransfer](./test-function.md#FailTransfer)(dUSDC, accounts[0], account[1], 100 dUSDC, "insufficient liquidity")

## transfer-5

transfer after paused transfer

- [SetTransferPaused](./test-function.md#SetTransferPaused)(true)
- [RevertTransfer](./test-function.md#RevertTransfer)(dUSDC, accounts[0], account[1], 100 dUSDC)
- [SetTransferPaused](./test-function.md#SetTransferPaused)(true)
- [SimpleTransfer](./test-function.md#SimpleTransfer)(dUSDC, accounts[0], account[1], 0 dUSDC)
  - transfer 0 dUSDC
- [SimpleTransfer](./test-function.md#SimpleTransfer)(dUSDC, accounts[0], account[1], 1 dUSDC)
  - after transfer, user has enough liquidity