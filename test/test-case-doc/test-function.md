# Integration Test —— Test Function

## Deposit

### SimpleDeposit

Description:

- user deposit simply;

Param: (market, user, amount)

Action:

- market.mint(amount,{from: user});
- comptroller.refreshMarketDeposit()

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
    - market.underlying.balanceOf(user) < before;
    - market.balanceOf([user]) > before;
    - CFGT.balanceOf(user)>= before;
    - CFSC.balanceOf(user)>= before;
- Borrow state change:
    - borrowIndex > before;
    - accrualBlock > before;
    - totalBorrows >= before;
    - getBorrows(user) >= before;

### RevertDeposit

Description:

- Deposit sometimes panic;

Param: (market, user, amount)

Action:

- tx = market.mint(amount,{from: user});

Expected Results:

- tx reverted;

> note: we use `try-catch` to handle this case

### FailDeposit

Description:

- for various reasons, deposits may fail;

Param: (market, user, amount, reason)

Action:

- tx = market.mint(amount,{from: user});

Expected Results:

- tx.logs.contain(reason);

## Withdraw

### SimpleWithdraw

Description:

- withdraw some asset from specified market
- **withdraw should receive CFGT if supplySpeed > 0**

Param: (market, user, amount)

Action:

- market.redeem(amount, {from: user});
- comptroller.refreshMarketDeposit()

Expected Results:

- Comptroller state change:
    - refreshedBlock > before;
    - totalDeposit == before - market.tokenValue(amount);
    - marketDeposit[market] == before - market.tokenValue(amount);
    - marketInterestIndex[market] >= before;
    - userInterestIndex[market][user] >= before;
    - supplyIndex[market] >= before;
    - supplierIndex[market][user] >= before;
    - userAccrued[accounts[0]] == 0 or >= before;
    - getSystemLiquidity()[1] <= before && getSystemLiquidity()[2] >= before;
    - getAccountLiquidity(user)[1] <= before && getAccountLiquidity(user)[2] >= before;
- User asset state change:
    - market.underlying.balanceOf(user) > before;
    - market.balanceOf(user) < before;
    - CFGT.balanceOf(user)>= before;
    - CFSC.balanceOf(user)>= before;
- Borrow state change:
    - borrowIndex > before;
    - accrualBlock > before;
    - totalBorrows >= before;
    - getBorrows(user) >= before;

### RevertWithdraw

like [RevertDeposit](#RevertDeposit)

### FailWithdraw

like [FailDeposit](#FailDeposit)

## Borrow

### SimpleBorrow

Description:

- borrow CFSC
- if supplySpeed > 0, borrower supply CFGT index should increase

Param: ({market}, user, amount)

- market is optional, specify which market user deposited

Action:

- borrowPool.borrow(amount, {from: user})
- comptroller.refreshMarketDeposit()

Expected Results:

- Comptroller state change:
    - refreshedBlock > before;
    - totalDeposit == before;
    - marketDeposit[market] == before;
    - marketInterestIndex[market] >= before;
    - userInterestIndex[market][user] >= before;
    - supplyIndex[market] >= before;
    - supplierIndex[market][user] >= before;
    - userAccrued[accounts[0]] == 0 or >= before;
    - getSystemLiquidity()[1] <= before && getSystemLiquidity()[2] >= before;
    - getAccountLiquidity(user)[1] <= before && getAccountLiquidity(user)[2] >= before;
    - borrowDistributedBlock >= before;
    - borrowIndex >= before;
    - borrowerIndex >= before
- User asset state change:
    - market.underlying.balanceOf(user) == before;
    - market.balanceOf(user) == before;
    - CFGT.balanceOf(user)>= before;
    - CFSC.balanceOf(user)>= before+amount;
- Borrow state change:
    - borrowIndex > before;
    - accrualBlock > before;
    - totalBorrows >= before + amount;
    - getBorrows(user) >= before + amount;

### RevertBorrow

like [RevertDeposit](#RevertDeposit)

### FailBorrow

like [FailDeposit](#FailDeposit)

## SetPublicBorrower

Description:

- change public borrower address

Param:

- (user)

Action:

- comptroller.setPublicBorrower(user)

Expected Results:

- comptroller.publicBorrower() == user;

## SetMintPaused

Description:

- pause market mint

Param:

- (market, state)

Action:

- comptroller.setMintPaused(market, state)

Expected Results:

- comptroller.mintPaused(market) == state;

## SetBorrowPaused

Description:

- pause borrow

Param:

- (state)

Action:

- comptroller.setBorrowPaused(state)

Expected Results:

- comptroller.borrowPaused() == state;

## SetTransferPaused

Description:

- pause dToken transfer

Param:

- (state)

Action:

- comptroller.setTransferPaused(state)

Expected Results:

- comptroller.transferPaused() == state;

## SetSeizePaused

Description:

- pause liquidation

Param:

- (state)

Action:

- comptroller.setSeizePaused(state)

Expected Results:

- comptroller.seizePaused() == state;

## CompareMarketProfit

Description:

- compare the profit of two users between the specified number of blocks at the market.

Param: (market, user1, user2, blockNum)

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