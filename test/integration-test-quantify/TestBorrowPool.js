const Comptroller = artifacts.require("Comptroller");
const Borrows = artifacts.require("Borrows");
const DERC20 = artifacts.require("DERC20");
const DEther = artifacts.require("DEther");
const ComptrollerProxy = artifacts.require("ComptrollerProxy");
const BorrowsProxy = artifacts.require("BorrowsProxy");
const dTokenProxy = artifacts.require("DTokenProxy");

const SimpleInterestRateModel = artifacts.require("SimpleInterestRateModel");
const ExchangePool = artifacts.require("ExchangePool");
const CycleStableCoin = artifacts.require("CycleStableCoin");
const CycleGovToken = artifacts.require("CycleToken");

/* test only, will be replaced at maninnet*/
const TestOracle = artifacts.require("TestOracle");
const USDC = artifacts.require("TestUSDC");
const USDT = artifacts.require("TestUSDT");
const WBTC = artifacts.require("TestWBTC");

const IERC20 = artifacts.require("IERC20");

const context = require('./method/context');
const borrow = require('./method/borrow-pool');
const math = require('./method/math');

let liquidation = false;
const maxUint256 = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
contract('test borrow pool', async (accounts) => {
    let ctx = {};
    before(async () => {
        let comptroller = await Comptroller.at(ComptrollerProxy.address);
        let dEther = await DEther.at(await comptroller.markets(0));
        let depositAmount = web3.utils.toWei('10');
        await dEther.mint(depositAmount, {value: depositAmount});
        // insure deposit successful
        let dEtherAmount = await dEther.balanceOf(accounts[0]);
        assert.equal(dEtherAmount.toString(), depositAmount.toString());

        let usdt = await USDT.deployed();
        let usdtAmount = 100000 * (10 ** 6);
        await usdt.transfer(accounts[1], usdtAmount);
        let exchangePool = await ExchangePool.deployed();
        await usdt.approve(exchangePool.address, usdtAmount, {from: accounts[1]});
        await exchangePool.mint(usdt.address, usdtAmount, {from: accounts[1]});
        ctx.comptroller = comptroller;
        ctx.borrowPool = await Borrows.at(BorrowsProxy.address);
        let interestRateModelAddr = await ctx.borrowPool.interestRateModel();
        ctx.interestRateModel = await SimpleInterestRateModel.at(interestRateModelAddr);
        ctx.cfsc = await CycleStableCoin.deployed();
        await ctx.cfsc.approve(ctx.borrowPool.address, maxUint256);
        await ctx.cfsc.approve(ctx.borrowPool.address, maxUint256, {from: accounts[1]});
        ctx.oracle = await TestOracle.deployed();
        ctx.dEther = dEther;
    });
    it('empty borrows', async () => {
        let stateBefore = await getState(ctx, accounts[0]);
        // forward some blocks
        await context.makeBlock(10, accounts);
        // accrue interest
        await ctx.comptroller.refreshMarketDeposit();
        // block delta has increased
        let stateAfter = await getState(ctx, accounts[0]);
        await assertBorrowPoolStateChange(ctx.interestRateModel, stateBefore, stateAfter,
            web3.utils.toBN(0), web3.utils.toBN(0));
    });
    it('borrow 1000 CFSC', async () => {
        let stateBefore = await getState(ctx, accounts[0]);
        let borrowAmount = web3.utils.toBN(web3.utils.toWei('1000'));
        await ctx.borrowPool.borrow(borrowAmount);
        let stateAfter = await getState(ctx, accounts[0]);
        await assertBorrowPoolStateChange(ctx.interestRateModel, stateBefore, stateAfter,
            borrowAmount, web3.utils.toBN(0));
        let cfscBalance = await ctx.cfsc.balanceOf(accounts[0]);
        assert.equal(cfscBalance.toString(), borrowAmount.toString());
    });
    it('forward some blocks', async () => {
        let stateBefore = await getState(ctx, accounts[0]);
        await context.makeBlock(20, accounts);
        let stateAfter = await getState(ctx, accounts[0]);
        await assertBorrowPoolStateChange(ctx.interestRateModel, stateBefore, stateAfter,
            web3.utils.toBN(0), web3.utils.toBN(0));
    });
    it('borrow 10000 CFSC', async () => {
        let stateBefore = await getState(ctx, accounts[0]);
        let borrowAmount = web3.utils.toBN(web3.utils.toWei('10000'));
        await ctx.borrowPool.borrow(borrowAmount);
        let stateAfter = await getState(ctx, accounts[0]);
        await assertBorrowPoolStateChange(ctx.interestRateModel, stateBefore, stateAfter,
            borrowAmount, web3.utils.toBN(0));
        let cfscBalance = await ctx.cfsc.balanceOf(accounts[0]);
        assert.equal(cfscBalance.toString(), web3.utils.toWei('11000').toString());
    });
    it('forward some blocks', async () => {
        let stateBefore = await getState(ctx, accounts[0]);
        await context.makeBlock(20, accounts);
        let stateAfter = await getState(ctx, accounts[0]);
        await assertBorrowPoolStateChange(ctx.interestRateModel, stateBefore, stateAfter,
            web3.utils.toBN(0), web3.utils.toBN(0));
    });
    it('repay 1000 CFSC', async () => {
        let stateBefore = await getState(ctx, accounts[0]);
        let repayAmount = web3.utils.toBN(web3.utils.toWei('1000'));
        await ctx.borrowPool.repayBorrow(ctx.cfsc.address, repayAmount);
        let stateAfter = await getState(ctx, accounts[0]);
        await assertBorrowPoolStateChange(ctx.interestRateModel, stateBefore, stateAfter,
            web3.utils.toBN(0), repayAmount);
    });
    it('forward some blocks', async () => {
        let stateBefore = await getState(ctx, accounts[0]);
        await context.makeBlock(12, accounts);
        let stateAfter = await getState(ctx, accounts[0]);
        await assertBorrowPoolStateChange(ctx.interestRateModel, stateBefore, stateAfter,
            web3.utils.toBN(0), web3.utils.toBN(0));
    });
    it('repay 1000 CFSC behalf', async () => {
        let stateBefore = await getState(ctx, accounts[0]);
        let repayAmount = web3.utils.toBN(web3.utils.toWei('1000'));
        await ctx.borrowPool.repayBorrowBehalf(ctx.cfsc.address, accounts[0], repayAmount, {from: accounts[1]});
        let stateAfter = await getState(ctx, accounts[0]);
        await assertBorrowPoolStateChange(ctx.interestRateModel, stateBefore, stateAfter,
            web3.utils.toBN(0), repayAmount);
    });
    it('forward some blocks', async () => {
        let stateBefore = await getState(ctx, accounts[0]);
        await context.makeBlock(13, accounts);
        let stateAfter = await getState(ctx, accounts[0]);
        await assertBorrowPoolStateChange(ctx.interestRateModel, stateBefore, stateAfter,
            web3.utils.toBN(0), web3.utils.toBN(0));
    });
    it('change ETH price and liquidate borrower', async () => {
        liquidation = true;
        let stateBefore = await getState(ctx, accounts[0]);
        await ctx.oracle.setPrice('0x0000000000000000000000000000000000000000',
            web3.utils.toBN(web3.utils.toWei('1000')));
        let amount = web3.utils.toBN(web3.utils.toWei('6666'));
        await ctx.borrowPool.liquidateBorrow(ctx.cfsc.address, ctx.dEther.address, accounts[0], amount, {from: accounts[1]});
        let stateAfter = await getState(ctx, accounts[0]);
        await assertBorrowPoolStateChange(ctx.interestRateModel, stateBefore, stateAfter,
            web3.utils.toBN(0), amount);
        liquidation = false;
    });
    it('forward some blocks', async () => {
        let stateBefore = await getState(ctx, accounts[0]);
        await context.makeBlock(13, accounts);
        let stateAfter = await getState(ctx, accounts[0]);
        await assertBorrowPoolStateChange(ctx.interestRateModel, stateBefore, stateAfter,
            web3.utils.toBN(0), web3.utils.toBN(0));
    });
    it('repay the remain borrows', async () => {
        let stateBefore = await getState(ctx, accounts[0]);
        await ctx.borrowPool.repayBorrow(ctx.cfsc.address, maxUint256);
        let stateAfter = await getState(ctx, accounts[0]);
        await assertBorrowPoolStateChange(ctx.interestRateModel, stateBefore, stateAfter,
            web3.utils.toBN(0), maxUint256);
    });
    it('forward some blocks', async () => {
        let stateBefore = await getState(ctx, accounts[0]);
        await context.makeBlock(13, accounts);
        let stateAfter = await getState(ctx, accounts[0]);
        await assertBorrowPoolStateChange(ctx.interestRateModel, stateBefore, stateAfter,
            web3.utils.toBN(0), web3.utils.toBN(0));
    });
});

