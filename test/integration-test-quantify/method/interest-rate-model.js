const math = require('./math');

const blocksPerYear = 2102400;

function multiplierPerBlock(multiplierPerYear) {
    return multiplierPerYear.divn(blocksPerYear);
}

function baseRatePerBlock(baseRatePerYear) {
    return baseRatePerYear.divn(blocksPerYear);
}

function utilizationRate(depositValue, borrowValue) {
    return math.div_(borrowValue, depositValue);
}

function borrowRatePerBlock(depositValue, borrowValue, baseRatePerYear, multiplierPerYear) {
    let ur = utilizationRate(depositValue, borrowValue);
    return baseRatePerBlock(baseRatePerYear).add(math.mul_(ur, multiplierPerBlock(multiplierPerYear)));
}

// reserve factor should less than 1^18
function supplyRatePerBlock(depositValue, borrowValue, baseRatePerYear, multiplierPerYear, reserveFactor) {
    let subReserveFactor = math.expScale.sub(reserveFactor);
    let borrowRate = borrowRatePerBlock(depositValue, borrowValue, baseRatePerYear, multiplierPerYear);
    let rateToPool = math.mul_(subReserveFactor, borrowRate);
    let ur = utilizationRate(depositValue, borrowValue);
    return math.mul_(rateToPool, ur);
}

module.exports = {
    blocksPerYear,
    multiplierPerBlock,
    baseRatePerBlock,
    utilizationRate,
    borrowRatePerBlock,
    supplyRatePerBlock
};