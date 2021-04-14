const expScale = web3.utils.toBN(web3.utils.toWei('1'));
const doubleScale = expScale.mul(expScale);

const expScaleMismatchThreshold = 1000000; // 1e-12
const doubleScaleMismatchThreshold = expScaleMismatchThreshold * expScaleMismatchThreshold;

function mul_(a, b) {
    return a.mul(b).div(expScale);
}

function mulScalarAndTruncate(a, b) {
    return a.mul(b).div(expScale);
}

function div_(a, b) {
    return a.mul(expScale).div(b);
}

function divAndTruncate(a, b) {
    return div_(a, b).div(expScale);
}

function fraction(a, b) {
    return a.mul(doubleScale).div(b);
}

function expToDecimals(a) {
    return a / expScale;
}

function doubleToDecimals(a) {
    return a / doubleScale;
}

module.exports = {
    expScale,
    doubleScale,
    mul_,
    div_,
    mulScalarAndTruncate,
    divAndTruncate,
    fraction,
    expToDecimals,
    doubleToDecimals,
    expScaleMismatchThreshold,
    doubleScaleMismatchThreshold
};