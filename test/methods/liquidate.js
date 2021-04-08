const context = require('./context');

async function simpleLiquidateBorrow(ctx, market, liquidator, borrower, usedSCContract, repayAmount) {
    let borrowerCompStateBefore = await context.comptrollerState(ctx, market, borrower);
    let liquidatorCompStateBefore = await context.comptrollerState(ctx, market, liquidator);
    let borrowPoolStateBefore = await context.borrowPoolState(ctx, borrower);
    let borrowerBalanceStateBefore = await context.userBalanceState(ctx, market, borrower);
    let liquidatorBalanceStateBefore = await context.userBalanceState(ctx, market, liquidator);
    let balanceBefore = await usedSCContract.balanceOf(liquidator);
    await ctx.borrowPool.liquidateBorrow(usedSCContract.address, market.address, borrower, repayAmount, {from: liquidator});
    await ctx.comptroller.refreshMarketDeposit();
    let borrowerCompStateAfter = await context.comptrollerState(ctx, market, borrower);
    let liquidatorCompStateAfter = await context.comptrollerState(ctx, market, liquidator);
    let borrowPoolStateAfter = await context.borrowPoolState(ctx, borrower);
    let borrowerBalanceStateAfter = await context.userBalanceState(ctx, market, borrower);
    let liquidatorBalanceStateAfter = await context.userBalanceState(ctx, market, liquidator);
    let balanceAfter = await usedSCContract.balanceOf(liquidator);
    assert.ok(borrowerCompStateAfter.refreshedBlock.cmp(borrowerCompStateBefore.refreshedBlock) === 1);
    assert.equal(borrowerCompStateBefore.totalDeposit.toString(),
        borrowerCompStateAfter.totalDeposit.toString());
    assert.equal(borrowerCompStateBefore.marketDeposit.toString(),
        borrowerCompStateAfter.marketDeposit.toString());
    assert.ok(borrowerCompStateAfter.marketInterestIndex.cmp(borrowerCompStateBefore.marketInterestIndex) >= 0);
    assert.ok(borrowerCompStateAfter.userInterestIndex.cmp(borrowerCompStateBefore.userInterestIndex) >= 0);
    assert.ok(liquidatorCompStateAfter.userInterestIndex.cmp(liquidatorCompStateBefore.userInterestIndex) >= 0);
    assert.ok(borrowerCompStateAfter.supplyIndex.cmp(borrowerCompStateBefore.supplyIndex) >= 0);
    assert.ok(borrowerCompStateAfter.supplierIndex.cmp(borrowerCompStateBefore.supplierIndex) >= 0);
    assert.ok(liquidatorCompStateAfter.supplierIndex.cmp(liquidatorCompStateBefore.supplierIndex) >= 0);
    assert.ok(borrowerCompStateAfter.userAccrued.toString() === "0" ||
        borrowerCompStateAfter.userAccrued.cmp(borrowerCompStateBefore.userAccrued) >= 0);
    assert.ok(liquidatorCompStateAfter.userAccrued.toString() === "0" ||
        liquidatorCompStateAfter.userAccrued.cmp(liquidatorCompStateBefore.userAccrued) >= 0);
    assert.ok(borrowerCompStateAfter.borrowDistributedBlock.cmp(borrowerCompStateBefore.borrowDistributedBlock) >= 0);
    // if totalBorrows before > 0, borrow index should > before index
    assert.ok(borrowerCompStateAfter.borrowIndex.cmp(borrowerCompStateBefore.borrowIndex) >= 0);
    assert.ok(borrowerCompStateAfter.borrowerIndex.cmp(borrowerCompStateBefore.borrowerIndex) >= 0);
    let systemLiquidityBefore = borrowerCompStateBefore.systemLiquidity;
    let systemLiquidityAfter = borrowerCompStateAfter.systemLiquidity;
    let borrowerLiquidity = borrowerCompStateBefore.userLiquidity;
    let borrowerLiquidityAfter = borrowerCompStateAfter.userLiquidity;
    let liquidatorLiquidity = liquidatorCompStateBefore.userLiquidity;
    let liquidatorLiquidityAfter = liquidatorCompStateAfter.userLiquidity;
    assert.ok(systemLiquidityAfter[1].cmp(systemLiquidityBefore[1]) >= 0
        && systemLiquidityAfter[2].cmp(systemLiquidityBefore[2]) <= 0);
    assert.ok(borrowerLiquidityAfter[1].cmp(borrowerLiquidity[1]) >= 0
        && borrowerLiquidityAfter[2].cmp(borrowerLiquidity[2]) <= 0);
    assert.ok(liquidatorLiquidityAfter[1].cmp(liquidatorLiquidity[1]) >= 0
        && liquidatorLiquidityAfter[2].cmp(liquidatorLiquidity[2]) <= 0);
    // check asset state change
    if (market.address.toString() !== ctx.dEther.address.toString()) {
        assert.equal(borrowerBalanceStateAfter.underlyingBalance.toString(),
            borrowerBalanceStateBefore.underlyingBalance.toString());
    }
    // liquidator repay some underlying asset
    assert.ok(liquidatorBalanceStateAfter.underlyingBalance.cmp(liquidatorBalanceStateBefore.underlyingBalance) <= 0);

    assert.ok(borrowerBalanceStateAfter.dTokenBalance.cmp(borrowerBalanceStateBefore.dTokenBalance) <= 0);
    assert.ok(liquidatorBalanceStateAfter.dTokenBalance.cmp(liquidatorBalanceStateBefore.dTokenBalance) >= 0);
    assert.ok(borrowerBalanceStateAfter.cfgtBalance.cmp(borrowerBalanceStateBefore.cfgtBalance) >= 0);
    assert.ok(liquidatorBalanceStateAfter.cfgtBalance.cmp(liquidatorBalanceStateBefore.cfgtBalance) >= 0);
    assert.ok(borrowerBalanceStateAfter.cfscBalance.cmp(borrowerBalanceStateBefore.cfscBalance) >= 0);
    let bnAmount = web3.utils.toBN(repayAmount);
    if (usedSCContract.address === ctx.CFSC.address) {
        assert.ok(liquidatorBalanceStateAfter.cfscBalance.cmp(liquidatorBalanceStateBefore.cfscBalance.sub(bnAmount)) >= 0);
    } else {
        assert.ok(balanceAfter.cmp(balanceBefore.sub(bnAmount)) >= 0);
        assert.ok(liquidatorBalanceStateAfter.cfscBalance.cmp(liquidatorBalanceStateBefore.cfscBalance) >= 0);
    }
    // check borrow state change
    assert.ok(borrowPoolStateAfter.borrowIndex.cmp(borrowPoolStateBefore.borrowIndex) > 0);
    assert.ok(borrowPoolStateAfter.accrualBlock.cmp(borrowPoolStateBefore.accrualBlock) > 0);
    assert.ok(borrowPoolStateAfter.totalBorrows.cmp(borrowPoolStateBefore.totalBorrows.sub(bnAmount)) >= 0);
    assert.ok(borrowPoolStateAfter.userBorrows.cmp(borrowPoolStateBefore.userBorrows.sub(bnAmount)) >= 0);
}


