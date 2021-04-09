const context = require('./context');

async function simpleTransfer(ctx, market, from, to, amount) {
    let fromComptrollerStateBefore = await context.comptrollerState(ctx, market, from);
    let fromBorrowPoolStateBefore = await context.borrowPoolState(ctx, from);
    let fromBalanceStateBefore = await context.userBalanceState(ctx, market, from);
    let toComptrollerStateBefore = await context.comptrollerState(ctx, market, to);
    let toBorrowPoolStateBefore = await context.borrowPoolState(ctx, to);
    let toBalanceStateBefore = await context.userBalanceState(ctx, market, to);
    await market.transfer(to, amount, {from: from});
    await ctx.comptroller.refreshMarketDeposit();
    let fromComptrollerStateAfter = await context.comptrollerState(ctx, market, from);
    let fromBorrowPoolStateAfter = await context.borrowPoolState(ctx, from);
    let fromBalanceStateAfter = await context.userBalanceState(ctx, market, from);
    let toComptrollerStateAfter = await context.comptrollerState(ctx, market, to);
    let toBorrowPoolStateAfter = await context.borrowPoolState(ctx, to);
    let toBalanceStateAfter = await context.userBalanceState(ctx, market, to);
    assert.ok(fromComptrollerStateAfter.refreshedBlock.cmp(fromComptrollerStateBefore.refreshedBlock) === 1);
    assert.equal(fromComptrollerStateBefore.totalDeposit.toString(),
        fromComptrollerStateAfter.totalDeposit.toString());
    assert.equal(fromComptrollerStateBefore.marketDeposit.toString(),
        fromComptrollerStateAfter.marketDeposit.toString());
    assert.ok(fromComptrollerStateAfter.marketInterestIndex.cmp(fromComptrollerStateBefore.marketInterestIndex) >= 0);
    assert.ok(fromComptrollerStateAfter.userInterestIndex.cmp(fromComptrollerStateBefore.userInterestIndex) >= 0);
    assert.ok(toComptrollerStateAfter.userInterestIndex.cmp(toComptrollerStateBefore.userInterestIndex) >= 0);
    assert.ok(fromComptrollerStateAfter.supplyIndex.cmp(fromComptrollerStateBefore.supplyIndex) >= 0);
    assert.ok(fromComptrollerStateAfter.supplierIndex.cmp(fromComptrollerStateBefore.supplierIndex) >= 0);
    assert.ok(toComptrollerStateAfter.supplierIndex.cmp(toComptrollerStateBefore.supplierIndex) >= 0);
    assert.ok(fromComptrollerStateAfter.userAccrued.toString() === "0" ||
        fromComptrollerStateAfter.userAccrued.cmp(fromComptrollerStateBefore.userAccrued) >= 0);
    assert.ok(toComptrollerStateAfter.userAccrued.toString() === "0" ||
        toComptrollerStateAfter.userAccrued.cmp(toComptrollerStateBefore.userAccrued) >= 0);
    assert.ok(fromComptrollerStateAfter.borrowDistributedBlock.cmp(fromComptrollerStateBefore.borrowDistributedBlock) >= 0);
    // if totalBorrows before > 0, borrow index should > before index
    assert.ok(fromComptrollerStateAfter.borrowIndex.cmp(fromComptrollerStateBefore.borrowIndex) >= 0);
    assert.ok(fromComptrollerStateAfter.borrowerIndex.cmp(fromComptrollerStateBefore.borrowerIndex) >= 0);
    let systemLiquidityBefore = fromComptrollerStateBefore.systemLiquidity;
    let systemLiquidityAfter = fromComptrollerStateAfter.systemLiquidity;
    assert.ok(systemLiquidityAfter[1].cmp(systemLiquidityBefore[1]) <= 0
        && systemLiquidityAfter[2].cmp(systemLiquidityBefore[2]) >= 0);
    let fromLiquidityBefore = fromComptrollerStateBefore.userLiquidity;
    let fromLiquidityAfter = fromComptrollerStateAfter.userLiquidity;
    assert.ok(fromLiquidityAfter[1].cmp(fromLiquidityBefore[1]) <= 0
        && fromLiquidityAfter[2].cmp(fromLiquidityBefore[2]) >= 0);
    let toLiquidityBefore = toComptrollerStateBefore.userLiquidity;
    let toLiquidityAfter = toComptrollerStateAfter.userLiquidity;
    assert.ok(toLiquidityAfter[1].cmp(toLiquidityBefore[1]) >= 0
        && toLiquidityAfter[2].cmp(toLiquidityBefore[2]) <= 0);
    // check asset state change
    let bnAmount = web3.utils.toBN(amount);
    if (market.address.toString() !== ctx.dEther.address.toString()) {
        assert.equal(fromBalanceStateAfter.underlyingBalance.toString(),
            fromBalanceStateBefore.underlyingBalance.toString());
        assert.equal(toBalanceStateAfter.underlyingBalance.toString(),
            toBalanceStateBefore.underlyingBalance.toString());
    }
    assert.equal(fromBalanceStateAfter.dTokenBalance.toString(),
        fromBalanceStateBefore.dTokenBalance.sub(bnAmount).toString());
    assert.equal(toBalanceStateAfter.dTokenBalance.toString(),
        toBalanceStateBefore.dTokenBalance.add(bnAmount).toString());
    assert.ok(fromBalanceStateAfter.cfgtBalance.cmp(fromBalanceStateBefore.cfgtBalance) >= 0);
    assert.ok(toBalanceStateAfter.cfgtBalance.cmp(toBalanceStateBefore.cfgtBalance) >= 0);
    assert.ok(fromBalanceStateAfter.cfscBalance.cmp(fromBalanceStateBefore.cfscBalance) >= 0);
    assert.ok(toBalanceStateAfter.cfscBalance.cmp(toBalanceStateBefore.cfscBalance) >= 0);
    // check borrow state change
    assert.ok(fromBorrowPoolStateAfter.borrowIndex.cmp(fromBorrowPoolStateBefore.borrowIndex) > 0);
    assert.ok(fromBorrowPoolStateAfter.accrualBlock.cmp(fromBorrowPoolStateBefore.accrualBlock) > 0);
    assert.ok(fromBorrowPoolStateAfter.totalBorrows.cmp(fromBorrowPoolStateBefore.totalBorrows) >= 0);
    assert.ok(fromBorrowPoolStateAfter.userBorrows.cmp(fromBorrowPoolStateBefore.userBorrows) >= 0);
    assert.ok(toBorrowPoolStateAfter.userBorrows.cmp(toBorrowPoolStateBefore.userBorrows) >= 0);
}


async function revertTransfer(market, from, to, amount) {
    try {
        await market.transfer(to, amount, {from: from});
    } catch (e) {
        console.log('transfer should be reverted by reason %s', e.toString());
        return;
    }
    throw new Error('should be error');
}

async function failTransfer(market, from, to, amount, reason) {
    let reasonMatched = false;
    let tx = await market.transfer(to, amount, {from: from});
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

module.exports = {simpleTransfer, revertTransfer, failTransfer};