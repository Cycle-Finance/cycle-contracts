const math = require('./math');

function depositValue(totalSupply, price) {
    return tokenValue(totalSupply, price);
}

function userDepositValue(userBalance, price) {
    return tokenValue(userBalance, price);
}

function tokenValue(amount, price) {
    return math.mul_(amount, price);
}

function tokenAmount(value, price) {
    return math.div_(value, price);
}

module.exports = {depositValue, userDepositValue, tokenValue, tokenAmount};