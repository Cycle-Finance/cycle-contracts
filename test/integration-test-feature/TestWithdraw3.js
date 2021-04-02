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

const context = require('../methods/context');
const withdraw = require('../methods/withdraw');
const deposit = require('../methods/deposit');

contract('withdraw test case 1', async (accounts) => {
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
        let usdAmount = 1000000 * (10 ** 6);
        await wbtc.transfer(accounts[1], wbtcAmount);
        await wbtc.transfer(accounts[2], wbtcAmount);
        await wbtc.transfer(accounts[3], wbtcAmount);
        await wbtc.transfer(accounts[4], wbtcAmount);
        await usdc.transfer(accounts[1], usdAmount);
        await usdc.transfer(accounts[2], usdAmount);
        await usdc.transfer(accounts[3], usdAmount);
        await usdc.transfer(accounts[4], usdAmount);
        await usdt.transfer(accounts[1], usdAmount);
        await usdt.transfer(accounts[2], usdAmount);
        await usdt.transfer(accounts[3], usdAmount);
        await usdt.transfer(accounts[4], usdAmount);
        // provide 10 ETH as system liquidity
        let amount = web3.utils.toWei('10');
        await deposit.simpleDeposit(ctx, ctx.dEther, accounts[0], amount);
    });
    let reason = "calculate system liquidity failed";
    it('withdraw-3-1', async () => {
        let amount = web3.utils.toWei('100');
        await withdraw.failWithdraw(ctx, ctx.dEther, accounts[0], amount, reason);
    });
    it('withdraw-3-2', async () => {
        let amount = 100 * (10 ** 8);
        await withdraw.failWithdraw(ctx, ctx.dWBTC, accounts[0], amount, reason);
    });
    it('withdraw-3-3', async () => {
        let amount = 1000000 * (10 ** 6);
        await withdraw.failWithdraw(ctx, ctx.dUSDC, accounts[0], amount, reason);
    });
    it('withdraw-3-4', async () => {
        let amount = 1000000 * (10 ** 6);
        await withdraw.failWithdraw(ctx, ctx.dUSDT, accounts[0], amount, reason);
    });
});