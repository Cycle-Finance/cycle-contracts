const context = require('./context');

async function withdraw(ctx, market, user, amount) {
    let comptrollerStateBefore = await context.comptrollerState(ctx, market, user);
    let borrowPoolStateBefore = await context.borrowPoolState(ctx, user);
    let userBalanceStateBefore = await context.userBalanceState(ctx, market, user);
    // deposit
    await market.redeem(amount, {from: user});
    await ctx.comptroller.refreshMarketDeposit();
    let comptrollerStateAfter = await context.comptrollerState(ctx, market, user);
    let borrowPoolStateAfter = await context.borrowPoolState(ctx, user);
    let userBalanceStateAfter = await context.userBalanceState(ctx, market, user);
    // check comptroller state change
    let tokenValue = await market.tokenValue(amount);
    assert.ok(comptrollerStateAfter.refreshedBlock > comptrollerStateBefore.refreshedBlock);
    assert.equal((comptrollerStateBefore.totalDeposit.sub(tokenValue)).toString(),
        comptrollerStateAfter.totalDeposit.toString());
    assert.equal((comptrollerStateBefore.marketDeposit.sub(tokenValue)).toString(),
        comptrollerStateAfter.marketDeposit.toString());
    assert.ok(comptrollerStateAfter.marketInterestIndex >= comptrollerStateBefore.marketInterestIndex);
    assert.ok(comptrollerStateAfter.userInterestIndex >= comptrollerStateBefore.userInterestIndex);
    assert.ok(comptrollerStateAfter.supplyIndex >= comptrollerStateBefore.supplyIndex);
    assert.ok(comptrollerStateAfter.supplierIndex >= comptrollerStateBefore.supplierIndex);
    let systemLiquidityBefore = comptrollerStateBefore.systemLiquidity;
    let systemLiquidityAfter = comptrollerStateAfter.systemLiquidity;
    let userLiquidityBefore = comptrollerStateBefore.userLiquidity;
    let userLiquidityAfter = comptrollerStateAfter.userLiquidity;
    assert.ok(systemLiquidityAfter[1] <= systemLiquidityBefore[1]
        && systemLiquidityAfter[0] >= systemLiquidityBefore[0]);
    assert.ok(userLiquidityAfter[1] <= userLiquidityBefore[1]
        && userLiquidityAfter[0] >= userLiquidityBefore[0]);
    // check asset state change
    let bnAmount = web3.utils.toBN(amount);
    assert.ok((userBalanceStateAfter.underlyingBalance.sub(bnAmount)).toString(),
        userBalanceStateBefore.underlyingBalance.toString());
    assert.ok((userBalanceStateAfter.dTokenBalance.add(bnAmount)).toString(),
        userBalanceStateBefore.dTokenBalance);
    // check borrow state change
    assert.ok(borrowPoolStateAfter.borrowIndex > borrowPoolStateBefore.borrowIndex);
    assert.ok(borrowPoolStateAfter.accrualBlock > borrowPoolStateBefore.accrualBlock);
    assert.ok(borrowPoolStateAfter.totalBorrows >= borrowPoolStateBefore.totalBorrows);
    assert.ok(borrowPoolStateAfter.userBorrows >= borrowPoolStateBefore.userBorrows);
    /* we check profit after withdrawal */
    // distribute supply CFGT
    let distributeCFGT = comptrollerStateBefore.supplySpeed > 0;
    // distribute interest
    let distributeCFSC = borrowPoolStateBefore.totalBorrows > 0;
    if (distributeCFGT) {
        if (comptrollerStateAfter.userAccrued.toString() === "") {
            assert.ok(userBalanceStateAfter.cfgtBalance > userBalanceStateBefore.cfgtBalance);
        } else {
            assert.ok(comptrollerStateAfter.userAccrued > comptrollerStateBefore.userAccrued);
        }
    } else {
        assert.equal(comptrollerStateAfter.userAccrued.toString(), comptrollerStateBefore.userAccrued.toString());
        assert.equal(userBalanceStateAfter.cfgtBalance.toString(), userBalanceStateBefore.cfgtBalance.toString());
    }
    if (distributeCFSC) {
        assert.ok(userBalanceStateAfter.cfscBalance > userBalanceStateBefore.cfscBalance);
    } else {
        assert.equal(userBalanceStateAfter.cfscBalance.toString(), userBalanceStateBefore.cfscBalance.toString());
    }
}