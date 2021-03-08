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
    assert.ok(comptrollerStateAfter.refreshedBlock.cmp(comptrollerStateBefore.refreshedBlock) === 1);
    assert.equal(comptrollerStateBefore.totalDeposit.toString(),
        comptrollerStateAfter.totalDeposit.toString());
    assert.equal(comptrollerStateBefore.marketDeposit.toString(),
        comptrollerStateAfter.marketDeposit.toString());
    assert.ok(comptrollerStateAfter.marketInterestIndex.cmp(comptrollerStateBefore.marketInterestIndex) >= 0);
    assert.ok(comptrollerStateAfter.userInterestIndex.cmp(comptrollerStateBefore.userInterestIndex) >= 0);
    assert.ok(comptrollerStateAfter.supplyIndex.cmp(comptrollerStateBefore.supplyIndex) >= 0);
    assert.ok(comptrollerStateAfter.supplierIndex.cmp(comptrollerStateBefore.supplierIndex) >= 0);
    assert.ok(comptrollerStateAfter.userAccrued.toString() === "0" ||
        comptrollerStateAfter.userAccrued.cmp(comptrollerStateBefore.userAccrued) >= 0);
    assert.ok(comptrollerStateAfter.borrowDistributedBlock.cmp(comptrollerStateBefore.borrowDistributedBlock) >= 0);
    // if totalBorrows before > 0, borrow index should > before index
    assert.ok(comptrollerStateAfter.borrowIndex.cmp(comptrollerStateBefore.borrowIndex) >= 0);
    assert.ok(comptrollerStateAfter.borrowerIndex.cmp(comptrollerStateBefore.borrowerIndex) >= 0);
    let systemLiquidityBefore = comptrollerStateBefore.systemLiquidity;
    let systemLiquidityAfter = comptrollerStateAfter.systemLiquidity;
    let userLiquidityBefore = comptrollerStateBefore.userLiquidity;
    let userLiquidityAfter = comptrollerStateAfter.userLiquidity;
    assert.ok(systemLiquidityAfter[1].cmp(systemLiquidityBefore[1]) <= 0
        && systemLiquidityAfter[2].cmp(systemLiquidityBefore[2]) >= 0);
    assert.ok(userLiquidityAfter[1].cmp(userLiquidityBefore[1]) <= 0
        && userLiquidityAfter[2].cmp(userLiquidityBefore[2]) >= 0);
    // check asset state change
    let bnAmount = web3.utils.toBN(amount);
    assert.ok(userBalanceStateAfter.underlyingBalance.toString(),
        userBalanceStateBefore.underlyingBalance.toString());
    assert.ok(userBalanceStateAfter.dTokenBalance.toString(),
        userBalanceStateBefore.dTokenBalance.toString());
    assert.ok(userBalanceStateAfter.cfgtBalance.cmp(userBalanceStateBefore.cfgtBalance) >= 0);
    assert.ok(userBalanceStateAfter.cfscBalance.cmp(userBalanceStateBefore.cfscBalance + bnAmount) >= 0);
    // check borrow state change
    assert.ok(borrowPoolStateAfter.borrowIndex.cmp(borrowPoolStateBefore.borrowIndex) > 0);
    assert.ok(borrowPoolStateAfter.accrualBlock.cmp(borrowPoolStateBefore.accrualBlock) > 0);
    assert.ok(borrowPoolStateAfter.totalBorrows.cmp(borrowPoolStateBefore.totalBorrows + bnAmount) >= 0);
    assert.ok(borrowPoolStateAfter.userBorrows.cmp(borrowPoolStateBefore.userBorrows + bnAmount) >= 0);
}

module.exports = {simpleBorrow};