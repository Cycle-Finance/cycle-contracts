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
const borrow = require('./methods/borrow');
const sysConfig = require('./methods/system-config');
const liquidateBorrow = require('./methods/liquidate');

contract('liquidate-4: liquidator is same as borrower', async (accounts) => {
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
        // transfer asset to other accounts
        let wbtcAmount = 1000 * (10 ** 8);
        let usdAmount = 1000000 * (10 ** 6);
        await wbtc.transfer(accounts[1], wbtcAmount);
        await usdc.transfer(accounts[1], usdAmount);
        await usdt.transfer(accounts[1], usdAmount);

        await deposit.simpleDeposit(ctx, dEther, accounts[0], web3.utils.toWei('10'));
        await borrow.simpleBorrow(ctx, dEther, accounts[0], web3.utils.toWei('14000'));
        await sysConfig.SetPrice(ctx, '0x0000000000000000000000000000000000000000', 18, web3.utils.toWei('1500'));
    });
    it('liquidate-4-1: liquidate 10000', async () => {
        let repayAmount = web3.utils.toWei('10000');
        let reason = "liquidator is same as borrower";
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[0], accounts[0], ctx.USDC, repayAmount, reason);
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[0], accounts[0], ctx.USDT, repayAmount, reason);
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[0], accounts[0], ctx.CFSC, repayAmount, reason);
    });
});
