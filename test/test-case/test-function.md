# Integration Test —— Test Function

## SimpleDeposit

Description:
- user deposit simply;

Param: (market, user, amount)

Preconditions:
- None;

Action:
- market.mint(amount,{from: user});

Expected Results:
- Comptroller state change:
  - refreshedBlock > before;
  - totalDeposit == before + market.tokenValue(amount);
  - marketDeposit[market] == before + market.tokenValue(amount);
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

## RevertDeposit

Description:
- Deposit would panic at sometime;

Param: (market, user, amount)

Preconditions:
- None;

Action:
- tx = market.mint(amount,{from: user});

Expected Results:
- tx reverted;

>note: we use `try-catch` to handle this case

## FailDeposit

Description:
- for various reasons, deposits may fail;

Param: (market, user, amount, reason)

Preconditions:
- None;

Action:
- tx = market.mint(amount,{from: user});

Expected Results:
- tx.logs.contain(reason);

## CompareMarketProfit

Description:
- compare the profit of two users between the specified number of blocks at the market.

Param: (market, user1, user2, blockNum)

Preconditions:
- None;

Action:
- comptroller.claimAllProfit([user1, user2]);
- snapshot user1 asset state as snapshot1;
- snapshot user2 asset state as snapshot2;
- comptroller.refreshMarketDeposit() `blockNum` times;
  - if blockchain increased automatically, we may not refresh market deposit manually.
- comptroller.claimInterest([market], [user1, user2]);
- comptroller.claimSupplierCFGT([market], [user1, user2]);
- snapshot user1 asset state as snapshot3;
- snapshot user2 asset state as snapshot4;
- comptroller.claimBorrowerCFGT([user1, user2]);

Expected Results:
- User asset state change:
  - return (CFSC.balanceOf(user1) - snapshot1.cfscBalance) - (CFSC.balanceOf(user2) - snapshot2.cfscBalance);
  - return (CFGT.balanceOf(user1) - snapshot1.cfgtBalance) - (CFGT.balanceOf(user2) - snapshot2.cfgtBalance);
  - return (CFGT.balanceOf(user1) - snapshot3.cfgtBalance) - (CFGT.balanceOf(user2) - snapshot4.cfgtBalance);