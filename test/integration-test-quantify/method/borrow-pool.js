const math = require('./math');

function accrueInterest(borrowRate, blockDelta, totalBorrows, reserveFactor, borrowIndex) {
    let interestFactor = borrowRate.muln(blockDelta);
    let interestAccumulated = math.mulScalarAndTruncate(interestFactor, totalBorrows);
    let totalBorrowsNew = totalBorrows.add(interestAccumulated);
    let reservesCurrent = math.mulScalarAndTruncate(reserveFactor, interestAccumulated);
    let borrowIndexNew = math.mulScalarAndTruncate(interestFactor, borrowIndex).add(borrowIndex);
    let supplyInterest = interestAccumulated.sub(reservesCurrent);
    return {
        totalBorrows: totalBorrowsNew,
        borrowIndex: borrowIndexNew,
        reservesDelta: reservesCurrent,
        interestDelta: supplyInterest,
    };
}

function getAccountBorrows(indexBefore, indexCurrent, borrowsBefore) {
    return borrowsBefore.mul(indexCurrent).div(indexBefore);
}

module.exports = {accrueInterest, getAccountBorrows};