async function revertLiquidateBorrow(ctx, market, liquidator, borrower, usedSCContract, repayAmount) {
    try {
        await ctx.borrowPool.liquidateBorrow(usedSCContract.address, market.address, borrower, repayAmount, {from: liquidator});
    } catch (e) {
        console.log('liquidate borrow should be reverted by reason %s', e.toString());
        return;
    }
    throw new Error('should be error');
}

async function failLiquidateBorrow(ctx, market, liquidator, borrower, usedSCContract, repayAmount, reason) {
    let reasonMatched = false;
    let tx = await ctx.borrowPool.liquidateBorrow(usedSCContract.address, market.address, borrower, repayAmount, {from: liquidator});
    for (let i = 0; i < tx.logs.length; i++) {
        let log = tx.logs[i];
        if (log.event === "Fail") {
            if (log.args[0] === reason) {
                reasonMatched = true;
            }
            console.log('Fail: %s', log.args);
        }
    }
    assert.ok(reasonMatched);
}

async function failSeize(market, liquidator, borrower, seizeAmount, reason) {
    let reasonMatched = false;
    let tx = await market.seize(liquidator, borrower, seizeAmount, {from: liquidator});
    for (let i = 0; i < tx.logs.length; i++) {
        let log = tx.logs[i];
        if (log.event === "Fail") {
            if (log.args[0] === reason) {
                reasonMatched = true;
            }
            console.log('Fail: %s', log.args);
        }
    }
    assert.ok(reasonMatched);
}

module.exports = {simpleLiquidateBorrow, revertLiquidateBorrow, failLiquidateBorrow, failSeize};