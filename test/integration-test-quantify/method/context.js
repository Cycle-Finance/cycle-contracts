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
    let comp = await compState(ctx.comptroller, market, user);
    let dToken = await marketState(market, user);
    let bp = await borrowPoolState(ctx.borrowPool, user);
    let cfgtBalance = await ctx.CFGT.balanceOf(user);
    let cfscBalance = await ctx.CFSC.balanceOf(user);
    let compCfscBalance = await ctx.CFSC.balanceOf(ctx.comptroller.address);
    let bpCfscBalance = await ctx.CFSC.balanceOf(ctx.borrowPool.address);
    let sysLiquidity = await ctx.comptroller.getSystemLiquidity();
    assert.equal(sysLiquidity[0].toString(), '0');
    let accountLiquidity = await ctx.comptroller.getAccountLiquidity(user);
    assert.equal(accountLiquidity[0].toString(), '0');
    return {
        comp: comp,
        dToken: dToken,
        bp: bp,
        cfgtBalance: cfgtBalance,
        cfscBalance: cfscBalance,
        compCfscBalance: compCfscBalance,
        bpCfscBalance: bpCfscBalance,
        sysLiquidity: [sysLiquidity[0], sysLiquidity[1]],
        accountLiquidity: [accountLiquidity[0], accountLiquidity[1]],
    };
}

async function userTotalDepositValue(ctx, user) {
    let ethValue = await ctx.dEther.userDepositValue(user);
    let wbtcValue = await ctx.dWBTC.userDepositValue(user);
    let usdcValue = await ctx.dUSDC.userDepositValue(user);
    let usdtValue = await ctx.dUSDT.userDepositValue(user);
    return ethValue.add(wbtcValue).add(usdcValue).add(usdtValue);
}

async function totalMarketDepositValue(ctx) {
    let ethValue = await ctx.dEther.depositValue();
    let wbtcValue = await ctx.dWBTC.depositValue();
    let usdcValue = await ctx.dUSDC.depositValue();
    let usdtValue = await ctx.dUSDT.depositValue();
    return ethValue.add(wbtcValue).add(usdcValue).add(usdtValue);
}

module.exports = {makeBlock, borrowPoolState, marketState, getState, userTotalDepositValue, totalMarketDepositValue};