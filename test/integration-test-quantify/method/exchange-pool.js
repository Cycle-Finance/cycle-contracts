const math = require('./math');

// return amount of minted CFSC
function mint(assetPrice, assetAmount) {
    let assetValue = math.mulScalarAndTruncate(assetPrice, assetAmount);
    return math.div_(assetValue, math.expScale);
}

// return amount of required stable coin
function mintByCFSCAmount(assetPrice, cfscAmount) {
    let cfscValue = math.mulScalarAndTruncate(math.expScale, cfscAmount);
    return math.div_(cfscValue, assetPrice);
}

// return amount of burned CFSC
function burn(assetPrice, assetAmount) {
    let assetValue = math.mulScalarAndTruncate(assetPrice, assetAmount);
    return math.div_(assetValue, math.expScale);
}

// return amount of required
function burnByCFSCAmount(assetPrice, cfscAmount) {
    let cfscValue = math.mulScalarAndTruncate(math.expScale, cfscAmount);
    return math.div_(cfscValue, assetPrice);
}

module.exports = {
    mint, mintByCFSCAmount, burn, burnByCFSCAmount
};