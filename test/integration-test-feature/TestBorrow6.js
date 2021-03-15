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

const deposit = require('../methods/deposit');
const borrow = require('../methods/borrow');

contract('borrow test case 6', async (accounts) => {
    let ctx;
    before(async () => {
        let wbtc = await WBTC.deployed();
        let usdc = await USDC.deployed();
        let usdt = await USDT.deployed();
        let comptroller = await Comptroller.at(ComptrollerProxy.address)
        let dEther = await DEther.at(await comptroller.markets(0));
        let dWBTC = await DEther.at(await comptroller.markets(1));
        let dUSDC = await DEther.at(await comptroller.markets(2));
        let dUSDT = await DEther.at(await comptroller.markets(3));
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
        await wbtc.transfer(accounts[1], wbtcAmount);
    });
    it('borrow-6: When users borrow 0 cfscs, they may not succeed, because interest is accumulated over time', async () => {
        let depositAmount = 10 ** 8;
        await deposit.simpleDeposit(ctx, ctx.dWBTC, accounts[0], depositAmount);
        await borrow.simpleBorrow(ctx, ctx.dWBTC, accounts[0], web3.utils.toWei('38425.4999999'));
        for (let i = 0; i < 10; i++) {
            await ctx.comptroller.refreshMarketDeposit();
        }
        let accountLiquidity = await ctx.comptroller.getAccountLiquidity(accounts[0]);
        console.log(accountLiquidity[0].toString(), accountLiquidity[1].toString(), accountLiquidity[2].toString());
        assert.equal(accountLiquidity[0].toString(), "0");
        assert.equal(accountLiquidity[1].toString(), "0");
        assert.ok(accountLiquidity[2].cmpn(0) > 0);
        await borrow.failBorrow(ctx, accounts[0], 0, "insufficient liquidity");
    });
});
