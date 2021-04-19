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
const math = require('./method/math');
const utils = require('./comptrollerutils');
const localInterestRateModel = require('./method/interest-rate-model');
const localComp = require('./method/comptroller');

/***
 * we compare the difference of CFGT distribution at different market and different user
 * */

let ctx = {};
let param = {};
const maxUint256 = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
contract('test comptroller with borrow', async (accounts) => {
    before(async () => {
        let wbtc = await WBTC.deployed();
        let usdc = await USDC.deployed();
        let usdt = await USDT.deployed();
        let comptroller = await Comptroller.at(ComptrollerProxy.address);
        let dEther = await DEther.at(await comptroller.markets(0));
        let dWBTC = await DERC20.at(await comptroller.markets(1));
        let dUSDC = await DERC20.at(await comptroller.markets(2));
        let dUSDT = await DERC20.at(await comptroller.markets(3));
        let CFGT = await CycleGovToken.deployed();
        let CFSC = await CycleStableCoin.deployed();
        let borrowPool = await Borrows.at(BorrowsProxy.address);
        let exchangePool = await ExchangePool.deployed();
        let oracle = await TestOracle.deployed();
        let interestRateModel = await SimpleInterestRateModel.deployed();
        // init context
        ctx = {
            comptroller: comptroller,
            borrowPool: borrowPool,
            exchangePool: exchangePool,
            CFGT: CFGT,
            CFSC: CFSC,
            dEther: dEther,
            dWBTC: dWBTC,
            dUSDT: dUSDT,
            dUSDC: dUSDC,
            WBTC: wbtc,
            USDC: usdc,
            USDT: usdt,
            oracle: oracle,
            IERC20: IERC20,
            interestRateModel: interestRateModel
        };
        // transfer asset to other accounts
        let wbtcAmount = web3.utils.toBN(1000 * (10 ** 8));
        let usdAmount = web3.utils.toBN(1000000 * (10 ** 6));
        await wbtc.transfer(accounts[1], wbtcAmount);
        await usdc.transfer(accounts[1], usdAmount);
        await usdt.transfer(accounts[1], usdAmount);
        // transfer preserved CFGT to other accounts
        await CFGT.transfer(accounts[9], await CFGT.balanceOf(accounts[0]));
        // fetch system params
        param.supplySpeed = await comptroller.supplySpeed();
        param.borrowSpeed = await comptroller.borrowSpeed();
        param.collateralFactor = [
            await comptroller.collateralFactor(dEther.address),
            await comptroller.collateralFactor(dWBTC.address),
            await comptroller.collateralFactor(dUSDC.address),
            await comptroller.collateralFactor(dUSDT.address)
        ];
        param.liquidationIncentive = await comptroller.liquidationIncentive();
        param.reserveFactor = await borrowPool.reserveFactor();
        param.maxSystemUtilizationRate = await comptroller.maxSystemUtilizationRate();
        param.multiplierPerYear = web3.utils.toBN(math.expScale * 0.5);
        param.baseRatePerYear = web3.utils.toBN(math.expScale * 0.03);
        param.ethPrice = await oracle.getPrice(await dEther.underlyingAsset());
        param.wbtcPrice = await oracle.getPrice(WBTC.address);
        param.usdcPrice = await oracle.getPrice(USDC.address);
        param.usdtPrice = await oracle.getPrice(USDT.address);
        // prepare enough deposit
        // user deposit value is 1*51234+10*1902+10000*1+10000*1.012=90374
        // borrow limit is 90374*0.75=67780.5
        let ethDepositAmount = web3.utils.toWei('10');
        await dEther.mint(ethDepositAmount, {value: ethDepositAmount});
        await dEther.mint(ethDepositAmount, {from: accounts[1], value: ethDepositAmount});
        await wbtc.approve(dWBTC.address, wbtcAmount);
        await wbtc.approve(dWBTC.address, wbtcAmount, {from: accounts[1]});
        await dWBTC.mint(wbtcAmount.divn(1000));
        await dWBTC.mint(wbtcAmount.divn(1000), {from: accounts[1]});
        await usdc.approve(dUSDC.address, usdAmount);
        await usdc.approve(dUSDC.address, usdAmount, {from: accounts[1]});
        await dUSDC.mint(usdAmount.divn(100));
        await dUSDC.mint(usdAmount.divn(100), {from: accounts[1]});
        await usdt.approve(dUSDT.address, usdAmount);
        await usdt.approve(dUSDT.address, usdAmount, {from: accounts[1]});
        await dUSDT.mint(usdAmount.divn(100));
        await dUSDT.mint(usdAmount.divn(100), {from: accounts[1]});
        // clear state
        await comptroller.claimAllProfit([accounts[0], accounts[1]]);
    });
    it('no borrow distribution when accounts[0] first borrow', async () => {
        let stateBefore = await context.getState(ctx, ctx.dEther, accounts[0]);
        let borrowAmount = web3.utils.toBN(web3.utils.toWei('67700'));
        await ctx.borrowPool.borrow(borrowAmount);
        let stateAfter = await context.getState(ctx, ctx.dEther, accounts[0]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_BORROWER, borrowAmount, param);
        assert.equal(stateAfter.cfgtBalance.sub(stateBefore.cfgtBalance).toString(), 0);
        assert.equal(stateAfter.cfscBalance.sub(stateBefore.cfscBalance).toString(), borrowAmount.toString());
    });
    it('no borrow distribution when accounts[1] first borrow', async () => {
        let stateBefore = await context.getState(ctx, ctx.dEther, accounts[1]);
        let borrowAmount = web3.utils.toBN(web3.utils.toWei('67700'));
        let contractBaseRatePerBlock = await ctx.interestRateModel.baseRatePerBlock();
        assert.equal(localInterestRateModel.baseRatePerBlock(param.baseRatePerYear).toString(),
            contractBaseRatePerBlock.toString());
        let contractMultiplierPerBlock = await ctx.interestRateModel.multiplierPerBlock();
        assert.equal(localInterestRateModel.multiplierPerBlock(param.multiplierPerYear).toString(),
            contractMultiplierPerBlock.toString());
        let contractUR = await ctx.interestRateModel.utilizationRate(stateBefore.comp.totalDeposit,
            stateBefore.bp.totalBorrows);
        assert.equal(localInterestRateModel.utilizationRate(stateBefore.comp.totalDeposit,
            stateBefore.bp.totalBorrows).toString(), contractUR.toString());
        let contractBorrowRate = await ctx.interestRateModel.borrowRatePerBlock(stateBefore.comp.totalDeposit,
            stateBefore.bp.totalBorrows);
        let localBorrowRate = localInterestRateModel.borrowRatePerBlock(stateBefore.comp.totalDeposit,
            stateBefore.bp.totalBorrows, param.baseRatePerYear, param.multiplierPerYear);
        assert.equal(contractBorrowRate.toString(), localBorrowRate.toString());
        await ctx.borrowPool.borrow(borrowAmount, {from: accounts[1]});
        let stateAfter = await context.getState(ctx, ctx.dEther, accounts[1]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_BORROWER, borrowAmount, param);
        assert.equal(stateAfter.cfgtBalance.sub(stateBefore.cfgtBalance).toString(), 0);
        assert.equal(stateAfter.cfscBalance.sub(stateBefore.cfscBalance).toString(), borrowAmount.toString());
    });
    it('accounts borrow same value should get same profit', async () => {
        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1]]);

        let stateBefore0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        let stateBefore1 = await context.getState(ctx, ctx.dEther, accounts[1]);
        await ctx.comptroller.claimBorrowerCFGT([accounts[0], accounts[1]]);
        let stateAfter0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        let stateAfter1 = await context.getState(ctx, ctx.dEther, accounts[1]);
        utils.assertStateChange(stateBefore0, stateAfter0, utils.KIND_BORROWER, web3.utils.toBN(0), param);
        utils.assertBalanceChange(stateBefore1, stateAfter1, utils.KIND_BORROWER, web3.utils.toBN(0));
        assert.equal(stateAfter0.cfscBalance.sub(stateBefore0.cfscBalance).toString(),
            stateAfter1.cfscBalance.sub(stateBefore1.cfscBalance).toString());
    });
    it('account repay same borrow got different borrow CFGT distribution', async () => {
        let stateBefore = await context.getState(ctx, ctx.dEther, accounts[0]);
        let repayAmount = web3.utils.toBN(web3.utils.toWei('700'));
        let repayAmountParam = repayAmount.mul(web3.utils.toBN(-1));
        await ctx.CFSC.approve(ctx.borrowPool.address, maxUint256);
        await ctx.borrowPool.repayBorrow(ctx.CFSC.address, repayAmount);
        let stateAfter = await context.getState(ctx, ctx.dEther, accounts[0]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_BORROWER, repayAmountParam, param);
        // record CFGT distribution
        let singleDelta1 = stateAfter.cfgtBalance.sub(stateBefore.cfgtBalance)
            .div(stateAfter.comp.refreshedBlock.sub(stateBefore.comp.refreshedBlock));
        // account borrow distribution is borrowSpeed * accountBorrows/totalBorrows
        // if we compare compare thd difference between two withdrawal, we compare accountBorrows/totalBorrows only,
        // because borrowSpeed is constant
        let weight1 = math.div_(stateBefore.bp.accountBorrows, stateBefore.bp.totalBorrows);
        stateBefore = stateAfter;
        await ctx.borrowPool.repayBorrow(ctx.CFSC.address, repayAmount);
        stateAfter = await context.getState(ctx, ctx.dEther, accounts[0]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_BORROWER, repayAmountParam, param);
        // record CFGT distribution
        let singleDelta2 = stateAfter.cfgtBalance.sub(stateBefore.cfgtBalance)
            .div(stateAfter.comp.refreshedBlock.sub(stateBefore.comp.refreshedBlock));
        assert.ok(singleDelta1.cmpn(0) > 0);
        assert.ok(singleDelta2.cmpn(0) > 0);
        let weight2 = math.div_(stateBefore.bp.accountBorrows, stateBefore.bp.totalBorrows);
        // mismatch should be less than math.expScaleMismatchThreshold/math.expScale CFGT
        assert.ok(math.mulScalarAndTruncate(weight1, singleDelta2)
            .sub(math.mulScalarAndTruncate(weight2, singleDelta1)).abs()
            .cmpn(math.expScaleMismatchThreshold) <= 0);
        // borrow repaid value to restore test context
        await ctx.borrowPool.borrow(repayAmount.muln(2));
    });
    it('account[1] liquidate account[0] at dWBTC', async () => {
        // change price firstly, user borrowLimit is (35000+39140)*0.75=55605, sys max borrows is 59140*0.9=66726
        await ctx.oracle.setPrice(ctx.WBTC.address, web3.utils.toWei('35000'));
        let btcCurrentPrice = await ctx.oracle.getPrice(ctx.WBTC.address);
        // we repay accounts[1] borrow so that accounts[1] has enough liquidity
        await ctx.USDC.approve(ctx.borrowPool.address, maxUint256, {from: accounts[1]});
        await ctx.borrowPool.repayBorrow(ctx.USDC.address, maxUint256, {from: accounts[1]});
        // prepare some CFSC
        await ctx.USDC.approve(ctx.exchangePool.address, maxUint256, {from: accounts[1]});
        await ctx.exchangePool.mintByCFSCAmount(ctx.USDC.address, web3.utils.toWei('40000'), {from: accounts[1]});
        // redeem
        await ctx.dEther.redeem(web3.utils.toWei('10'), {from: accounts[1]});
        await ctx.dWBTC.redeem(10 ** 8, {from: accounts[1]});
        await ctx.dUSDC.redeem(10000 * (10 ** 6), {from: accounts[1]});
        await ctx.dUSDT.redeem(10000 * (10 ** 6), {from: accounts[1]});

        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1]]);

        let stateBefore0 = await context.getState(ctx, ctx.dWBTC, accounts[0]);
        let stateBefore1 = await context.getState(ctx, ctx.dWBTC, accounts[1]);
        /* check liquidity */
        assert.ok(stateBefore0.accountLiquidity[1].cmpn(0) > 0);
        await assertLiquidity(ctx, stateBefore0, accounts[0]);
        await assertLiquidity(ctx, stateBefore1, accounts[1]);

        // liquidate
        let liquidateAmount = web3.utils.toBN(web3.utils.toWei('100'));
        await ctx.CFSC.approve(ctx.borrowPool.address, maxUint256, {from: accounts[1]});
        await ctx.borrowPool.liquidateBorrow(ctx.CFSC.address, ctx.dWBTC.address, accounts[0], liquidateAmount,
            {from: accounts[1]});
        let stateAfter0 = await context.getState(ctx, ctx.dWBTC, accounts[0]);
        let stateAfter1 = await context.getState(ctx, ctx.dWBTC, accounts[1]);
        /* check liquidity */
        await assertLiquidity(ctx, stateAfter0, accounts[0]);
        await assertLiquidity(ctx, stateAfter1, accounts[1]);
        // we check seized token num
        let seizedDelta0 = stateBefore0.dToken.userBalance.sub(stateAfter0.dToken.userBalance);
        let seizedDelta1 = stateAfter1.dToken.userBalance.sub(stateBefore1.dToken.userBalance);
        assert.equal(seizedDelta0.toString(), seizedDelta1.toString());
        let localSeizedTokenNum = localComp.calculateSeizeToken(btcCurrentPrice, liquidateAmount,
            param.liquidationIncentive);
        assert.equal(seizedDelta0.toString(), localSeizedTokenNum.toString());
        assert.ok(localSeizedTokenNum.cmpn(0) > 0);
        // check state change
        utils.assertStateChange(stateBefore0, stateAfter0, utils.KIND_LIQUIDATEE, web3.utils.toBN(0), param);
        utils.assertBalanceChange(stateBefore1, stateAfter1, utils.KIND_LIQUIDATOR,
            liquidateAmount.mul(web3.utils.toBN(-1)));
    });
    it('account[1] liquidate account[0] at dEther', async () => {
        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1]]);

        let stateBefore0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        let stateBefore1 = await context.getState(ctx, ctx.dEther, accounts[1]);
        /* check liquidity */
        assert.ok(stateBefore0.accountLiquidity[1].cmpn(0) > 0);
        await assertLiquidity(ctx, stateBefore0, accounts[0]);
        await assertLiquidity(ctx, stateBefore1, accounts[1]);

        // liquidate
        let liquidateAmount = web3.utils.toBN(web3.utils.toWei('100'));
        await ctx.borrowPool.liquidateBorrow(ctx.CFSC.address, ctx.dEther.address, accounts[0], liquidateAmount,
            {from: accounts[1]});
        let stateAfter0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        let stateAfter1 = await context.getState(ctx, ctx.dEther, accounts[1]);
        /* check liquidity */
        await assertLiquidity(ctx, stateAfter0, accounts[0]);
        await assertLiquidity(ctx, stateAfter1, accounts[1]);
        // we check seized token num
        let seizedDelta0 = stateBefore0.dToken.userBalance.sub(stateAfter0.dToken.userBalance);
        let seizedDelta1 = stateAfter1.dToken.userBalance.sub(stateBefore1.dToken.userBalance);
        assert.equal(seizedDelta0.toString(), seizedDelta1.toString());
        let localSeizedTokenNum = localComp.calculateSeizeToken(param.ethPrice, liquidateAmount,
            param.liquidationIncentive);
        assert.equal(seizedDelta0.toString(), localSeizedTokenNum.toString());
        assert.ok(localSeizedTokenNum.cmpn(0) > 0);
        // check state change
        utils.assertStateChange(stateBefore0, stateAfter0, utils.KIND_LIQUIDATEE, web3.utils.toBN(0), param);
        utils.assertBalanceChange(stateBefore1, stateAfter1, utils.KIND_LIQUIDATOR,
            liquidateAmount.mul(web3.utils.toBN(-1)));
    });
    it('account[1] liquidate account[0] at dUSDC', async () => {
        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1]]);

        let stateBefore0 = await context.getState(ctx, ctx.dUSDC, accounts[0]);
        let stateBefore1 = await context.getState(ctx, ctx.dUSDC, accounts[1]);
        /* check liquidity */
        assert.ok(stateBefore0.accountLiquidity[1].cmpn(0) > 0);
        await assertLiquidity(ctx, stateBefore0, accounts[0]);
        await assertLiquidity(ctx, stateBefore1, accounts[1]);

        // liquidate
        let liquidateAmount = web3.utils.toBN(web3.utils.toWei('100'));
        await ctx.borrowPool.liquidateBorrow(ctx.CFSC.address, ctx.dUSDC.address, accounts[0], liquidateAmount,
            {from: accounts[1]});
        let stateAfter0 = await context.getState(ctx, ctx.dUSDC, accounts[0]);
        let stateAfter1 = await context.getState(ctx, ctx.dUSDC, accounts[1]);
        /* check liquidity */
        await assertLiquidity(ctx, stateAfter0, accounts[0]);
        await assertLiquidity(ctx, stateAfter1, accounts[1]);
        // we check seized token num
        let seizedDelta0 = stateBefore0.dToken.userBalance.sub(stateAfter0.dToken.userBalance);
        let seizedDelta1 = stateAfter1.dToken.userBalance.sub(stateBefore1.dToken.userBalance);
        assert.equal(seizedDelta0.toString(), seizedDelta1.toString());
        let localSeizedTokenNum = localComp.calculateSeizeToken(param.usdcPrice, liquidateAmount,
            param.liquidationIncentive);
        assert.equal(seizedDelta0.toString(), localSeizedTokenNum.toString());
        assert.ok(localSeizedTokenNum.cmpn(0) > 0);
        // check state change
        utils.assertStateChange(stateBefore0, stateAfter0, utils.KIND_LIQUIDATEE, web3.utils.toBN(0), param);
        utils.assertBalanceChange(stateBefore1, stateAfter1, utils.KIND_LIQUIDATOR,
            liquidateAmount.mul(web3.utils.toBN(-1)));
    });
    it('account[1] liquidate account[0] at dUSDT', async () => {
        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1]]);

        let stateBefore0 = await context.getState(ctx, ctx.dUSDT, accounts[0]);
        let stateBefore1 = await context.getState(ctx, ctx.dUSDT, accounts[1]);
        /* check liquidity */
        assert.ok(stateBefore0.accountLiquidity[1].cmpn(0) > 0);
        await assertLiquidity(ctx, stateBefore0, accounts[0]);
        await assertLiquidity(ctx, stateBefore1, accounts[1]);

        // liquidate
        let liquidateAmount = web3.utils.toBN(web3.utils.toWei('100'));
        await ctx.borrowPool.liquidateBorrow(ctx.CFSC.address, ctx.dUSDT.address, accounts[0], liquidateAmount,
            {from: accounts[1]});
        let stateAfter0 = await context.getState(ctx, ctx.dUSDT, accounts[0]);
        let stateAfter1 = await context.getState(ctx, ctx.dUSDT, accounts[1]);
        /* check liquidity */
        await assertLiquidity(ctx, stateAfter0, accounts[0]);
        await assertLiquidity(ctx, stateAfter1, accounts[1]);
        // we check seized token num
        let seizedDelta0 = stateBefore0.dToken.userBalance.sub(stateAfter0.dToken.userBalance);
        let seizedDelta1 = stateAfter1.dToken.userBalance.sub(stateBefore1.dToken.userBalance);
        assert.equal(seizedDelta0.toString(), seizedDelta1.toString());
        let localSeizedTokenNum = localComp.calculateSeizeToken(param.usdtPrice, liquidateAmount,
            param.liquidationIncentive);
        assert.equal(seizedDelta0.toString(), localSeizedTokenNum.toString());
        assert.ok(localSeizedTokenNum.cmpn(0) > 0);
        // check state change
        utils.assertStateChange(stateBefore0, stateAfter0, utils.KIND_LIQUIDATEE, web3.utils.toBN(0), param);
        utils.assertBalanceChange(stateBefore1, stateAfter1, utils.KIND_LIQUIDATOR,
            liquidateAmount.mul(web3.utils.toBN(-1)));
    });
    it('account with no borrows cannot got borrow CFGT distribution', async () => {
        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1]]);

        let stateBefore0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        let stateBefore1 = await context.getState(ctx, ctx.dEther, accounts[1]);
        assert.ok(stateBefore0.bp.accountBorrows.cmpn(0) > 0);
        assert.ok(stateBefore1.bp.accountBorrows.cmpn(0) === 0);
        await ctx.comptroller.claimBorrowerCFGT([accounts[0], accounts[1]]);
        let stateAfter0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        let stateAfter1 = await context.getState(ctx, ctx.dEther, accounts[1]);
        utils.assertStateChange(stateBefore0, stateAfter0, utils.KIND_BORROWER, web3.utils.toBN(0), param);
        utils.assertBalanceChange(stateBefore1, stateAfter1, utils.KIND_BORROWER, web3.utils.toBN(0));
        assert.ok(stateAfter0.cfgtBalance.sub(stateBefore0.cfgtBalance).cmpn(0) > 0);
        assert.ok(stateAfter1.cfgtBalance.sub(stateBefore1.cfgtBalance).cmpn(0) === 0);
    });
    it('public borrower could got borrow CFGT distribution', async () => {
        // restore BTC price firstly
        await ctx.oracle.setPrice(ctx.WBTC.address, web3.utils.toWei('51234'));
        let publicBorrower = accounts[2];
        await ctx.comptroller.setPublicBorrower(publicBorrower);
        let accountBorrows0 = await ctx.borrowPool.getBorrows(accounts[0]);
        let publicBorrows = await ctx.borrowPool.getBorrows(publicBorrower);
        assert.ok(accountBorrows0.cmpn(0) > 0);
        assert.ok(publicBorrows.cmpn(0) === 0);
        await ctx.CFSC.approve(ctx.borrowPool.address, maxUint256);
        // ensure publicBorrower could borrow
        await ctx.borrowPool.repayBorrow(ctx.CFSC.address, accountBorrows0.divn(2));

        accountBorrows0 = await ctx.borrowPool.getBorrows(accounts[0]);
        await ctx.borrowPool.borrow(accountBorrows0, {from: publicBorrower});

        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0], publicBorrower]);

        let stateBefore0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        let publicBorrowerStateBefore = await context.getState(ctx, ctx.dEther, publicBorrower);
        assert.ok(stateBefore0.bp.accountBorrows.cmpn(0) > 0);
        await ctx.comptroller.claimBorrowerCFGT([accounts[0], publicBorrower]);
        let stateAfter0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        let publicBorrowerStateAfter = await context.getState(ctx, ctx.dEther, publicBorrower);
        utils.assertStateChange(stateBefore0, stateAfter0, utils.KIND_BORROWER, web3.utils.toBN(0), param);
        utils.assertBalanceChange(publicBorrowerStateBefore, publicBorrowerStateAfter, utils.KIND_BORROWER,
            web3.utils.toBN(0));
        let cfgtDelta0 = stateAfter0.cfgtBalance.sub(stateBefore0.cfgtBalance);
        let publicBorrowerCfgtDelta = publicBorrowerStateAfter.cfgtBalance.sub(publicBorrowerStateBefore.cfgtBalance);
        assert.ok(cfgtDelta0.cmpn(0) > 0);
        assert.ok(cfgtDelta0.mul(publicBorrowerStateAfter.bp.accountBorrows).div(math.expScale)
            .sub(publicBorrowerCfgtDelta.mul(stateAfter0.bp.accountBorrows).div(math.expScale))
            .cmpn(math.expScaleMismatchThreshold) <= 0);
    });
    it('borrower could got interest and supply/borrow CFGT at same time', async () => {
        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1]]);

        let stateBefore0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        assert.ok(stateBefore0.bp.accountBorrows.cmpn(0) > 0);
        await ctx.comptroller.claimAllProfit([accounts[0]]);
        let stateAfter0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        // check interest distribution
        assert.ok(stateAfter0.cfscBalance.cmp(stateBefore0.cfscBalance) > 0);
        let cfgtDelta0 = stateAfter0.cfgtBalance.sub(stateBefore0.cfgtBalance).div(
            stateAfter0.comp.refreshedBlock.sub(stateBefore0.comp.refreshedBlock)
        );
        assert.ok(cfgtDelta0.cmpn(0) > 0);
        stateBefore0 = stateAfter0;
        await ctx.comptroller.claimBorrowerCFGT([accounts[0]]);
        stateAfter0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        // check interest distribution
        assert.ok(stateAfter0.cfscBalance.cmp(stateBefore0.cfscBalance) === 0);
        let cfgtDelta1 = stateAfter0.cfgtBalance.sub(stateBefore0.cfgtBalance).div(
            stateAfter0.comp.refreshedBlock.sub(stateBefore0.comp.refreshedBlock)
        );
        assert.ok(cfgtDelta1.cmp(cfgtDelta0) < 0);
    });
    it('claim interest only', async () => {
        let stateBefore = await context.getState(ctx, ctx.dEther, accounts[0]);
        // ensure accounts[0] could got interest
        assert.ok(stateBefore.bp.accountBorrows.cmpn(0) > 0);
        await ctx.comptroller.claimInterest([ctx.dEther.address, ctx.dWBTC.address, ctx.dUSDC.address,
            ctx.dUSDT.address], [accounts[0]]);
        let stateAfter = await context.getState(ctx, ctx.dEther, accounts[0]);
        // utils.assertStateChange(stateBefore0, stateAfter0, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        let cfgtDelta = stateAfter.cfgtBalance.sub(stateBefore.cfgtBalance);
        let cfscDelta = stateAfter.cfscBalance.sub(stateBefore.cfscBalance);
        assert.ok(cfgtDelta.cmpn(0) === 0);
        assert.ok(cfscDelta.cmpn(0) > 0);
    });
    it('if there are no borrows, no one could get borrow CFGT and interest, but distributed block moved', async () => {
        // prepare enough CFSC
        await ctx.USDC.approve(ctx.exchangePool.address, maxUint256);
        await ctx.exchangePool.mint(ctx.USDC.address, 10000000 * (10 ** 6));
        // repay whole borrows
        await ctx.CFSC.approve(ctx.borrowPool.address, maxUint256);
        await ctx.borrowPool.repayBorrow(ctx.CFSC.address, maxUint256);
        await ctx.borrowPool.repayBorrowBehalf(ctx.CFSC.address, accounts[1], maxUint256);
        await ctx.borrowPool.repayBorrowBehalf(ctx.CFSC.address, accounts[2], maxUint256); // public borrower
        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1], accounts[2]]);

        // ensure all accounts borrows is zero
        let accountBorrows0 = await ctx.borrowPool.getBorrows(accounts[0]);
        let accountBorrows1 = await ctx.borrowPool.getBorrows(accounts[1]);
        let accountBorrows2 = await ctx.borrowPool.getBorrows(accounts[2]);
        assert.ok(accountBorrows0.add(accountBorrows1).add(accountBorrows2).toString(), '0');

        let cfgtBalanceBefore0 = await ctx.CFGT.balanceOf(accounts[0]);
        let cfgtBalanceBefore1 = await ctx.CFGT.balanceOf(accounts[1]);
        let cfgtBalanceBefore2 = await ctx.CFGT.balanceOf(accounts[2]);
        let borrowDistributedBlockBefore = await ctx.comptroller.borrowDistributedBlock();
        await ctx.comptroller.claimBorrowerCFGT([accounts[0]]);
        let cfgtBalanceAfter0 = await ctx.CFGT.balanceOf(accounts[0]);
        let cfgtBalanceAfter1 = await ctx.CFGT.balanceOf(accounts[1]);
        let cfgtBalanceAfter2 = await ctx.CFGT.balanceOf(accounts[2]);
        let borrowDistributedBlockAfter = await ctx.comptroller.borrowDistributedBlock();
        assert.equal(cfgtBalanceBefore0.toString(), cfgtBalanceAfter0.toString());
        assert.equal(cfgtBalanceBefore1.toString(), cfgtBalanceAfter1.toString());
        assert.equal(cfgtBalanceBefore2.toString(), cfgtBalanceAfter2.toString());
        assert.ok(borrowDistributedBlockAfter.cmp(borrowDistributedBlockBefore) > 0);
    });
});

async function assertLiquidity(ctx, state, user) {
    let localAccLiquidity = localComp.calculateAccountLiquidity(
        await context.userBorrowLimit(ctx, user), state.bp.accountBorrows);
    assert.equal(state.accountLiquidity[0].toString(), localAccLiquidity[0].toString());
    assert.equal(state.accountLiquidity[1].toString(), localAccLiquidity[1].toString());
    // system liquidity is insufficient
    let localSysLiquidity = localComp.calculateSystemLiquidity(state.comp.totalDeposit,
        state.bp.totalBorrows, param.maxSystemUtilizationRate);
    assert.equal(state.sysLiquidity[0].toString(), localSysLiquidity[0].toString());
    assert.equal(state.sysLiquidity[1].toString(), localSysLiquidity[1].toString());
}
