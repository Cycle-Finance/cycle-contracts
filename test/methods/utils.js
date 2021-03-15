const context = require('./context');

async function compareMarketProfit(ctx, market, user1, user2, blockNum) {
    let users = [user1, user2];
    await ctx.comptroller.claimAllProfit(users);
    let snapshot1 = await context.userBalanceState(ctx, market, user1);
    let snapshot2 = await context.userBalanceState(ctx, market, user2);
    for (let i = 0; i < blockNum; i++) {
        await ctx.comptroller.refreshMarketDeposit();
    }
    let markets = [market.address];
    await ctx.comptroller.claimInterest(markets, users);
    await ctx.comptroller.claimSupplierCFGT(markets, users);
    let snapshot3 = await context.userBalanceState(ctx, market, user1);
    let snapshot4 = await context.userBalanceState(ctx, market, user2);
    await ctx.comptroller.claimBorrowerCFGT(users);
    let cfscBalance1 = await ctx.CFSC.balanceOf(user1);
    let cfscBalance2 = await ctx.CFSC.balanceOf(user2);
    let cfgtBalance1 = await ctx.CFGT.balanceOf(user1);
    let cfgtBalance2 = await ctx.CFGT.balanceOf(user2);
    // console.log('cfscBalance1 %s, cfscBalance2 %s, cfgtBalance1 %s, cfgtBalance2 %s',
    //     cfscBalance1, cfscBalance2, cfgtBalance1, cfgtBalance2);
    // console.log('snapshot1.cfscBalance %s, snapshot2.cfscBalance %s, snapshot1.cfgtBalance %s,' +
    //     ' snapshot2.cfgtBalance %s, snapshot3.cfgtBalance %s, snapshot4.cfgtBalance %s',
    //     snapshot1.cfscBalance, snapshot2.cfscBalance, snapshot1.cfgtBalance,
    //     snapshot2.cfgtBalance, snapshot3.cfgtBalance, snapshot4.cfgtBalance);
    let interestGap = cfscBalance1.sub(snapshot1.cfscBalance).sub(cfscBalance2.sub(snapshot2.cfscBalance));
    let supplierCFGTGap = cfgtBalance1.sub(snapshot1.cfgtBalance).sub(cfgtBalance2.sub(snapshot2.cfgtBalance));
    let borrowerCFGTGap = cfgtBalance1.sub(snapshot3.cfgtBalance).sub(cfgtBalance2.sub(snapshot4.cfgtBalance));
    return [interestGap, supplierCFGTGap, borrowerCFGTGap];
}

module.exports = {compareMarketProfit};