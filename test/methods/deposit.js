const context = require('./context');

let zeroAddress = '0x0000000000000000000000000000000000000000';

async function simpleDeposit(ctx, market, user, amount) {
    let comptrollerStateBefore = await context.comptrollerState(ctx, market, user);
    let borrowPoolStateBefore = await context.borrowPoolState(ctx, user);
    let userBalanceStateBefore = await context.userBalanceState(ctx, market, user);
    // deposit
    await deposit(ctx, market, user, amount);
    await ctx.comptroller.refreshMarketDeposit();
    let comptrollerStateAfter = await context.comptrollerState(ctx, market, user);
    let borrowPoolStateAfter = await context.borrowPoolState(ctx, user);
    let userBalanceStateAfter = await context.userBalanceState(ctx, market, user);
    // check comptroller state change
    let tokenValue = await market.tokenValue(amount);
    assert.ok(comptrollerStateAfter.refreshedBlock.cmp(comptrollerStateBefore.refreshedBlock) === 1);
    assert.equal((comptrollerStateBefore.totalDeposit.add(tokenValue)).toString(),
        comptrollerStateAfter.totalDeposit.toString());
    assert.equal((comptrollerStateBefore.marketDeposit.add(tokenValue)).toString(),
        comptrollerStateAfter.marketDeposit.toString());
    assert.ok(comptrollerStateAfter.marketInterestIndex.cmp(comptrollerStateBefore.marketInterestIndex) >= 0);
    assert.ok(comptrollerStateAfter.userInterestIndex.cmp(comptrollerStateBefore.userInterestIndex) >= 0);
    assert.ok(comptrollerStateAfter.supplyIndex.cmp(comptrollerStateBefore.supplyIndex) >= 0);
    assert.ok(comptrollerStateAfter.supplierIndex.cmp(comptrollerStateBefore.supplierIndex) >= 0);
    assert.ok(comptrollerStateAfter.userAccrued.toString() === "0"
        || comptrollerStateAfter.userAccrued.cmp(comptrollerStateBefore.userAccrued) >= 0);
    let systemLiquidityBefore = comptrollerStateBefore.systemLiquidity;
    let systemLiquidityAfter = comptrollerStateAfter.systemLiquidity;
    let userLiquidityBefore = comptrollerStateBefore.userLiquidity;
    let userLiquidityAfter = comptrollerStateAfter.userLiquidity;
    assert.ok(systemLiquidityAfter[1].cmp(systemLiquidityBefore[1]) >= 0
        && systemLiquidityAfter[0].cmp(systemLiquidityBefore[0]) <= 0);
    assert.ok(userLiquidityAfter[1].cmp(userLiquidityBefore[1]) >= 0
        && userLiquidityAfter[0].cmp(userLiquidityBefore[0]) <= 0);
    // check asset state change
    let bnAmount = web3.utils.toBN(amount);
    assert.ok((userBalanceStateAfter.underlyingBalance.add(bnAmount)).toString(),
        userBalanceStateBefore.underlyingBalance.toString());
    assert.ok((userBalanceStateAfter.dTokenBalance.sub(bnAmount)).toString(),
        userBalanceStateBefore.dTokenBalance);
    assert.ok(userBalanceStateAfter.cfgtBalance.cmp(userBalanceStateBefore.cfgtBalance) >= 0);
    assert.ok(userBalanceStateAfter.cfscBalance.cmp(userBalanceStateBefore.cfscBalance) >= 0);
    // check borrow state change
    assert.ok(borrowPoolStateAfter.borrowIndex.cmp(borrowPoolStateBefore.borrowIndex) > 0);
    assert.ok(borrowPoolStateAfter.accrualBlock.cmp(borrowPoolStateBefore.accrualBlock) > 0);
    assert.ok(borrowPoolStateAfter.totalBorrows.cmp(borrowPoolStateBefore.totalBorrows) >= 0);
    assert.ok(borrowPoolStateAfter.userBorrows.cmp(borrowPoolStateBefore.userBorrows) >= 0);
}

async function revertDeposit(ctx, market, user, amount) {
    try {
        await deposit(market, user, amount);
    } catch (e) {
        console.log('deposit should be reverted by reason %s', e);
    }
}

async function failDeposit(ctx, market, user, amount, reason) {
    let reasonMatched = false;
    let tx = await deposit(market, user, amount);
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

async function deposit(ctx, market, user, amount) {
    let underlying = await market.underlyingAsset();
    if (underlying === zeroAddress) {
        await market.mint(amount, {from: user, value: amount});
    } else {
        let iERC20 = await ctx.IERC20.at(underlying);
        await iERC20.approve(market.address, amount, {from: user});
        return await market.mint(amount, {from: user});
    }
}

module.exports = {simpleDeposit, revertDeposit, failDeposit};