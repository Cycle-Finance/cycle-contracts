const context = require('./context');

let zeroAddress = '0x0000000000000000000000000000000000000000';

async function simpleBorrow(ctx, market, user, amount) {
    let comptrollerStateBefore = await context.comptrollerState(ctx, market, user);
    let borrowPoolStateBefore = await context.borrowPoolState(ctx, user);
    let userBalanceStateBefore = await context.userBalanceState(ctx, market, user);
    await ctx.borrowPool.borrow(amount, {from: user});
    await ctx.comptroller.refreshMarketDeposit();
    let comptrollerStateAfter = await context.comptrollerState(ctx, market, user);
    let borrowPoolStateAfter = await context.borrowPoolState(ctx, user);
    let userBalanceStateAfter = await context.userBalanceState(ctx, market, user);
    assert.ok(comptrollerStateAfter.refreshedBlock > comptrollerStateBefore.refreshedBlock);
    assert.equal(comptrollerStateBefore.totalDeposit.toString(),
        comptrollerStateAfter.totalDeposit.toString());
    assert.equal(comptrollerStateBefore.marketDeposit.toString(),
        comptrollerStateAfter.marketDeposit.toString());
    // market and user should receive interest
    assert.ok(comptrollerStateAfter.marketInterestIndex > comptrollerStateBefore.marketInterestIndex);
    assert.ok(comptrollerStateAfter.userInterestIndex > comptrollerStateBefore.userInterestIndex);
    assert.ok(comptrollerStateAfter.supplyIndex >= comptrollerStateBefore.supplyIndex);
    assert.ok(comptrollerStateAfter.supplierIndex >= comptrollerStateBefore.supplierIndex);
    assert.ok(comptrollerStateAfter.userAccrued.toString() === "" ||
        comptrollerStateAfter.userAccrued >= comptrollerStateBefore.userAccrued);
    assert.ok(comptrollerStateAfter.borrowDistributedBlock > comptrollerStateBefore.borrowDistributedBlock);
    // if totalBorrows before > 0, borrow index should > before index
    assert.ok(comptrollerStateAfter.borrowIndex >= comptrollerStateBefore.borrowIndex);
    assert.ok(comptrollerStateAfter.borrowerIndex >= comptrollerStateBefore.borrowerIndex);
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
    assert.ok(userBalanceStateAfter.underlyingBalance.toString(),
        userBalanceStateBefore.underlyingBalance.toString());
    assert.ok(userBalanceStateAfter.dTokenBalance.toString(),
        userBalanceStateBefore.dTokenBalance.toString());
    assert.ok(userBalanceStateAfter.cfgtBalance >= userBalanceStateBefore.cfgtBalance);
    assert.ok(userBalanceStateAfter.cfscBalance >= userBalanceStateBefore.cfscBalance + bnAmount);
    // check borrow state change
    assert.ok(borrowPoolStateAfter.borrowIndex > borrowPoolStateBefore.borrowIndex);
    assert.ok(borrowPoolStateAfter.accrualBlock > borrowPoolStateBefore.accrualBlock);
    assert.ok(borrowPoolStateAfter.totalBorrows >= borrowPoolStateBefore.totalBorrows + bnAmount);
    assert.ok(borrowPoolStateAfter.userBorrows >= borrowPoolStateBefore.userBorrows + bnAmount);
}