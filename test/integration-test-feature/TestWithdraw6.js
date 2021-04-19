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

const withdraw = require('./methods/withdraw');
const deposit = require('./methods/deposit');
const borrow = require('./methods/borrow');
const repayBorrow = require('./methods/repay-borrow');
const systemCfg = require('./methods/system-config');

contract('withdraw test case 6', async (accounts) => {
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
        // deposit system liquidity and set public borrower
        await deposit.simpleDeposit(ctx, ctx.dEther, accounts[0], web3.utils.toWei('1'));
        await deposit.simpleDeposit(ctx, ctx.dWBTC, accounts[0], 10 ** 8);
        await deposit.simpleDeposit(ctx, ctx.dUSDC, accounts[0], 1000 * (10 ** 6));
        await deposit.simpleDeposit(ctx, ctx.dUSDT, accounts[0], 1000 * (10 ** 6));
        await systemCfg.SetPublicBorrower(ctx, accounts[1]);
        await borrow.simpleBorrow(ctx, dEther, accounts[1], web3.utils.toWei('49600'))
    });
    it('withdraw-6-1: user could withdraw 20 USDC', async () => {
        await withdraw.simpleWithdraw(ctx, ctx.dUSDC, accounts[0], 20 * (10 ** 6))
    });
    it('withdraw-6-2', async () => {
        await withdraw.failWithdraw(ctx, ctx.dUSDC, accounts[0], 30 * (10 ** 6), "insufficient system liquidity");
    });
    it('withdraw-6-3', async () => {
        await withdraw.failWithdraw(ctx, ctx.dUSDC, accounts[0], 55149 * (10 ** 6), "calculate system liquidity failed");
    });
    it('withdraw-6-4', async () => {
        // exchange CFSC firstly
        const maxUint256 = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
        await ctx.USDC.approve(ctx.exchangePool.address, maxUint256, {from: accounts[1]});
        let repayAmount = web3.utils.toWei('49600');
        await ctx.exchangePool.mintByCFSCAmount(ctx.USDC.address, repayAmount, {from: accounts[1]});
        await ctx.CFSC.approve(ctx.borrowPool.address, maxUint256, {from: accounts[1]});
        await repayBorrow.simpleRepayBorrow(ctx, ctx.dUSDC, accounts[1], ctx.CFSC, maxUint256);
        await withdraw.simpleWithdraw(ctx, ctx.dEther, accounts[0], web3.utils.toWei('1'));
        await withdraw.simpleWithdraw(ctx, ctx.dWBTC, accounts[0], 10 ** 8);
        await withdraw.simpleWithdraw(ctx, ctx.dUSDC, accounts[0], 980 * (10 ** 6));
        let totalBorrows = await ctx.borrowPool.totalBorrows();
        let totalDeposit = await ctx.comptroller.totalDeposit();
        let marketDeposit = await ctx.dUSDT.depositValue();
        console.log('totalBorrows %s, totalDeposit %s, marketDeposit %s', totalBorrows, totalDeposit, marketDeposit);
        // after borrower repay whole borrows, there maybe some borrows in borrow pool because the calculation mismatch
        // so we cannot withdraw whole deposit
        await withdraw.simpleWithdraw(ctx, ctx.dUSDT, accounts[0], 999 * (10 ** 6));
    });
});