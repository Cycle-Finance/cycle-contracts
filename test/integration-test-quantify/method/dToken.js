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
    return math.divAndTruncate(value, price);
}

async function marketState(contract, user) {
    let totalSupply = await contract.totalSupply();
    let userBalance = await contract.balanceOf(user);
    let depositValue = await contract.depositValue();
    let userDepositValue = await contract.userDepositValue(user);
    return {
        totalSupply: totalSupply,
        userBalance: userBalance,
        depositValue: depositValue,
        userDepositValue: userDepositValue
    };
}

module.exports = {depositValue, userDepositValue, tokenValue, tokenAmount, marketState};