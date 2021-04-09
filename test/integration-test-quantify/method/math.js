const expScale = web3.utils.toBN(web3.utils.toWei('1'));
const doubleScale = expScale * expScale;

function mul_(a, b) {
    return a.mul(b).div(expScale);
}

function div_(a, b) {
    return a.mul(expScale).div(b);
}

function expToDecimals(a) {
    return a / expScale;
}

function doubleToDecimals(a) {
    return a / expScale;
}

module.exports = {expScale, doubleScale, mul_, div_, expToDecimals, doubleToDecimals};