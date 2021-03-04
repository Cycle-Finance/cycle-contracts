# Integration Test —— Deposit

## deposit-1

deposit 10 ETH.

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH)

## deposit-2

deposit 10 WBTC

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 WBTC)

## deposit-3

deposit 1000 USDC

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 1000 USDC)

## deposit-4

deposit 1000 USDT

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 1000 USDT)

## deposit-5

If the user has the same deposit in market, the interest and supplierCFGT reword should also be the same. 

### deposit-5-1

single market deposit

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[1], 10 ETH)
- [interestGap, supplierCFGTGap, _] = [CompareMarketProfit](./test-function.md#CompareMarketProfit)(dEther, accounts[0], accounts[1], 10);
  - interestGap == 0;
  - supplierCFGT == 0;

### deposit-5-2

all market deposit

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 ETH)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[1], 10 ETH)
- [interestGap, supplierCFGTGap, _] = [CompareMarketProfit](./test-function.md#CompareMarketProfit)(dEther, accounts[0], accounts[1], 10);
  - interestGap == 0;
  - supplierCFGT == 0;
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dWBTC, accounts[0], 10 WBTC)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dWBTC, accounts[1], 5 WBTC)
- [interestGap, supplierCFGTGap, _] = [CompareMarketProfit](./test-function.md#CompareMarketProfit)(dWBTC, accounts[0], accounts[1], 10);
  - interestGap > 0;
  - supplierCFGT > 0;
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDC, accounts[0], 1000 USDC)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDC, accounts[1], 1000 USDC)
- [interestGap, supplierCFGTGap, _] = [CompareMarketProfit](./test-function.md#CompareMarketProfit)(dUSDC, accounts[0], accounts[1], 10);
  - interestGap == 0;
  - supplierCFGT == 0;
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDT, accounts[0], 1000 USDT)
- [SimpleDeposit](./test-function.md#SimpleDeposit)(dUSDT, accounts[1], 1500 USDT)
- [interestGap, supplierCFGTGap, _] = [CompareMarketProfit](./test-function.md#CompareMarketProfit)(dUSDT, accounts[0], accounts[1], 10);
  - interestGap < 0;
  - supplierCFGT < 0;

## deposit-6

Description:
- deposit should revert when mint paused.

