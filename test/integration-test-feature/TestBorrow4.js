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
const systemCfg = require('./methods/system-config');

const maxUint256 = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));

contract('borrow test case 4', async (accounts) => {
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
    });
    it('borrow-4-1', async () => {
        let borrowAmount = web3.utils.toWei('33000');
        await borrow.simpleBorrow(ctx, ctx.dEther, accounts[0], borrowAmount);
        let publicBorrowAmount = web3.utils.toWei('8000');
        await borrow.simpleBorrow(ctx, ctx.dEther, accounts[1], publicBorrowAmount);
        /* we repay borrow at here to eliminate the impact on subsequent cases */
        // firstly, we exchange some CFSC to cover interest
        await ctx.USDT.approve(ctx.exchangePool.address, 1000 * (10 ** 6));
        await ctx.USDT.approve(ctx.exchangePool.address, 1000 * (10 ** 6), {from: accounts[1]});
        await ctx.exchangePool.mintByCFSCAmount(ctx.USDT.address, web3.utils.toWei('1000'));
        await ctx.exchangePool.mintByCFSCAmount(ctx.USDT.address, web3.utils.toWei('1000'), {from: accounts[1]});
        // then, we repay borrow
        await ctx.CFSC.approve(ctx.borrowPool.address, maxUint256);
        await ctx.borrowPool.repayBorrow(ctx.CFSC.address, maxUint256);
        await ctx.CFSC.approve(ctx.borrowPool.address, maxUint256, {from: accounts[1]});
        await ctx.borrowPool.repayBorrow(ctx.CFSC.address, maxUint256, {from: accounts[1]});
    });
    it('borrow-4-2', async () => {
        await borrow.simpleBorrow(ctx, ctx.dEther, accounts[0], web3.utils.toWei('41000'));
        await borrow.failBorrow(ctx, accounts[1], web3.utils.toWei('9000'), "insufficient system liquidity");
        await borrow.failBorrow(ctx, accounts[1], web3.utils.toWei('5000'), "public borrow failed: threshold");
        // repay borrow
        await ctx.borrowPool.repayBorrow(ctx.CFSC.address, maxUint256);
    });
    it('borrow-4-3', async () => {
        await borrow.simpleBorrow(ctx, ctx.dEther, accounts[0], web3.utils.toWei('33000'));
        await borrow.failBorrow(ctx, accounts[1], web3.utils.toWei('17000'), "insufficient system liquidity");
    });
});
