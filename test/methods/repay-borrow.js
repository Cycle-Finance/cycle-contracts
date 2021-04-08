const context = require('./context');
const maxUint256 = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));

async function simpleRepayBorrow(ctx, market, borrower, usedSCContract, amount) {
    let comptrollerStateBefore = await context.comptrollerState(ctx, market, borrower);
    let borrowPoolStateBefore = await context.borrowPoolState(ctx, borrower);
    let userBalanceStateBefore = await context.userBalanceState(ctx, market, borrower);
    let scBalanceBefore = await usedSCContract.balanceOf(borrower);
    await ctx.borrowPool.repayBorrow(usedSCContract.address, amount, {from: borrower});
    await ctx.comptroller.refreshMarketDeposit();
    let comptrollerStateAfter = await context.comptrollerState(ctx, market, borrower);
    let borrowPoolStateAfter = await context.borrowPoolState(ctx, borrower);
    let userBalanceStateAfter = await context.userBalanceState(ctx, market, borrower);
    let scBalanceAfter = await usedSCContract.balanceOf(borrower);
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
    if (amount.toString() === "0") {
        assert.ok(systemLiquidityAfter[1].cmp(systemLiquidityBefore[1]) <= 0);
        assert.ok(userLiquidityAfter[1].cmp(userLiquidityBefore[1]) <= 0);
        assert.ok(systemLiquidityAfter[2].cmp(systemLiquidityBefore[2]) >= 0);
        assert.ok(userLiquidityAfter[2].cmp(userLiquidityBefore[2]) >= 0);
    } else {
        assert.ok(systemLiquidityAfter[1].cmp(systemLiquidityBefore[1]) >= 0);
        assert.ok(userLiquidityAfter[1].cmp(userLiquidityBefore[1]) >= 0);
        assert.ok(systemLiquidityAfter[2].cmp(systemLiquidityBefore[2]) <= 0);
        assert.ok(userLiquidityAfter[2].cmp(userLiquidityBefore[2]) <= 0);
    }
    // check asset & borrow state change
    if (market.address.toString() !== ctx.dEther.address.toString()) {
        assert.equal(userBalanceStateAfter.underlyingBalance.toString(),
            userBalanceStateBefore.underlyingBalance.toString());
    }
    assert.equal(userBalanceStateAfter.dTokenBalance.toString(),
        userBalanceStateBefore.dTokenBalance.toString());
    assert.ok(userBalanceStateAfter.cfgtBalance.cmp(userBalanceStateBefore.cfgtBalance) >= 0);
    assert.ok(borrowPoolStateAfter.borrowIndex.cmp(borrowPoolStateBefore.borrowIndex) > 0);
    assert.ok(borrowPoolStateAfter.accrualBlock.cmp(borrowPoolStateBefore.accrualBlock) > 0);

    let bnAmount = web3.utils.toBN(amount);
    if (bnAmount.toString() === maxUint256.toString()) {
        if (usedSCContract.address === ctx.CFSC.address) {
            assert.ok(userBalanceStateAfter.cfscBalance.cmp(userBalanceStateBefore.cfscBalance.sub(bnAmount)) >= 0);
        } else {
            assert.ok(scBalanceBefore.cmp(scBalanceAfter) >= 0);
            assert.ok(userBalanceStateAfter.cfscBalance.cmp(userBalanceStateBefore.cfscBalance) >= 0);
        }
        assert.ok(borrowPoolStateAfter.totalBorrows.cmp(borrowPoolStateBefore.totalBorrows) <= 0);
        assert.ok(borrowPoolStateAfter.userBorrows.cmp(borrowPoolStateBefore.userBorrows) <= 0);
    } else {
        if (usedSCContract.address === ctx.CFSC.address) {
            assert.ok(userBalanceStateAfter.cfscBalance.cmp(userBalanceStateBefore.cfscBalance.sub(bnAmount)) >= 0);
        } else {
            assert.ok(scBalanceBefore.cmp(scBalanceAfter) >= 0);
            assert.ok(userBalanceStateAfter.cfscBalance.cmp(userBalanceStateBefore.cfscBalance) >= 0);
        }
        assert.ok(borrowPoolStateAfter.totalBorrows.cmp(borrowPoolStateBefore.totalBorrows.sub(bnAmount)) >= 0);
        assert.ok(borrowPoolStateAfter.userBorrows.cmp(borrowPoolStateBefore.userBorrows.sub(bnAmount)) >= 0);
    }
}

