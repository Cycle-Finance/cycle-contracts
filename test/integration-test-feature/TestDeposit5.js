const BN = require('bn.js');
const web3 = require('web3');
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

const deposit = require('./methods/deposit');
const utils = require('./methods/utils');

let ctx;

contract('deposit test case 5', async (accounts) => {
    before(async () => {
        let wbtc = await WBTC.deployed();
        let usdc = await USDC.deployed();
        let usdt = await USDT.deployed();
        let comptroller = await Comptroller.at(ComptrollerProxy.address)
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
        wbtc.transfer(accounts[1], wbtcAmount);
        wbtc.transfer(accounts[2], wbtcAmount);
        wbtc.transfer(accounts[3], wbtcAmount);
        wbtc.transfer(accounts[4], wbtcAmount);
        usdc.transfer(accounts[1], usdAmount);
        usdc.transfer(accounts[2], usdAmount);
        usdc.transfer(accounts[3], usdAmount);
        usdc.transfer(accounts[4], usdAmount);
        usdt.transfer(accounts[1], usdAmount);
        usdt.transfer(accounts[2], usdAmount);
        usdt.transfer(accounts[3], usdAmount);
        usdt.transfer(accounts[4], usdAmount);
    });
    it('deposit-5-1: accounts[1] deposit 10 ETH, compare profit with accounts[0]', async () => {
        let amount = web3.utils.toWei('10');
        await deposit.simpleDeposit(ctx, ctx.dEther, accounts[0], amount);
        await deposit.simpleDeposit(ctx, ctx.dEther, accounts[1], amount);
        let comparedResults = await utils.compareMarketProfit(ctx, ctx.dEther, accounts[0], accounts[1], 1);
        // interest gap should be 0
        assert.ok(comparedResults[0].toNumber() === 0);
        // supplier CFGT gap should be 0
        assert.ok(comparedResults[1].toNumber() === 0);
    });
    it('deposit-5-2: compare profit at all markets', async () => {
        // compare dEther profit has done at last case
        // compare dWBTC profit
        let wbtcAmount = 5 * (10 ** 8);
        await deposit.simpleDeposit(ctx, ctx.dWBTC, accounts[0], wbtcAmount * 2);
        await deposit.simpleDeposit(ctx, ctx.dWBTC, accounts[1], wbtcAmount);
        let comparedResults = await utils.compareMarketProfit(ctx, ctx.dWBTC, accounts[0], accounts[1], 1);
        // interest gap should == 0
        assert.ok(comparedResults[0].toNumber() === 0);
        // supplier CFGT gap should > 0
        assert.ok(comparedResults[1] > 0);
        // compare dUSDC, accounts[0] has already deposit 1000 USDC
        let usdcAmount = 1000 * (10 ** 6);
        await deposit.simpleDeposit(ctx, ctx.dUSDC, accounts[0], usdcAmount);
        await deposit.simpleDeposit(ctx, ctx.dUSDC, accounts[1], usdcAmount);
        comparedResults = await utils.compareMarketProfit(ctx, ctx.dUSDC, accounts[0], accounts[1], 1);
        // interest gap should == 0
        assert.ok(comparedResults[0].toNumber() === 0);
        // supplier CFGT gap should == 0
        assert.ok(comparedResults[1].toNumber() === 0);
        // compare dUSDT, accounts[0] has already deposit 1000 USDC
        let usdtAmount = 1000 * (10 ** 6);
        await deposit.simpleDeposit(ctx, ctx.dUSDT, accounts[0], usdtAmount / 2);
        await deposit.simpleDeposit(ctx, ctx.dUSDT, accounts[1], usdtAmount);
        comparedResults = await utils.compareMarketProfit(ctx, ctx.dUSDT, accounts[0], accounts[1], 1);
        // interest gap should == 0
        assert.ok(comparedResults[0].toNumber() === 0);
        // supplier CFGT gap should < 0
        assert.ok(comparedResults[1] < 0);
    });
});
