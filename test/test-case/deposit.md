# Integration Test —— Deposit

## deposit-1

Description:
- user deposit 10 ETH;

Preconditions:
- None;

Action:
- dEther.mint(10ETH);

Expected Results:
- Comptroller state change:
  - refreshedBlock > before;
  - totalDeposit > before;
  - marketDeposit[dEther] > before;
  - marketInterestIndex[dEther] >= before;
  - userInterestIndex[dEther][accounts[0]] >= before;
  - supplyIndex[dEther] >= before;
  - supplierIndex[dEther][accounts[0]] >= before;
  - userAccrued[accounts[0]] == 0 or >= before;
  - getSystemLiquidity()[1] >= before && getSystemLiquidity()[2] <= before;
  - getAccountLiquidity()[1] >= before && getAccountLiquidity()[2] <= before;
- User asset state change:
  - ETH.balanceOf(accounts[0]) < before;
  - dEther.balanceOf([accounts[0]]) > before;
  - CFGT.balanceOf(accounts[0])>= before;
  - CFSC.balanceOf(accounts[0])>= before;
- Borrow state change:
  - borrowIndex > before;
  - accrualBlock > before;
  - totalBorrows >= before;
  - getBorrows(accounts[0]) >= before;

## deposit-2

Description:
- deposit 10 WBTC

The others is same as [deposit-1](#deposit-1).

## deposit-3

Description:
- deposit 1000 USDC

The others is same as [deposit-1](#deposit-1).

## deposit-4

Description:
- deposit 1000 USDT

The others is same as [deposit-1](#deposit-1).

## deposit-5

Description:
- other account deposit and compare the number of interest/supplyCFGT distribution

Preconditions:
- [deposit-1](#deposit-1), [deposit-2](#deposit-2), [deposit-3](#deposit-3), [deposit-4](#deposit-4)

Action:
- dEther.mint(10ETH,{from: accounts[1]})

Expected Results:
- 