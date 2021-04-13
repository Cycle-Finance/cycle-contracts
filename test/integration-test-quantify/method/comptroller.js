const math = require('./math');

function marketSupplierDistributionCFGT(totalSupply, userBalance, supplySpeed, blockDelta) {
    let cfgtAccrued = supplySpeed.muln(blockDelta);
    return cfgtAccrued.mul(userBalance).div(totalSupply);
}

function marketSupplierDistributionInterest(totalSupply, userBalance, interestAccrued) {
    return interestAccrued.mul(userBalance).div(totalSupply);
}

function borrowerDistributionCFGT(totalBorrows, userBorrows, borrowSpeed, blockDelta) {
    let cfgtAccrued = borrowSpeed.muln(blockDelta);
    return cfgtAccrued.mul(userBorrows).div(totalBorrows);
}

function calculateSeizeToken(assetPrice, repayAmount) {
    return math.div_(repayAmount, assetPrice);
}

function calculateSystemLiquidity(marketsDeposit, totalBorrows) {
    let totalDeposit = web3.utils.toBN('0');
    for (let i = 0; i < marketsDeposit.length; i++) {
        totalDeposit.add(marketsDeposit[i]);
    }
    if (totalDeposit.cmp(totalBorrows) > 0) {
        return [totalDeposit.sub(totalBorrows), 0];
    } else {
        return [0, totalBorrows.sub(totalDeposit)];
    }
}

function calculateAccountLiquidity(usersDeposit, totalBorrows) {
    let totalDeposit = web3.utils.toBN('0');
    for (let i = 0; i < usersDeposit.length; i++) {
        totalDeposit.add(usersDeposit[i]);
    }
    if (totalDeposit.cmp(totalBorrows) > 0) {
        return [totalDeposit.sub(totalBorrows), 0];
    } else {
        return [0, totalBorrows.sub(totalDeposit)];
    }
}

function supplyIndex(supplyIndexBefore, interestIndexBefore, totalDeposit, marketDeposit, dTokenTotalSupply,
                     supplySpeed, blockDelta, interestAccrued) {
    let marketWeight = math.div_(marketDeposit, totalDeposit);
    let cfgtAccrued = supplySpeed.muln(blockDelta);
    let marketCfgtAccrued = math.mulScalarAndTruncate(marketWeight, cfgtAccrued);
    let supplyIndexRatio = math.fraction(marketCfgtAccrued, dTokenTotalSupply);
    let interestIndexRatio = math.fraction(interestAccrued, dTokenTotalSupply);
    return {
        supplyIndex: supplyIndexBefore.add(supplyIndexRatio),
        interestIndex: interestIndexBefore.add(interestIndexRatio),
    };
}

function borrowIndex(borrowIndexBefore, totalBorrows, borrowPoolIndex, borrowSpeed, blockDelta) {
    let cfgtAccrued = borrowSpeed.muln(blockDelta);
    let originalBorrows = math.div_(totalBorrows, borrowPoolIndex);
    let fraction = math.fraction(cfgtAccrued, originalBorrows);
    return borrowIndexBefore.add(fraction);
}

module.exports = {
    marketSupplierDistributionCFGT,
    marketSupplierDistributionInterest,
    borrowerDistributionCFGT,
    calculateSeizeToken,
    calculateSystemLiquidity,
    calculateAccountLiquidity,
    supplyIndex,
    borrowIndex,
}