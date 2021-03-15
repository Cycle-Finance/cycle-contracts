async function SetPublicBorrower(ctx, publicBorrower) {
    await ctx.comptroller.setPublicBorrower(publicBorrower);
    let contractPublicBorrower = await ctx.comptroller.publicBorrower();
    assert.equal(publicBorrower, contractPublicBorrower);
}

async function SetMintPaused(ctx, market, state) {
    await ctx.comptroller.setMintPaused(market, state);
    let contractState = await ctx.comptroller.mintPaused(market);
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

module.exports = {
    SetPublicBorrower, SetMintPaused, SetBorrowPaused, SetTransferPaused, SetSeizePaused
}