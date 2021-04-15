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

/***
 * we compare the difference of CFGT distribution at different market and different user
 * */

let ctx = {};
let param = {};
contract('test comptroller with withdraw', async (accounts) => {
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
        param.collateralFactor = [
            await comptroller.collateralFactor(dEther.address),
            await comptroller.collateralFactor(dWBTC.address),
            await comptroller.collateralFactor(dUSDC.address),
            await comptroller.collateralFactor(dUSDT.address)
        ];
        param.liquidationIncentive = await comptroller.liquidationIncentive();
        param.reserveFactor = await borrowPool.reserveFactor();
        param.multiplierPerYear = web3.utils.toBN(math.expScale * 0.3);
        param.baseRatePerYear = web3.utils.toBN(math.expScale * 0.025);
        param.ethPrice = await oracle.getPrice(await dEther.underlyingAsset());
        param.wbtcPrice = await oracle.getPrice(WBTC.address);
        param.usdcPrice = await oracle.getPrice(USDC.address);
        param.usdtPrice = await oracle.getPrice(USDT.address);
        // prepare enough deposit
        let ethDepositAmount = web3.utils.toWei('10');
        await dEther.mint(ethDepositAmount, {value: ethDepositAmount});
        await dEther.mint(ethDepositAmount, {from: accounts[1], value: ethDepositAmount});
        await wbtc.approve(dWBTC.address, wbtcAmount);
        await wbtc.approve(dWBTC.address, wbtcAmount, {from: accounts[1]});
        await dWBTC.mint(wbtcAmount);
        await dWBTC.mint(wbtcAmount, {from: accounts[1]});
        await usdc.approve(dUSDC.address, usdAmount);
        await usdc.approve(dUSDC.address, usdAmount, {from: accounts[1]});
        await dUSDC.mint(usdAmount);
        await dUSDC.mint(usdAmount, {from: accounts[1]});
        await usdt.approve(dUSDT.address, usdAmount);
        await usdt.approve(dUSDT.address, usdAmount, {from: accounts[1]});
        await dUSDT.mint(usdAmount);
        await dUSDT.mint(usdAmount, {from: accounts[1]});
        // clear state
        await comptroller.claimAllProfit([accounts[0], accounts[1]]);
    });
    it('accounts[0] withdraw same value got different CFGT distribution', async () => {
        let stateBefore = await context.getState(ctx, ctx.dEther, accounts[0]);
        let withdrawAmount = web3.utils.toBN(web3.utils.toWei('1'));
        await ctx.dEther.redeem(withdrawAmount);
        let stateAfter = await context.getState(ctx, ctx.dEther, accounts[0]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        // record CFGT distribution
        let singleDelta1 = stateAfter.cfgtBalance.sub(stateBefore.cfgtBalance)
            .div(stateAfter.comp.refreshedBlock.sub(stateBefore.comp.refreshedBlock));
        // check total deposit
        let totalDeposit = await context.totalMarketDepositValue(ctx);
        assert.equal(totalDeposit.toString(), stateAfter.comp.totalDeposit.toString());
        // account supply distribution at single market is
        // (supplySpeed * marketDeposit/totalDeposit * userMarketDeposit/marketDeposit) =
        // supplySpeed * userMarketDeposit / totalDeposit
        // if we compare compare thd difference between two withdrawal, we compare userMarketDeposit / totalDeposit only,
        // because supplySpeed is constant
        let weight1 = math.div_(stateBefore.dToken.userDepositValue, stateBefore.comp.totalDeposit);
        stateBefore = stateAfter;
        await ctx.dEther.redeem(withdrawAmount);
        stateAfter = await context.getState(ctx, ctx.dEther, accounts[0]);
        utils.assertStateChange(stateBefore, stateAfter, utils.KIND_SUPPLIER, web3.utils.toBN(0), param);
        // record CFGT distribution
        let singleDelta2 = stateAfter.cfgtBalance.sub(stateBefore.cfgtBalance)
            .div(stateAfter.comp.refreshedBlock.sub(stateBefore.comp.refreshedBlock));
        // because eth market deposit value decreased
        assert.ok(singleDelta1.cmp(singleDelta2) > 0);
        assert.ok(singleDelta2.cmpn(0) > 0);
        totalDeposit = await context.totalMarketDepositValue(ctx);
        assert.equal(totalDeposit.toString(), stateAfter.comp.totalDeposit.toString());
        // accounts[0] deposit 9ETH and [1] deposit 10ETH
        let weight2 = math.div_(stateBefore.dToken.userDepositValue, stateBefore.comp.totalDeposit);
        // mismatch should be less than math.expScaleMismatchThreshold/math.expScale CFGT
        assert.ok(math.mulScalarAndTruncate(weight1, singleDelta2)
            .sub(math.mulScalarAndTruncate(weight2, singleDelta1))
            .cmpn(math.expScaleMismatchThreshold) <= 0);
    });
});