async function simpleRepayBorrowBehalf(ctx, market, payer, borrower, usedSCContract, amount) {
    let comptrollerStateBefore = await context.comptrollerState(ctx, market, borrower);
    let borrowPoolStateBefore = await context.borrowPoolState(ctx, borrower);
    let borrowerBalanceStateBefore = await context.userBalanceState(ctx, market, borrower);
    let payerBalanceStateBefore = await context.userBalanceState(ctx, market, payer);
    let scBalanceBefore = await usedSCContract.balanceOf(payer);
    await ctx.borrowPool.repayBorrowBehalf(usedSCContract.address, borrower, amount, {from: payer});
    await ctx.comptroller.refreshMarketDeposit();
    let comptrollerStateAfter = await context.comptrollerState(ctx, market, borrower);
    let borrowPoolStateAfter = await context.borrowPoolState(ctx, borrower);
    let borrowerBalanceStateAfter = await context.userBalanceState(ctx, market, borrower);
    let payerBalanceStateAfter = await context.userBalanceState(ctx, market, payer);
    let scBalanceAfter = await usedSCContract.balanceOf(payer);
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
    if (amount.toString() === "0") {
        assert.ok(systemLiquidityAfter[1].cmp(systemLiquidityBefore[1]) <= 0);
        assert.ok(userLiquidityAfter[1].cmp(userLiquidityBefore[1]) <= 0);
        assert.ok(systemLiquidityAfter[2].cmp(systemLiquidityBefore[2]) >= 0);
        assert.ok(userLiquidityAfter[2].cmp(userLiquidityBefore[2]) >= 0);
    } else {
        assert.ok(systemLiquidityAfter[1].cmp(systemLiquidityBefore[1]) >= 0);
        assert.ok(userLiquidityAfter[1].cmp(userLiquidityBefore[1]) >= 0);
        assert.ok(systemLiquidityAfter[2].cmp(systemLiquidityBefore[2]) <= 0);
        assert.ok(userLiquidityAfter[2].cmp(userLiquidityBefore[2]) <= 0);
    }
    // check asset & borrow state change
    if (market.address.toString() !== ctx.dEther.address.toString()) {
        assert.equal(borrowerBalanceStateAfter.underlyingBalance.toString(),
            borrowerBalanceStateBefore.underlyingBalance.toString());
        assert.equal(payerBalanceStateAfter.underlyingBalance.toString(),
            payerBalanceStateBefore.underlyingBalance.toString());
    }
    assert.equal(borrowerBalanceStateAfter.dTokenBalance.toString(),
        borrowerBalanceStateBefore.dTokenBalance.toString());
    assert.equal(payerBalanceStateAfter.dTokenBalance.toString(),
        payerBalanceStateBefore.dTokenBalance.toString());
    assert.ok(borrowerBalanceStateAfter.cfgtBalance.cmp(borrowerBalanceStateBefore.cfgtBalance) >= 0);
    assert.equal(payerBalanceStateAfter.cfgtBalance.toString(), payerBalanceStateBefore.cfgtBalance.toString());
    assert.ok(borrowerBalanceStateAfter.cfscBalance.cmp(borrowerBalanceStateBefore.cfscBalance) >= 0);
    assert.ok(scBalanceAfter.cmp(scBalanceBefore) <= 0);

    assert.ok(borrowPoolStateAfter.borrowIndex.cmp(borrowPoolStateBefore.borrowIndex) > 0);
    assert.ok(borrowPoolStateAfter.accrualBlock.cmp(borrowPoolStateBefore.accrualBlock) > 0);
    let bnAmount = web3.utils.toBN(amount);
    if (bnAmount.toString() === maxUint256.toString()) {
        assert.ok(borrowPoolStateAfter.totalBorrows.cmp(borrowPoolStateBefore.totalBorrows) <= 0);
        assert.ok(borrowPoolStateAfter.userBorrows.cmp(borrowPoolStateBefore.userBorrows) <= 0);
    } else {
        assert.ok(borrowPoolStateAfter.totalBorrows.cmp(borrowPoolStateBefore.totalBorrows.sub(bnAmount)) >= 0);
        assert.ok(borrowPoolStateAfter.userBorrows.cmp(borrowPoolStateBefore.userBorrows.sub(bnAmount)) >= 0);
    }
}

async function revertRepayBorrow(ctx, borrower, usedSCContract, amount) {
    try {
        await ctx.borrowPool.repayBorrow(usedSCContract.address, amount, {from: borrower});
    } catch (e) {
        console.log('revertRepayBorrow should be reverted by reason %s', e.toString());
        return;
    }
    throw new Error('should be error');
}

async function revertRepayBorrowBehalf(ctx, payer, borrower, usedSCContract, amount) {
    try {
        await ctx.borrowPool.repayBorrowBehalf(usedSCContract.address, borrower, amount, {from: payer});
    } catch (e) {
        console.log('revertRepayBorrowBehalf should be reverted by reason %s', e.toString());
        return;
    }
    throw new Error('should be error');
}


module.exports = {simpleRepayBorrow, simpleRepayBorrowBehalf, revertRepayBorrow, revertRepayBorrowBehalf};