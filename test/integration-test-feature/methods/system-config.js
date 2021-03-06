async function SetPublicBorrower(ctx, publicBorrower) {
    await ctx.comptroller.setPublicBorrower(publicBorrower);
    let contractPublicBorrower = await ctx.comptroller.publicBorrower();
    assert.equal(publicBorrower, contractPublicBorrower);
}

async function SetMintPaused(ctx, market, state) {
    await ctx.comptroller.setMintPaused(market.address, state);
    let contractState = await ctx.comptroller.mintPaused(market.address);
    assert.equal(contractState, state);
}

async function SetBorrowPaused(ctx, state) {
    await ctx.comptroller.setBorrowPaused(state);
    let contractState = await ctx.comptroller.borrowPaused();
    assert.equal(contractState, state);
}

async function SetTransferPaused(ctx, state) {
    await ctx.comptroller.setTransferPaused(state);
    let contractState = await ctx.comptroller.transferPaused();
    assert.equal(contractState, state);
}

async function SetSeizePaused(ctx, state) {
    await ctx.comptroller.setSeizePaused(state);
    let contractState = await ctx.comptroller.seizePaused();
    assert.equal(contractState, state);
}

async function SetPublicBorrowThreshold(ctx, threshold) {
    await ctx.comptroller.setPublicBorrowThreshold(threshold);
    let contractState = await ctx.comptroller.publicBorrowThreshold();
    assert.equal(contractState, threshold);
}

async function SetMaxSystemUtilizationRate(ctx, rate) {
    await ctx.comptroller.setMaxSystemUtilizationRate(rate);
    let contractState = await ctx.comptroller.maxSystemUtilizationRate();
    assert.equal(contractState, rate);
}

async function SetMaxCloseFactor(ctx, factor) {
    await ctx.comptroller.setMaxCloseFactor(factor);
    let contractState = await ctx.comptroller.maxCloseFactor();
    assert.equal(contractState, factor);
}

async function SetLiquidationIncentive(ctx, incentive) {
    await ctx.comptroller.setLiquidationIncentive(incentive);
    let contractState = await ctx.comptroller.liquidationIncentive();
    assert.equal(contractState, incentive);
}

async function SetPrice(ctx, asset, decimals, price) {
    let bnPrice = web3.utils.toBN(price);
    await ctx.oracle.setPrice(asset, bnPrice);
    let contractState = await ctx.oracle.getPrice(asset);
    let expScale = web3.utils.toBN(web3.utils.toWei('1'));
    let decimalsScale = web3.utils.toBN(10).pow(web3.utils.toBN(decimals));
    let correctPrice = bnPrice.mul(expScale).div(decimalsScale);
    assert.equal(contractState.toString(), correctPrice.toString());
}

module.exports = {
    SetPublicBorrower, SetMintPaused, SetBorrowPaused, SetTransferPaused, SetSeizePaused,
    SetPublicBorrowThreshold, SetMaxSystemUtilizationRate, SetMaxCloseFactor, SetLiquidationIncentive,
    SetPrice
}