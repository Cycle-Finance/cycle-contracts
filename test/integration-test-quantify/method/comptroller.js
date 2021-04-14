const math = require('./math');

function marketSupplierDistributionCFGT(totalSupply, userBalance, marketSupplySpeed, blockDelta) {
    if (totalSupply.cmpn(0) === 0 || userBalance.cmpn(0) === 0) {
        return 0;
    }
    let cfgtAccrued = marketSupplySpeed.muln(blockDelta);
    return cfgtAccrued.mul(userBalance).div(totalSupply);
}

function marketSupplierDistributionCFGTByIndex(globalIndex, userIndex, userBalance) {
    return globalIndex.sub(userIndex).mul(userBalance).div(math.doubleScale);
}

function marketSupplierDistributionInterest(totalSupply, userBalance, marketInterestAccrued) {
    if (totalSupply.cmpn(0) === 0 || userBalance.cmpn(0) === 0) {
        return 0;
    }
    return marketInterestAccrued.mul(userBalance).div(totalSupply);
}

function marketSupplierDistributionInterestByIndex(globalIndex, userIndex, userBalance) {
    return globalIndex.sub(userIndex).mul(userBalance).div(math.doubleScale);
}

function borrowerDistributionCFGT(totalBorrows, userBorrows, borrowSpeed, blockDelta) {
    if (totalBorrows.cmpn(0) === 0 || userBorrows.cmpn(0) === 0) {
        return 0;
    }
    let cfgtAccrued = borrowSpeed.muln(blockDelta);
    return cfgtAccrued.mul(userBorrows).div(totalBorrows);
}

function borrowerDistributionCFGTByIndex(globalIndex, userIndex, userBorrows, borrowPoolIndex) {
    return globalIndex.sub(userIndex).mul(math.div_(userBorrows, borrowPoolIndex)).div(math.doubleScale);
}

function calculateSeizeToken(assetPrice, repayAmount) {
    return math.div_(repayAmount, assetPrice);
}

function calculateSystemLiquidity(totalDeposit, totalBorrows) {
    if (totalDeposit.cmp(totalBorrows) > 0) {
        return [totalDeposit.sub(totalBorrows), 0];
    } else {
        return [0, totalBorrows.sub(totalDeposit)];
    }
}

function calculateCurrentSystemLiquidity(marketsDeposit, totalBorrows) {
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

function calculateAccountLiquidity(usersDeposit, accountBorrows) {
    let totalDeposit = web3.utils.toBN('0');
    for (let i = 0; i < usersDeposit.length; i++) {
        totalDeposit.add(usersDeposit[i]);
    }
    if (totalDeposit.cmp(accountBorrows) > 0) {
        return [totalDeposit.sub(accountBorrows), 0];
    } else {
        return [0, accountBorrows.sub(totalDeposit)];
    }
}

function supplyIndex(supplyIndexBefore, interestIndexBefore, totalDeposit, marketDeposit, dTokenTotalSupply,
                     supplySpeed, blockDelta, interestAccrued) {
    if (totalDeposit.cmpn(0) === 0 || marketDeposit.cmpn(0) === 0) {
        return {
            supplyIndex: supplyIndexBefore,
            interestIndex: interestIndexBefore,
        };
    }
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
    if (originalBorrows.cmpn(0) === 0) {
        return borrowIndexBefore;
    }
    let fraction = math.fraction(cfgtAccrued, originalBorrows);
    return borrowIndexBefore.add(fraction);
}

module.exports = {
    marketSupplierDistributionCFGT,
    marketSupplierDistributionInterest,
    borrowerDistributionCFGT,
    marketSupplierDistributionCFGTByIndex,
    marketSupplierDistributionInterestByIndex,
    borrowerDistributionCFGTByIndex,
    calculateSeizeToken,
    calculateSystemLiquidity,
    calculateCurrentSystemLiquidity,
    calculateAccountLiquidity,
    supplyIndex,
    borrowIndex,
}