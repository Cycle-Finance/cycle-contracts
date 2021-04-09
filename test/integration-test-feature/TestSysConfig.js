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

const sysConfig = require('./methods/system-config');

/// @notice: these case only test system config function. The affection of system config has been tested at other case.

contract('modify system config test case', async (accounts) => {
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
    it('config-1: set public borrower', async () => {
        await sysConfig.SetPublicBorrower(ctx, accounts[0]);
    });
    it('config-2: pause and unpause market deposit', async () => {
        await sysConfig.SetMintPaused(ctx, ctx.dEther, true);
        await sysConfig.SetMintPaused(ctx, ctx.dEther, false);
        await sysConfig.SetMintPaused(ctx, ctx.dWBTC, true);
        await sysConfig.SetMintPaused(ctx, ctx.dWBTC, false);
        await sysConfig.SetMintPaused(ctx, ctx.dUSDC, true);
        await sysConfig.SetMintPaused(ctx, ctx.dUSDC, false);
        await sysConfig.SetMintPaused(ctx, ctx.dUSDT, true);
        await sysConfig.SetMintPaused(ctx, ctx.dUSDT, false);
    });
    it('config-3: pause and unpause borrow', async () => {
        await sysConfig.SetBorrowPaused(ctx, true);
        await sysConfig.SetBorrowPaused(ctx, false);
    });
    it('config-4: pause and unpause transfer', async () => {
        await sysConfig.SetTransferPaused(ctx, true);
        await sysConfig.SetTransferPaused(ctx, false);
    });
    it('config-5: pause and unpause seize', async () => {
        await sysConfig.SetSeizePaused(ctx, true);
        await sysConfig.SetSeizePaused(ctx, false);
    });
    it('config-6: set public borrow threshold', async () => {
        await sysConfig.SetPublicBorrowThreshold(ctx, web3.utils.toWei('0.5'));
    });
    it('config-7: set max system utilization rate', async () => {
        await sysConfig.SetMaxSystemUtilizationRate(ctx, web3.utils.toWei('0.95'));
    });
    it('config-8: change max close factor of liquidation', async () => {
        await sysConfig.SetMaxCloseFactor(ctx, web3.utils.toWei('0.88'));
    });
    it('config-9: change liquidation incentive', async () => {
        await sysConfig.SetLiquidationIncentive(ctx, web3.utils.toWei('1.05'));
    });
});
