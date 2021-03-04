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
    assert.ok(comptrollerStateAfter.refreshedBlock > comptrollerStateBefore.refreshedBlock);
    assert.equal((comptrollerStateBefore.totalDeposit.add(tokenValue)).toString(),
        comptrollerStateAfter.totalDeposit.toString());
    assert.equal((comptrollerStateBefore.marketDeposit.add(tokenValue)).toString(),
        comptrollerStateAfter.marketDeposit.toString());
    assert.ok(comptrollerStateAfter.marketInterestIndex >= comptrollerStateBefore.marketInterestIndex);
    assert.ok(comptrollerStateAfter.userInterestIndex >= comptrollerStateBefore.userInterestIndex);
    assert.ok(comptrollerStateAfter.supplyIndex >= comptrollerStateBefore.supplyIndex);
    assert.ok(comptrollerStateAfter.supplierIndex >= comptrollerStateBefore.supplierIndex);
    assert.ok(comptrollerStateAfter.userAccrued.toString() === ""
        || comptrollerStateAfter.userAccrued >= comptrollerStateBefore.userAccrued);
    let systemLiquidityBefore = comptrollerStateBefore.systemLiquidity;
    let systemLiquidityAfter = comptrollerStateAfter.systemLiquidity;
    let userLiquidityBefore = comptrollerStateBefore.userLiquidity;
    let userLiquidityAfter = comptrollerStateAfter.userLiquidity;
    assert.ok(systemLiquidityAfter[1] >= systemLiquidityBefore[1]
        && systemLiquidityAfter[0] <= systemLiquidityBefore[0]);
    assert.ok(userLiquidityAfter[1] >= userLiquidityBefore[1]
        && userLiquidityAfter[0] <= userLiquidityBefore[0]);
    // check asset state change
    let bnAmount = web3.utils.toBN(amount);
    assert.ok((userBalanceStateAfter.underlyingBalance.add(bnAmount)).toString(),
        userBalanceStateBefore.underlyingBalance.toString());
    assert.ok((userBalanceStateAfter.dTokenBalance.sub(bnAmount)).toString(),
        userBalanceStateBefore.dTokenBalance);
    assert.ok(userBalanceStateAfter.cfgtBalance >= userBalanceStateBefore.cfgtBalance);
    assert.ok(userBalanceStateAfter.cfscBalance >= userBalanceStateBefore.cfscBalance);
    // check borrow state change
    assert.ok(borrowPoolStateAfter.borrowIndex > borrowPoolStateBefore.borrowIndex);
    assert.ok(borrowPoolStateAfter.accrualBlock > borrowPoolStateBefore.accrualBlock);
    assert.ok(borrowPoolStateAfter.totalBorrows >= borrowPoolStateBefore.totalBorrows);
    assert.ok(borrowPoolStateAfter.userBorrows >= borrowPoolStateBefore.userBorrows);
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