# Integration Test —— Deposit

## deposit-1

Description:
- user deposit 10 ETH;

Preconditions:
- None;

Param: market = dEther, user = accounts[0]

Action(market, user):
- market.mint(10ETH,{from: user});

Expected Results():
- Comptroller state change:
  - refreshedBlock > before;
  - totalDeposit > before;
  - marketDeposit[market] > before;
  - marketInterestIndex[market] >= before;
  - userInterestIndex[market][user] >= before;
  - supplyIndex[market] >= before;
  - supplierIndex[market][user] >= before;
  - userAccrued[accounts[0]] == 0 or >= before;
  - getSystemLiquidity()[1] >= before && getSystemLiquidity()[2] <= before;
  - getAccountLiquidity(user)[1] >= before && getAccountLiquidity(user)[2] <= before;
- User asset state change:
  - ETH.balanceOf(user) < before;
  - market.balanceOf([user]) > before;
  - CFGT.balanceOf(user)>= before;
  - CFSC.balanceOf(user)>= before;
- Borrow state change:
  - borrowIndex > before;
  - accrualBlock > before;
  - totalBorrows >= before;
  - getBorrows(user) >= before;

## deposit-2

Description:
- deposit 10 WBTC

market=dWBTC, the others is same as [deposit-1](#deposit-1).

## deposit-3

Description:
- deposit 1000 USDC

market=dUSDC, the others is same as [deposit-1](#deposit-1).

## deposit-4

Description:
- deposit 1000 USDT

market=dUSDT, the others is same as [deposit-1](#deposit-1).

## deposit-5

Description:
- If the user has the same deposit in a single market, the interest and supplierCFGT reword in that market should also be the same. 

Preconditions:
- [deposit-1](#deposit-1);
- [deposit-2](#deposit-2);
- [deposit-3](#deposit-3);
- [deposit-4](#deposit-4);

Param: market = dEther, user1 = accounts[0], user2 = accounts[1]

Action(market, user1, user2):
- market.mint(10ETH,{from: user1})
- comptroller.claimInterest(allMarkets, [user1, user2]);
- comptroller.claimSupplierCFGT(allMarkets, [user1, user2]);
- snapshot user1 asset state as snapshot1;
- snapshot user2 asset state as snapshot2;
- comptroller.refreshMarketDeposit();
- comptroller.claimInterest([market], [user1, user2]);
- comptroller.claimSupplierCFGT([market], [user1, user2]);

Expected Results:
- User asset state change:
  - CFSC.balanceOf(user1) - snapshot1.cfscBalance == CFSC.balanceOf(user2) - snapshot2.cfscBalance;
  - CFGT.balanceOf(user1) - snapshot1.cfgtBalance == CFGT.balanceOf(user2) - snapshot2.cfgtBalance;

>note: other state is negligible.

>note: it may be necessary to implement this case in all other markets.

## deposit-6

Description:
- If the user has the same deposit, the interest and supplierCFGT reword should also be the same.

Preconditions:
- [deposit-1](#deposit-1);
- [deposit-2](#deposit-2);
- [deposit-3](#deposit-3);
- [deposit-4](#deposit-4);
- [deposit-1](#deposit-1)(user=accounts[1]);
- [deposit-2](#deposit-2)(user=accounts[1]);
- [deposit-3](#deposit-3)(user=accounts[1]);
- [deposit-4](#deposit-4)(user=accounts[1]);

Action(user1, user2):
- comptroller.claimInterest(allMarkets, [user1, user2]);
- comptroller.claimSupplierCFGT(allMarkets, [user1, user2]);
- snapshot user1 asset state as snapshot1;
- snapshot user2 asset state as snapshot2;
- comptroller.refreshMarketDeposit();
- comptroller.claimInterest(allMarkets, [user1, user2]);
- comptroller.claimSupplierCFGT(allMarkets, [user1, user2]);

Expected Results:
- User asset state change:
  - CFSC.balanceOf(user1) - snapshot1.cfscBalance == CFSC.balanceOf(user2) - snapshot2.cfscBalance;
  - CFGT.balanceOf(user1) - snapshot1.cfgtBalance == CFGT.balanceOf(user2) - snapshot2.cfgtBalance;