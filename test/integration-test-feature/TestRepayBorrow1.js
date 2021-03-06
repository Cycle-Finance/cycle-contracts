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

const repayBorrow = require('./methods/repay-borrow');

const maxUint256 = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
contract('repayBorrow-1: the debt of borrower is 0', async (accounts) => {
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

        await usdc.approve(borrowPool.address, maxUint256, {from: accounts[0]});
        await usdt.approve(borrowPool.address, maxUint256, {from: accounts[0]});
        await CFSC.approve(borrowPool.address, maxUint256, {from: accounts[0]});
        await usdc.approve(borrowPool.address, maxUint256, {from: accounts[1]});
        await usdt.approve(borrowPool.address, maxUint256, {from: accounts[1]});
        await CFSC.approve(borrowPool.address, maxUint256, {from: accounts[1]});
        await usdc.approve(exchangePool.address, maxUint256, {from: accounts[1]});
        await usdt.approve(exchangePool.address, maxUint256, {from: accounts[1]});
        // get some CFSC from exchange pool
        await exchangePool.mintByCFSCAmount(usdt.address, web3.utils.toWei('10000'), {from: accounts[1]});
    });
    it('repayBorrow-1-1: repay 0 or -1', async () => {
        await repayBorrow.simpleRepayBorrow(ctx, ctx.dEther, accounts[0], ctx.USDC, 0);
        await repayBorrow.simpleRepayBorrow(ctx, ctx.dEther, accounts[0], ctx.USDT, 0);
        await repayBorrow.simpleRepayBorrow(ctx, ctx.dEther, accounts[0], ctx.CFSC, 0);
        await repayBorrow.simpleRepayBorrowBehalf(ctx, ctx.dEther, accounts[1], accounts[0], ctx.USDC, 0);
        await repayBorrow.simpleRepayBorrowBehalf(ctx, ctx.dEther, accounts[1], accounts[0], ctx.USDT, 0);
        await repayBorrow.simpleRepayBorrowBehalf(ctx, ctx.dEther, accounts[1], accounts[0], ctx.CFSC, 0);

        await repayBorrow.simpleRepayBorrow(ctx, ctx.dEther, accounts[0], ctx.USDC, maxUint256);
        await repayBorrow.simpleRepayBorrow(ctx, ctx.dEther, accounts[0], ctx.USDT, maxUint256);
        await repayBorrow.simpleRepayBorrow(ctx, ctx.dEther, accounts[0], ctx.CFSC, maxUint256);
        await repayBorrow.simpleRepayBorrowBehalf(ctx, ctx.dEther, accounts[1], accounts[0], ctx.USDC, maxUint256);
        await repayBorrow.simpleRepayBorrowBehalf(ctx, ctx.dEther, accounts[1], accounts[0], ctx.USDT, maxUint256);
        await repayBorrow.simpleRepayBorrowBehalf(ctx, ctx.dEther, accounts[1], accounts[0], ctx.CFSC, maxUint256);
    });
    it('repayBorrow-1-2: repay some value', async () => {
        await repayBorrow.revertRepayBorrow(ctx, accounts[0], ctx.USDC, 100);
        await repayBorrow.revertRepayBorrow(ctx, accounts[0], ctx.USDT, 100);
        await repayBorrow.revertRepayBorrow(ctx, accounts[0], ctx.CFSC, 100);
        await repayBorrow.revertRepayBorrowBehalf(ctx, accounts[1], accounts[0], ctx.USDC, 100);
        await repayBorrow.revertRepayBorrowBehalf(ctx, accounts[1], accounts[0], ctx.USDT, 100);
        await repayBorrow.revertRepayBorrowBehalf(ctx, accounts[1], accounts[0], ctx.CFSC, 100);
    });
});
