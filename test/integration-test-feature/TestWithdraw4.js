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

contract('withdraw test case 4', async (accounts) => {
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
        // provide 10 ETH as system liquidity
        let amount = web3.utils.toWei('10');
        await deposit.simpleDeposit(ctx, ctx.dEther, accounts[0], amount);
        let borrowAmount = web3.utils.toWei('10000');
        await borrow.simpleBorrow(ctx, ctx.dEther, accounts[0], borrowAmount);
    });
    it('withdraw-4-1', async () => {
        let amount = web3.utils.toWei('100');
        await withdraw.failWithdraw(ctx, ctx.dEther, accounts[0], amount, "calculate account liquidity failed");
        await withdraw.simpleWithdraw(ctx, ctx.dEther, accounts[0], 0)
    });
    it('withdraw-4-2', async () => {
        let amount = web3.utils.toWei('10');
        await withdraw.failWithdraw(ctx, ctx.dEther, accounts[0], amount, "insufficient liquidity");
        await withdraw.simpleWithdraw(ctx, ctx.dEther, accounts[0], 0)
    });
    it('withdraw-4-3', async () => {
        let amount = 10 * (10 ** 6);
        await withdraw.failWithdraw(ctx, ctx.dUSDT, accounts[0], amount, "calculate account liquidity failed");
        await withdraw.simpleWithdraw(ctx, ctx.dUSDT, accounts[0], 0)
    });
    it('withdraw-4-4', async () => {
        let amount = web3.utils.toWei('4');
        await withdraw.failWithdraw(ctx, ctx.dEther, accounts[0], amount, "insufficient liquidity");
        await withdraw.simpleWithdraw(ctx, ctx.dEther, accounts[0], 0)
    });
    it('withdraw-4-5', async () => {
        let amount = web3.utils.toWei('1');
        await withdraw.simpleWithdraw(ctx, ctx.dEther, accounts[0], amount);
        await withdraw.simpleWithdraw(ctx, ctx.dEther, accounts[0], 0)
    });
});