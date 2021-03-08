const context = require('./context');

async function simpleWithdraw(ctx, market, user, amount) {
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
    assert.ok(comptrollerStateAfter.refreshedBlock.cmp(comptrollerStateBefore.refreshedBlock) === 1);
    assert.equal((comptrollerStateBefore.totalDeposit.sub(tokenValue)).toString(),
        comptrollerStateAfter.totalDeposit.toString());
    assert.equal((comptrollerStateBefore.marketDeposit.sub(tokenValue)).toString(),
        comptrollerStateAfter.marketDeposit.toString());
    assert.ok(comptrollerStateAfter.marketInterestIndex.cmp(comptrollerStateBefore.marketInterestIndex) >= 0);
    assert.ok(comptrollerStateAfter.userInterestIndex.cmp(comptrollerStateBefore.userInterestIndex) >= 0);
    assert.ok(comptrollerStateAfter.supplyIndex.cmp(comptrollerStateBefore.supplyIndex) >= 0);
    assert.ok(comptrollerStateAfter.supplierIndex.cmp(comptrollerStateBefore.supplierIndex) >= 0);
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
    assert.ok((userBalanceStateAfter.underlyingBalance.sub(bnAmount)).toString(),
        userBalanceStateBefore.underlyingBalance.toString());
    assert.ok((userBalanceStateAfter.dTokenBalance.add(bnAmount)).toString(),
        userBalanceStateBefore.dTokenBalance.toString());
    // check borrow state change
    assert.ok(borrowPoolStateAfter.borrowIndex.cmp(borrowPoolStateBefore.borrowIndex) > 0);
    assert.ok(borrowPoolStateAfter.accrualBlock.cmp(borrowPoolStateBefore.accrualBlock) > 0);
    assert.ok(borrowPoolStateAfter.totalBorrows.cmp(borrowPoolStateBefore.totalBorrows) >= 0);
    assert.ok(borrowPoolStateAfter.userBorrows.cmp(borrowPoolStateBefore.userBorrows) >= 0);
    /* we check profit after withdrawal */
    // distribute supply CFGT
    let distributeCFGT = comptrollerStateBefore.supplySpeed.cmpn(0) > 0;
    // distribute interest
    let distributeCFSC = borrowPoolStateBefore.totalBorrows.cmpn(0) > 0;
    if (distributeCFGT) {
        if (comptrollerStateAfter.userAccrued.toString() === "0") {
            assert.ok(userBalanceStateAfter.cfgtBalance.cmp(userBalanceStateBefore.cfgtBalance) > 0);
        } else {
            assert.ok(comptrollerStateAfter.userAccrued.cmp(comptrollerStateBefore.userAccrued) > 0);
        }
    } else {
        assert.equal(comptrollerStateAfter.userAccrued.toString(), comptrollerStateBefore.userAccrued.toString());
        assert.equal(userBalanceStateAfter.cfgtBalance.toString(), userBalanceStateBefore.cfgtBalance.toString());
    }
    if (distributeCFSC) {
        assert.ok(userBalanceStateAfter.cfscBalance.cmp(userBalanceStateBefore.cfscBalance) > 0);
    } else {
        assert.equal(userBalanceStateAfter.cfscBalance.toString(), userBalanceStateBefore.cfscBalance.toString());
    }
}

async function revertWithdraw(ctx, market, user, amount) {
    try {
        await market.redeem(amount, {from: user});
    } catch (e) {
        console.log('withdraw should be reverted by reason %s', e);
    }
}

async function failWithdraw(ctx, market, user, amount, reason) {
    let reasonMatched = false;
    let tx = await market.redeem(amount, {from: user});
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

module.exports = {simpleWithdraw, revertWithdraw, failWithdraw};