const math = require('./math');

// return amount of minted CFSC
function mint(assetPrice, assetAmount, feeRate) {
    let assetValue = math.mulScalarAndTruncate(assetPrice, assetAmount);
    let cfscAmount = math.div_(assetValue, math.expScale);
    let fee = math.mulScalarAndTruncate(cfscAmount, feeRate);
    return [cfscAmount.sub(fee), fee]
}

// return amount of required stable coin
function mintByCFSCAmount(assetPrice, cfscAmount, feeRate) {
    let fee = math.mulScalarAndTruncate(cfscAmount, feeRate);
    cfscAmount = cfscAmount.sub(fee);
    let cfscValue = math.mulScalarAndTruncate(math.expScale, cfscAmount);
    return [math.div_(cfscValue, assetPrice), fee];
}

// return amount of burned CFSC
function burn(assetPrice, assetAmount, feeRate) {
    let assetValue = math.mulScalarAndTruncate(assetPrice, assetAmount);
    let cfscAmount = math.div_(assetValue, math.expScale);
    let fee = math.mulScalarAndTruncate(cfscAmount, feeRate);
    return [cfscAmount.sub(fee), fee]
}

// return amount of required
function burnByCFSCAmount(assetPrice, cfscAmount, feeRate) {
    let fee = math.mulScalarAndTruncate(cfscAmount, feeRate);
    cfscAmount = cfscAmount.sub(fee);
    let cfscValue = math.mulScalarAndTruncate(math.expScale, cfscAmount);
    return [math.div_(cfscValue, assetPrice), fee];
}

module.exports = {
    mint, mintByCFSCAmount, burn, burnByCFSCAmount
};