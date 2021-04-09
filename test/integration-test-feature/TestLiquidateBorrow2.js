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
const liquidateBorrow = require('./methods/liquidate');

const maxUint256 = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
contract('liquidate-2: insufficient shortfall', async (accounts) => {
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
    });
    let reason = "insufficient shortfall";
    it('liquidate-2-1: liquidate 0 or -1', async () => {
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[1], accounts[0], ctx.USDC, 0, reason);
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[1], accounts[0], ctx.USDT, 0, reason);
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[1], accounts[0], ctx.CFSC, 0, reason);
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[1], accounts[0], ctx.USDC, maxUint256, reason);
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[1], accounts[0], ctx.USDT, maxUint256, reason);
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[1], accounts[0], ctx.CFSC, maxUint256, reason);
    });
    it('liquidate-2-2: liquidate some value', async () => {
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[1], accounts[0], ctx.USDC, 800, reason);
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[1], accounts[0], ctx.USDT, 800, reason);
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[1], accounts[0], ctx.CFSC, 800, reason);
    });
    it('liquidate-1-3: liquidate some value that exceed borrower debt', async () => {
        let repayAmount = web3.utils.toWei('14265');
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[1], accounts[0], ctx.USDC, repayAmount, reason);
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[1], accounts[0], ctx.USDT, repayAmount, reason);
        await liquidateBorrow.failLiquidateBorrow(ctx, ctx.dEther, accounts[1], accounts[0], ctx.CFSC, repayAmount, reason);
    });
});