async function getState(ctx, user) {
    let borrowPoolState = await context.borrowPoolState(ctx.borrowPool, user);
    let totalDeposit = await ctx.comptroller.totalDeposit();
    let borrowPoolCFSC = await ctx.cfsc.balanceOf(ctx.borrowPool.address);
    let comptrollerCFSC = await ctx.cfsc.balanceOf(ctx.comptroller.address);
    return {
        borrowPoolState: borrowPoolState,
        totalDeposit: totalDeposit,
        borrowPoolCFSC: borrowPoolCFSC,
        comptrollerCFSC: comptrollerCFSC
    }
}

// if borrow, borrowAmountChange > 0; if repayBorrow/liquidateBorrow, borrowAmountChange < 0
async function assertBorrowPoolStateChange(interestRateModel, stateBefore, stateAfter, borrowAmount, repayAmount) {
    let blockDelta = stateAfter.borrowPoolState.accrualBlock - stateBefore.borrowPoolState.accrualBlock;
    let totalBorrowsMantissa = stateBefore.borrowPoolState.totalBorrows;
    let borrowRate = await interestRateModel.borrowRatePerBlock(stateBefore.totalDeposit, totalBorrowsMantissa);
    let localState = borrow.accrueInterest(borrowRate, blockDelta, stateBefore.borrowPoolState.totalBorrows,
        stateBefore.borrowPoolState.reserveFactor, stateBefore.borrowPoolState.borrowIndex);
    if (repayAmount.toString() !== maxUint256.toString()) {
        assert.equal(localState.totalBorrows.add(borrowAmount).sub(repayAmount).toString(),
            stateAfter.borrowPoolState.totalBorrows.toString());
    }
    assert.equal(localState.borrowIndex.toString(), stateAfter.borrowPoolState.borrowIndex.toString());
    // if comptroller distribute interest to supplier, the assert will fail
    // in the cases of this file, only liquidate case could trigger supplier distribution
    if (!liquidation) {
        assert.equal(localState.interestDelta.toString(),
            stateAfter.comptrollerCFSC.sub(stateBefore.comptrollerCFSC).toString());
    }
    assert.equal(localState.reservesDelta.toString(),
        stateAfter.borrowPoolCFSC.sub(stateBefore.borrowPoolCFSC).toString());
    if (repayAmount.toString() !== maxUint256.toString()) {
        let localAccountBorrows = borrow.getAccountBorrows(stateBefore.borrowPoolState.borrowIndex,
            stateAfter.borrowPoolState.borrowIndex, stateBefore.borrowPoolState.accountBorrows);
        localAccountBorrows = localAccountBorrows.add(borrowAmount).sub(repayAmount);
        assert.ok(stateAfter.borrowPoolState.accountBorrows.cmp(localAccountBorrows) === 0);
    } else {
        assert.equal(stateAfter.borrowPoolState.accountBorrows.toString(), '0');
    }
    assert.ok(stateAfter.borrowPoolState.totalBorrows.cmp(stateAfter.borrowPoolState.accountBorrows) >= 0);
}