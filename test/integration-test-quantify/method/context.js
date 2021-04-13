async function makeBlock(blockNum, accounts) {
    for (let i = 0; i < blockNum; i++) {
        await web3.eth.sendTransaction({to: accounts[1], value: 1, from: accounts[0]});
    }
}

async function compState(comptroller, market, user) {
    let refreshedBlock = await comptroller.refreshedBlock();
    let totalDeposit = await comptroller.totalDeposit();
    let marketDeposit = await comptroller.marketDeposit(market.address);
    let marketInterestIndex = await comptroller.marketInterestIndex(market.address);
    let supplierInterestIndex = await comptroller.userInterestIndex(market.address, user);
    let marketSupplyIndex = await comptroller.supplyIndex(market.address);
    let supplierIndex = await comptroller.supplierIndex(market.address, user);

    let borrowDistributedBlock = await comptroller.borrowDistributedBlock();
    let borrowIndex = await comptroller.borrowIndex();
    let borrowerIndex = await comptroller.borrowerIndex(user);

    let accruedCFGT = await comptroller.userAccrued(user);
    return {
        refreshedBlock: refreshedBlock,
        totalDeposit: totalDeposit,
        marketDeposit: marketDeposit,
        marketInterestIndex: marketInterestIndex,
        supplierInterestIndex: supplierInterestIndex,
        marketSupplyIndex: marketSupplyIndex,
        supplierIndex: supplierIndex,

        borrowDistributedBlock: borrowDistributedBlock,
        borrowIndex: borrowIndex,
        borrowerIndex: borrowerIndex,

        accruedCFGT: accruedCFGT,
    };
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

async function getState(ctx, market, user) {
    let comp = compState(ctx.comptroller, market, user);
    let dToken = marketState(market, user);
    let bp = borrowPoolState(ctx.borrowPool, user);
    return {
        comp: comp,
        dToken: dToken,
        bp: bp,
    };
}

module.exports = {makeBlock, borrowPoolState, marketState, compState};