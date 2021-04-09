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
const systemCfg = require('./methods/system-config');

contract('deposit test case 6', async (accounts) => {
    let ctx;
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
    });
    it('deposit-6: deposit should revert when mint paused', async () => {
        let amount = web3.utils.toWei('1');
        await systemCfg.SetMintPaused(ctx, ctx.dEther, true);
        await deposit.revertDeposit(ctx, ctx.dEther, accounts[0], 0);
        await deposit.revertDeposit(ctx, ctx.dEther, accounts[0], amount);
        await systemCfg.SetMintPaused(ctx, ctx.dEther, false);
        await deposit.simpleDeposit(ctx, ctx.dEther, accounts[0], 0);
        await deposit.simpleDeposit(ctx, ctx.dEther, accounts[0], amount);

        amount = 10 ** 8;
        await systemCfg.SetMintPaused(ctx, ctx.dWBTC, true);
        await deposit.revertDeposit(ctx, ctx.dWBTC, accounts[0], 0);
        await deposit.revertDeposit(ctx, ctx.dWBTC, accounts[0], amount);
        await systemCfg.SetMintPaused(ctx, ctx.dWBTC, false);
        await deposit.simpleDeposit(ctx, ctx.dWBTC, accounts[0], 0);
        await deposit.simpleDeposit(ctx, ctx.dWBTC, accounts[0], amount);


        amount = 10 ** 6;
        await systemCfg.SetMintPaused(ctx, ctx.dUSDC, true);
        await deposit.revertDeposit(ctx, ctx.dUSDC, accounts[0], 0);
        await deposit.revertDeposit(ctx, ctx.dUSDC, accounts[0], amount);
        await systemCfg.SetMintPaused(ctx, ctx.dUSDC, false);
        await deposit.simpleDeposit(ctx, ctx.dUSDC, accounts[0], 0);
        await deposit.simpleDeposit(ctx, ctx.dUSDC, accounts[0], amount);


        await systemCfg.SetMintPaused(ctx, ctx.dUSDT, true);
        await deposit.revertDeposit(ctx, ctx.dUSDT, accounts[0], 0);
        await deposit.revertDeposit(ctx, ctx.dUSDT, accounts[0], amount);
        await systemCfg.SetMintPaused(ctx, ctx.dUSDT, false);
        await deposit.simpleDeposit(ctx, ctx.dUSDT, accounts[0], 0);
        await deposit.simpleDeposit(ctx, ctx.dUSDT, accounts[0], amount);
    });
});
