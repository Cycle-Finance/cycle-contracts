async function makeBlock(blockNum, accounts) {
    for (let i = 0; i < blockNum; i++) {
        await web3.eth.sendTransaction({to: accounts[1], value: 1, from: accounts[0]});
    }
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

async function borrowPoolState(contract, user) {
    let borrowIndex = await contract.borrowIndex();
    let reserveFactor = await contract.reserveFactor();
    let accrualBlock = await contract.accrualBlock();
    let totalBorrows = await contract.totalBorrows();
    let accountBorrowsSnapshot = await contract.accountBorrowsSnapshot(user);
    let accountBorrows = await contract.getBorrows(user);
    return {
        borrowIndex: borrowIndex,
        reserveFactor: reserveFactor,
        accrualBlock: accrualBlock,
        totalBorrows: totalBorrows,
        accountBorrowsSnapshot: accountBorrowsSnapshot,
        accountBorrows: accountBorrows,
    };
}

module.exports = {makeBlock, borrowPoolState, marketState};