# Integration Test —— Withdraw

## withdraw-1

Description:
- user deposit 10 ETH and then withdraw it;

Preconditions:
- [deposit-1](./deposit.md#deposit-1)

Param: market=dEther, user=accounts[0]

Action(market, user):
- market.redeem(10ETH, {from: user});

Expected Results:
- Comptroller state change:
  - refreshedBlock > before;
  - totalDeposit == before - market.tokenValue(10ETH);
  - marketDeposit[market] == before - market.tokenValue(10ETH);
  - marketInterestIndex[market] >= before;
  - userInterestIndex[market][user] >= before;
  - supplyIndex[market] >= before;
  - supplierIndex[market][user] >= before;
  - userAccrued[accounts[0]] == 0 or >= before;
  - getSystemLiquidity()[1] <= before && getSystemLiquidity()[2] >= before;
  - getAccountLiquidity(user)[1] <= before && getAccountLiquidity(user)[2] >= before;
- User asset state change:
  - ETH.balanceOf(user) > before;
  - market.balanceOf([user]) < before;
  - CFGT.balanceOf(user) >= before;
  - CFSC.balanceOf(user) >= before;
- Borrow state change:
  - borrowIndex > before;
  - accrualBlock > before;
  - totalBorrows >= before;
  - getBorrows(user) >= before;

## withdraw-2

Description:
- user deposit 1 WBTC and then withdraw it;

like [withdraw-1](#withdraw-1).

## withdraw-3

Description:
- user deposit 1000 USDT and then withdraw it;

like [withdraw-1](#withdraw-1).

## withdraw-4

Description:
- user deposit 1000 USDC and then withdraw it;

like [withdraw-1](#withdraw-1).
