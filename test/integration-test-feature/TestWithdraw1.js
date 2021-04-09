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

const context = require('./methods/context');
const withdraw = require('./methods/withdraw');
const deposit = require('./methods/deposit');

contract('withdraw test case 1', async (accounts) => {
    let ctx;
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
    });
    it('withdraw-1-1', async () => {
        let amount = web3.utils.toWei('10');
        await deposit.simpleDeposit(ctx, ctx.dEther, accounts[0], amount);
        await withdraw.simpleWithdraw(ctx, ctx.dEther, accounts[0], amount);
    });
    it('withdraw-1-2', async () => {
        let amount = 10 * (10 ** 8);
        await deposit.simpleDeposit(ctx, ctx.dWBTC, accounts[0], amount);
        await withdraw.simpleWithdraw(ctx, ctx.dWBTC, accounts[0], amount);
    });
    it('withdraw-1-3', async () => {
        let amount = 10 * (10 ** 6);
        await deposit.simpleDeposit(ctx, ctx.dUSDC, accounts[0], amount);
        await withdraw.simpleWithdraw(ctx, ctx.dUSDC, accounts[0], amount);
    });
    it('withdraw-1-4', async () => {
        let amount = 10 * (10 ** 6);
        await deposit.simpleDeposit(ctx, ctx.dUSDT, accounts[0], amount);
        await withdraw.simpleWithdraw(ctx, ctx.dUSDT, accounts[0], amount);
    });
});