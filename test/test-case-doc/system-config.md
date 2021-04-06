# Integration Test —— modifySystemConfig

## config-1

set public borrower

- [SetPublicBorrower](./test-function.md#SetPublicBorrower)(accounts[0])

## config-2

pause and unpause market deposit

- [SetMintPaused](./test-function.md#SetMintPaused)(dEther, true);
- [SetMintPaused](./test-function.md#SetMintPaused)(dEther, false);
- [SetMintPaused](./test-function.md#SetMintPaused)(dWBTC, true);
- [SetMintPaused](./test-function.md#SetMintPaused)(dWBTC, false);
- [SetMintPaused](./test-function.md#SetMintPaused)(dUSDC, true);
- [SetMintPaused](./test-function.md#SetMintPaused)(dUSDC, false);
- [SetMintPaused](./test-function.md#SetMintPaused)(dUSDT, true);
- [SetMintPaused](./test-function.md#SetMintPaused)(dUSDT, false);

## config-3

pause and unpause borrow

- [SetBorrowPaused](./test-function.md#SetBorrowPaused)(true);
- [SetBorrowPaused](./test-function.md#SetBorrowPaused)(false);

## config-4

pause and unpause transfer

- [SetTransferPaused](./test-function.md#SetTransferPaused)(true);
- [SetTransferPaused](./test-function.md#SetTransferPaused)(false);

## config-5

pause and unpause seize

- [SetSeizePaused](./test-function.md#SetSeizePaused)(true);
- [SetSeizePaused](./test-function.md#SetSeizePaused)(false);

## config-6

set public borrow threshold

- [SetPublicBorrowThreshold](./test-function.md#SetPublicBorrowThreshold)(0.5);

## config-7

set max system utilization rate

- [SetMaxSystemUtilizationRate](./test-function.md#SetMaxSystemUtilizationRate)(0.95);

## config-8

change max close factor of liquidation

- [SetMaxCloseFactor](./test-function.md#SetMaxCloseFactor)(0.88);

## config-9

change liquidation incentive

- [SetLiquidationIncentive](./test-function.md#SetLiquidationIncentive)(1.05);