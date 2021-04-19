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

/*
* we compare the difference of CFGT distribution at different market and different user
* */

const maxUint256 = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
let ctx = {};
let param = {};
contract('test comptroller with deposit', async (accounts) => {
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
        };
        // transfer asset to other accounts
        let wbtcAmount = 1000 * (10 ** 8);
        let usdAmount = 1000000 * (10 ** 6);
        await wbtc.transfer(accounts[1], wbtcAmount);
        await usdc.transfer(accounts[1], usdAmount);
        await usdt.transfer(accounts[1], usdAmount);
        // transfer preserved CFGT to other accounts
        await CFGT.transfer(accounts[9], await CFGT.balanceOf(accounts[0]));
        // fetch system params
        param.supplySpeed = await comptroller.supplySpeed();
        param.borrowSpeed = await comptroller.borrowSpeed();
        param.multiplierPerYear = web3.utils.toBN(math.expScale * 0.3);
        param.baseRatePerYear = web3.utils.toBN(math.expScale * 0.025);
        param.ethPrice = await oracle.getPrice(await dEther.underlyingAsset());
        param.wbtcPrice = await oracle.getPrice(WBTC.address);
        param.usdcPrice = await oracle.getPrice(USDC.address);
        param.usdtPrice = await oracle.getPrice(USDT.address);
    });
    it('accounts[0] deposit 1 ETH', async () => {
        let stateBefore = await context.getState(ctx, ctx.dEther, accounts[0]);
        let depositAmount = web3.utils.toBN(web3.utils.toWei('1'));
        await ctx.dEther.mint(depositAmount, {value: depositAmount});
        let stateAfter = await context.getState(ctx, ctx.dEther, accounts[0]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        // check total deposit
        let totalDeposit = await context.totalMarketDepositValue(ctx);
        assert.equal(totalDeposit.toString(), stateAfter.comp.totalDeposit.toString());
    });
    it('accounts[0] deposit 1 ETH again', async () => {
        let stateBefore = await context.getState(ctx, ctx.dEther, accounts[0]);
        let depositAmount = web3.utils.toBN(web3.utils.toWei('1'));
        await ctx.dEther.mint(depositAmount, {value: depositAmount});
        let stateAfter = await context.getState(ctx, ctx.dEther, accounts[0]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        // check some specific value
        let localCFGTDelta = stateAfter.comp.refreshedBlock.sub(stateBefore.comp.refreshedBlock).mul(param.supplySpeed);
        assert.equal(localCFGTDelta.toString(), stateAfter.cfgtBalance.toString());
        // check total deposit
        let totalDeposit = await context.totalMarketDepositValue(ctx);
        assert.equal(totalDeposit.toString(), stateAfter.comp.totalDeposit.toString());
    });
    it('accounts[1] deposit 2 ETH, compare some difference between accounts', async () => {
        let stateAccount0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        let stateAccount1 = await context.getState(ctx, ctx.dEther, accounts[1]);
        let depositAmount = web3.utils.toBN(web3.utils.toWei('2'));
        await ctx.dEther.mint(depositAmount, {value: depositAmount, from: accounts[1]});
        let stateAfter1 = await context.getState(ctx, ctx.dEther, accounts[1]);
        utils.assertStateChange(stateAccount1, stateAfter1, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        // check total deposit
        let totalDeposit = await context.totalMarketDepositValue(ctx);
        assert.equal(totalDeposit.toString(), stateAfter1.comp.totalDeposit.toString());
        stateAccount1 = stateAfter1;
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1]]);
        let stateAfter0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        stateAfter1 = await context.getState(ctx, ctx.dEther, accounts[1]);
        utils.assertStateChange(stateAccount1, stateAfter1, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        utils.assertBalanceChange(stateAccount0, stateAfter0, utils.KIND_SUPPLIER, web3.utils.toBN(0))
        let cfgtGap0 = stateAfter0.cfgtBalance.sub(stateAccount0.cfgtBalance);
        let cfgtGap1 = stateAfter1.cfgtBalance.sub(stateAccount1.cfgtBalance);
        assert.ok(cfgtGap0.cmpn(0) > 0);
        assert.ok(cfgtGap1.cmpn(0) > 0);
        assert.equal(cfgtGap1.muln(2).toString(),
            param.supplySpeed.mul(stateAfter1.comp.refreshedBlock.sub(stateAccount1.comp.refreshedBlock)).toString())
        assert.equal(cfgtGap0.sub(cfgtGap1).toString(),
            param.supplySpeed.mul(stateAfter0.comp.refreshedBlock.sub(stateAccount1.comp.refreshedBlock)).toString());
    });
    it('accounts[0] deposit 1 BTC', async () => {
        let stateBefore = await context.getState(ctx, ctx.dWBTC, accounts[0]);
        let depositAmount = web3.utils.toBN(10 ** 8);
        await ctx.WBTC.approve(ctx.dWBTC.address, depositAmount);
        await ctx.dWBTC.mint(depositAmount);
        let stateAfter = await context.getState(ctx, ctx.dWBTC, accounts[0]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        // check total deposit
        let totalDeposit = await context.totalMarketDepositValue(ctx);
        assert.equal(totalDeposit.toString(), stateAfter.comp.totalDeposit.toString());
    });
    it('accounts[0] deposit 1000 USDC', async () => {
        let stateBefore = await context.getState(ctx, ctx.dUSDC, accounts[0]);
        let depositAmount = web3.utils.toBN(10 ** 8);
        await ctx.USDC.approve(ctx.dUSDC.address, depositAmount);
        await ctx.dUSDC.mint(depositAmount);
        let stateAfter = await context.getState(ctx, ctx.dUSDC, accounts[0]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        // check total deposit
        let totalDeposit = await context.totalMarketDepositValue(ctx);
        assert.equal(totalDeposit.toString(), stateAfter.comp.totalDeposit.toString());
    });
    it('accounts[0] deposit 1000 USDT', async () => {
        let stateBefore = await context.getState(ctx, ctx.dUSDT, accounts[0]);
        let depositAmount = web3.utils.toBN(10 ** 8);
        await ctx.USDT.approve(ctx.dUSDT.address, depositAmount);
        await ctx.dUSDT.mint(depositAmount);
        let stateAfter = await context.getState(ctx, ctx.dUSDT, accounts[0]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        // check total deposit
        let totalDeposit = await context.totalMarketDepositValue(ctx);
        assert.equal(totalDeposit.toString(), stateAfter.comp.totalDeposit.toString());
    });
    it('accounts[0] profit at different deposit value should be different', async () => {
        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0]]);

        let ethStateBefore = await context.getState(ctx, ctx.dEther, accounts[0]);
        await ctx.comptroller.claimSupplierCFGT([ctx.dEther.address], [accounts[0]]);
        let ethStateAfter = await context.getState(ctx, ctx.dEther, accounts[0]);
        utils.assertStateChange(ethStateBefore, ethStateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);

        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0]]);
        let wbtcStateBefore = await context.getState(ctx, ctx.dWBTC, accounts[0]);
        await ctx.comptroller.claimSupplierCFGT([ctx.dWBTC.address], [accounts[0]]);
        let wbtcStateAfter = await context.getState(ctx, ctx.dWBTC, accounts[0]);
        utils.assertStateChange(wbtcStateBefore, wbtcStateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);

        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0]]);
        let usdcStateBefore = await context.getState(ctx, ctx.dUSDC, accounts[0]);
        await ctx.comptroller.claimSupplierCFGT([ctx.dUSDC.address], [accounts[0]]);
        let usdcStateAfter = await context.getState(ctx, ctx.dUSDC, accounts[0]);
        utils.assertStateChange(usdcStateBefore, usdcStateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);

        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0]]);
        let usdtStateBefore = await context.getState(ctx, ctx.dUSDT, accounts[0]);
        await ctx.comptroller.claimSupplierCFGT([ctx.dUSDT.address], [accounts[0]]);
        let usdtStateAfter = await context.getState(ctx, ctx.dUSDT, accounts[0]);
        utils.assertStateChange(usdtStateBefore, usdtStateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);

        // check other status
        let ethCFGTGap = ethStateAfter.cfgtBalance.sub(ethStateBefore.cfgtBalance)
            .div(ethStateAfter.comp.refreshedBlock.sub(ethStateBefore.comp.refreshedBlock));
        let wbtcCFGTGap = wbtcStateAfter.cfgtBalance.sub(wbtcStateBefore.cfgtBalance)
            .div(wbtcStateAfter.comp.refreshedBlock.sub(wbtcStateBefore.comp.refreshedBlock));
        let usdcCFGTGap = usdcStateAfter.cfgtBalance.sub(usdcStateBefore.cfgtBalance)
            .div(usdcStateAfter.comp.refreshedBlock.sub(usdcStateBefore.comp.refreshedBlock));
        let usdtCFGTGap = usdtStateAfter.cfgtBalance.sub(usdtStateBefore.cfgtBalance)
            .div(usdtStateAfter.comp.refreshedBlock.sub(usdtStateBefore.comp.refreshedBlock));
        // deposit value: wbtc > eth > usdt > usdc
        console.log('%s, %s, %s, %s', ethCFGTGap, wbtcCFGTGap, usdcCFGTGap, usdtCFGTGap);
        assert.ok(wbtcCFGTGap.cmp(ethCFGTGap) > 0);
        assert.ok(ethCFGTGap.cmp(usdtCFGTGap) > 0);
        assert.ok(usdtCFGTGap.cmp(usdcCFGTGap) > 0);
        // check exact ratio
        // truncate double scale: CFGT decimals and price calculate expScale
        // 1BTC : 2ETH
        assert.ok(ethCFGTGap.mul(param.wbtcPrice).mul(web3.utils.toBN(10 ** 8)).div(math.doubleScale)
            .sub(wbtcCFGTGap.mul(param.ethPrice).muln(2).mul(math.expScale).div(math.doubleScale)).abs()
            .cmpn(math.expScaleMismatchThreshold) <= 0);
        assert.ok(usdtCFGTGap.mul(param.usdcPrice).mul(web3.utils.toBN(10 ** 6)).div(math.doubleScale)
            .sub(usdcCFGTGap.mul(param.usdtPrice).mul(web3.utils.toBN(10 ** 6)).div(math.doubleScale)).abs()
            .cmpn(math.expScaleMismatchThreshold) <= 0);
    });
    it('accounts[0] profit at same deposit value should be same', async () => {
        // change USDT price and clear state
        await ctx.oracle.setPrice(ctx.USDT.address, web3.utils.toWei('1'));
        await ctx.comptroller.claimAllProfit([accounts[0]]);

        let usdcStateBefore = await context.getState(ctx, ctx.dUSDC, accounts[0]);
        await ctx.comptroller.claimSupplierCFGT([ctx.dUSDC.address], [accounts[0]]);
        let usdcStateAfter = await context.getState(ctx, ctx.dUSDC, accounts[0]);
        utils.assertStateChange(usdcStateBefore, usdcStateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);

        // clear state
        await ctx.comptroller.claimAllProfit([accounts[0]]);
        let usdtStateBefore = await context.getState(ctx, ctx.dUSDT, accounts[0]);
        await ctx.comptroller.claimSupplierCFGT([ctx.dUSDT.address], [accounts[0]]);
        let usdtStateAfter = await context.getState(ctx, ctx.dUSDT, accounts[0]);
        utils.assertStateChange(usdtStateBefore, usdtStateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);

        // check other status
        let usdcCFGTGap = usdcStateAfter.cfgtBalance.sub(usdcStateBefore.cfgtBalance)
            .div(usdcStateAfter.comp.refreshedBlock.sub(usdcStateBefore.comp.refreshedBlock));
        let usdtCFGTGap = usdtStateAfter.cfgtBalance.sub(usdtStateBefore.cfgtBalance)
            .div(usdtStateAfter.comp.refreshedBlock.sub(usdtStateBefore.comp.refreshedBlock));
        assert.ok(usdtCFGTGap.cmp(usdcCFGTGap) === 0);

        // restore price
        await ctx.oracle.setPrice(ctx.USDT.address, web3.utils.toWei('1.012'));
    });
    it('accounts[1] deposit 1 BTC', async () => {
        let stateBefore = await context.getState(ctx, ctx.dWBTC, accounts[1]);
        let depositAmount = web3.utils.toBN(10 ** 8);
        await ctx.WBTC.approve(ctx.dWBTC.address, depositAmount, {from: accounts[1]});
        await ctx.dWBTC.mint(depositAmount, {from: accounts[1]});
        let stateAfter = await context.getState(ctx, ctx.dWBTC, accounts[1]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        // check total deposit
        let totalDeposit = await context.totalMarketDepositValue(ctx);
        assert.equal(totalDeposit.toString(), stateAfter.comp.totalDeposit.toString());
    });
    it('accounts[1] deposit 1000 USDC', async () => {
        let stateBefore = await context.getState(ctx, ctx.dUSDC, accounts[1]);
        let depositAmount = web3.utils.toBN(10 ** 8);
        await ctx.USDC.approve(ctx.dUSDC.address, depositAmount, {from: accounts[1]});
        await ctx.dUSDC.mint(depositAmount, {from: accounts[1]});
        let stateAfter = await context.getState(ctx, ctx.dUSDC, accounts[1]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        // check total deposit
        let totalDeposit = await context.totalMarketDepositValue(ctx);
        assert.equal(totalDeposit.toString(), stateAfter.comp.totalDeposit.toString());
    });
    it('accounts[1] deposit 1000 USDT', async () => {
        let stateBefore = await context.getState(ctx, ctx.dUSDT, accounts[1]);
        let depositAmount = web3.utils.toBN(10 ** 8);
        await ctx.USDT.approve(ctx.dUSDT.address, depositAmount, {from: accounts[1]});
        await ctx.dUSDT.mint(depositAmount, {from: accounts[1]});
        let stateAfter = await context.getState(ctx, ctx.dUSDT, accounts[1]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        // check total deposit
        let totalDeposit = await context.totalMarketDepositValue(ctx);
        assert.equal(totalDeposit.toString(), stateAfter.comp.totalDeposit.toString());
    });
    it('profit at same deposit value of account should be same', async () => {
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1]]);

        let cfgtBalance0Before = await ctx.CFGT.balanceOf(accounts[0]);
        let cfgtBalance1Before = await ctx.CFGT.balanceOf(accounts[1]);
        let blockBefore = await ctx.comptroller.refreshedBlock();
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1]]);
        let cfgtBalance0After = await ctx.CFGT.balanceOf(accounts[0]);
        let cfgtBalance1After = await ctx.CFGT.balanceOf(accounts[1]);
        let blockAfter = await ctx.comptroller.refreshedBlock();
        let gap0 = cfgtBalance0After.sub(cfgtBalance0Before);
        let gap1 = cfgtBalance1After.sub(cfgtBalance1Before);
        assert.equal(gap0.toString(), gap1.toString());
        assert.ok(gap0.sub(blockAfter.sub(blockBefore).mul(param.supplySpeed).divn(2)).abs()
            .cmpn(math.expScaleMismatchThreshold) <= 0);
    });
    it('profit at different deposit value of account should be different', async () => {
        let depositAmount = web3.utils.toBN(10 ** 8);
        await ctx.WBTC.approve(ctx.dWBTC.address, depositAmount);
        await ctx.dWBTC.mint(depositAmount);
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1]]);

        let cfgtBalance0Before = await ctx.CFGT.balanceOf(accounts[0]);
        let cfgtBalance1Before = await ctx.CFGT.balanceOf(accounts[1]);
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1]]);
        let cfgtBalance0After = await ctx.CFGT.balanceOf(accounts[0]);
        let cfgtBalance1After = await ctx.CFGT.balanceOf(accounts[1]);
        let gap0 = cfgtBalance0After.sub(cfgtBalance0Before);
        let gap1 = cfgtBalance1After.sub(cfgtBalance1Before);
        assert.ok(gap0.cmp(gap1) > 0);
        // exact check
        let value0 = await context.userTotalDepositValue(ctx, accounts[0]);
        let value1 = await context.userTotalDepositValue(ctx, accounts[1]);
        assert.ok(math.mulScalarAndTruncate(value1, gap0).sub(math.mulScalarAndTruncate(value0, gap1)).abs()
            .cmpn(math.expScaleMismatchThreshold) <= 0);
    });
    it('register new market', async () => {
        let emptyData = new Buffer('');
        let derc20 = await DERC20.deployed();
        let dUSDTProxyNew = await dTokenProxy.new("Cycle Finance USDT Deposit Token", "dUSDT", ctx.USDT.address,
            derc20.address, emptyData);
        let dUSDTNew = await DERC20.at(dUSDTProxyNew.address);
        await dUSDTNew.initialize(ctx.oracle.address, ctx.comptroller.address);
        await ctx.comptroller.registerMarket(dUSDTNew.address, web3.utils.toWei('0.75'));
        let depositAmount = web3.utils.toBN(10 ** 8);
        await ctx.USDT.approve(dUSDTNew.address, depositAmount);
        await dUSDTNew.mint(depositAmount);
        await ctx.comptroller.claimAllProfit([accounts[0]]);

        let usdtNewStateBefore = await context.getState(ctx, dUSDTNew, accounts[0]);
        await ctx.comptroller.claimSupplierCFGT([dUSDTNew.address], [accounts[0]]);
        let usdtNewStateAfter = await context.getState(ctx, dUSDTNew, accounts[0]);
        utils.assertStateChange(usdtNewStateBefore, usdtNewStateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);

        await ctx.comptroller.claimAllProfit([accounts[0]]);
        let usdtStateBefore = await context.getState(ctx, ctx.dUSDT, accounts[0]);
        await ctx.comptroller.claimSupplierCFGT([ctx.dUSDT.address], [accounts[0]]);
        let usdtStateAfter = await context.getState(ctx, ctx.dUSDT, accounts[0]);
        utils.assertStateChange(usdtStateBefore, usdtStateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        let usdtNewCFGTGap = usdtNewStateAfter.cfgtBalance.sub(usdtNewStateBefore.cfgtBalance)
            .div(usdtNewStateAfter.comp.refreshedBlock.sub(usdtNewStateBefore.comp.refreshedBlock));
        let usdtCFGTGap = usdtStateAfter.cfgtBalance.sub(usdtStateBefore.cfgtBalance)
            .div(usdtStateAfter.comp.refreshedBlock.sub(usdtStateBefore.comp.refreshedBlock));
        assert.equal(usdtNewCFGTGap.toString(), usdtCFGTGap.toString());
    });
});
