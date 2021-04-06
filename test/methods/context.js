let CycleContext = {
    comptroller: {},
    borrowPool: {},
    exchangePool: {},
    CFGT: {},
    CFSC: {},
    dEther: {},
    dWBTC: {},
    dUSDT: {},
    dUSDC: {},
    WBTC: {},
    USDC: {},
    USDT: {},
    oracle: {},
    IERC20: {},
};

async function comptrollerState(ctx, market, user) {
    let publicBorrower = await ctx.comptroller.publicBorrower();
    let borrowPool = await ctx.comptroller.borrowPool();
    let refreshedBlock = await ctx.comptroller.refreshedBlock();
    let totalDeposit = await ctx.comptroller.totalDeposit();
    let borrowDistributedBlock = await ctx.comptroller.borrowDistributedBlock();
    let borrowIndex = await ctx.comptroller.borrowIndex();
    let supplySpeed = await ctx.comptroller.supplySpeed();
    let borrowSpeed = await ctx.comptroller.borrowSpeed();
    let maxSystemUtilizationRate = await ctx.comptroller.maxSystemUtilizationRate();
    let maxCloseFactor = await ctx.comptroller.maxCloseFactor();
    let liquidationIncentive = await ctx.comptroller.liquidationIncentive();
    let borrowPaused = await ctx.comptroller.borrowPaused();
    let transferPaused = await ctx.comptroller.transferPaused();
    let seizePaused = await ctx.comptroller.seizePaused();

    let marketDeposit = await ctx.comptroller.marketDeposit(market.address);
    let marketInterestIndex = await ctx.comptroller.marketInterestIndex(market.address);
    let supplyIndex = await ctx.comptroller.supplyIndex(market.address);
    let collateralFactor = await ctx.comptroller.collateralFactor(market.address);
    let mintPaused = await ctx.comptroller.mintPaused(market.address);

    let userInterestIndex = await ctx.comptroller.userInterestIndex(market.address, user);
    let supplierIndex = await ctx.comptroller.supplierIndex(market.address, user);
    let borrowerIndex = await ctx.comptroller.borrowerIndex(user);
    let userAccrued = await ctx.comptroller.userAccrued(user);

    let systemLiquidity = await ctx.comptroller.getSystemLiquidity();
    let accountLiquidity = await ctx.comptroller.getAccountLiquidity(user);
    assert.ok(systemLiquidity[0].toNumber() === 0);
    assert.ok(accountLiquidity[0].toNumber() === 0);
    return {
        publicBorrower: publicBorrower,
        borrowPool: borrowPool,
        refreshedBlock: refreshedBlock,
        totalDeposit: totalDeposit,
        borrowDistributedBlock: borrowDistributedBlock,
        borrowIndex: borrowIndex,
        supplySpeed: supplySpeed,
        borrowSpeed: borrowSpeed,
        maxSystemUtilizationRate: maxSystemUtilizationRate,
        maxCloseFactor: maxCloseFactor,
        liquidationIncentive: liquidationIncentive,
        borrowPaused: borrowPaused,
        transferPaused: transferPaused,
        seizePaused: seizePaused,

        marketDeposit: marketDeposit,
        marketInterestIndex: marketInterestIndex,
        supplyIndex: supplyIndex,
        collateralFactor: collateralFactor,
        mintPaused: mintPaused,

        userInterestIndex: userInterestIndex,
        supplierIndex: supplierIndex,
        borrowerIndex: borrowerIndex,
        userAccrued: userAccrued,

        systemLiquidity: systemLiquidity,
        userLiquidity: accountLiquidity
    };
}

async function borrowPoolState(ctx, user) {
    let interestRateModel = await ctx.borrowPool.interestRateModel();
    let comptroller = await ctx.borrowPool.comptroller();
    let exchangePool = await ctx.borrowPool.exchangePool();
    let oracle = await ctx.borrowPool.oracle();
    let reserveFactor = await ctx.borrowPool.reserveFactor();
    let borrowIndex = await ctx.borrowPool.borrowIndex();
    let accrualBlock = await ctx.borrowPool.accrualBlock();
    let totalBorrows = await ctx.borrowPool.totalBorrows();
    let userBorrows = await ctx.borrowPool.getBorrows(user);
    return {
        interestRateModel: interestRateModel,
        comptroller: comptroller,
        exchangePool: exchangePool,
        oracle: oracle,
        reserveFactor: reserveFactor,
        borrowIndex: borrowIndex,
        accrualBlock: accrualBlock,
        totalBorrows: totalBorrows,
        userBorrows: userBorrows,
    };
}

let zeroAddress = '0x0000000000000000000000000000000000000000';

async function userBalanceState(ctx, market, user) {
    let underlyingBalance;
    let underlyingAsset = await market.underlyingAsset();
    if (underlyingAsset === zeroAddress) {
        underlyingBalance = web3.utils.toBN(await web3.eth.getBalance(user));
    } else {
        let iERC20 = await ctx.IERC20.at(underlyingAsset)
        underlyingBalance = await iERC20.balanceOf(user);
    }
    let dTokenBalance = await market.balanceOf(user);
    let cfgtBalance = await ctx.CFGT.balanceOf(user);
    let cfscBalance = await ctx.CFSC.balanceOf(user);
    return {
        underlyingBalance: underlyingBalance,
        dTokenBalance: dTokenBalance,
        cfgtBalance: cfgtBalance,
        cfscBalance: cfscBalance,
    };
}

async function ctxState(ctx, market, user) {
    let compState = await comptrollerState(ctx, market, user);
    let bpState = await borrowPoolState(ctx, user);
    let balanceState = await userBalanceState(ctx, market, user);
    return {
        comptrollerState: compState,
        borrowPoolState: bpState,
        userBalanceState: balanceState,
    };
}

module.exports = {comptrollerState, borrowPoolState, userBalanceState, ctxState};