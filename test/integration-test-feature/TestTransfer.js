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

const deposit = require('../methods/deposit');
const borrow = require('../methods/borrow');
const transfer = require('../methods/transfer');
const sysConfig = require('../methods/system-config');

contract('transfer test case', async (accounts) => {
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
        let amount = 10000 * (10 ** 6);
        await USDC.approve(dUSDC.address, amount);
        await deposit.simpleDeposit(ctx, dUSDC, accounts[0], amount);
    });
    it('transfer-1: transfer 0', async () => {
        await transfer.simpleTransfer(ctx, ctx.dUSDC, accounts[0], accounts[1], 0);
    });
    it('transfer-2: transfer some dToken', async () => {
        await transfer.simpleTransfer(ctx, ctx.dUSDC, accounts[0], accounts[1], 100 * (10 ** 6));
    });
    it('transfer-3: transfer amount is more than balance of from account', async () => {
        await transfer.failTransfer(ctx.dUSDC, accounts[0], accounts[1], 10000 * (10 ** 6),
            "calculate account liquidity failed");
    });
    it('transfer-4: transfer amount is more than balance of from account', async () => {
        await borrow.simpleBorrow(ctx, ctx.dUSDC, accounts[0], web3.utils.toWei('7000'));
        await transfer.simpleTransfer(ctx, ctx.dUSDC, accounts[0], accounts[1], 0);
        await transfer.simpleTransfer(ctx, ctx.dUSDC, accounts[0], accounts[1], 100 * (10 ** 6));
        await transfer.failTransfer(ctx.dUSDC, accounts[0], accounts[1], 10000 * (10 ** 6),
            "insufficient liquidity");
    });
    it('transfer-5: transfer paused', async () => {
        await sysConfig.SetTransferPaused(ctx, true);
        await transfer.revertTransfer(ctx.dUSDC, accounts[0], accounts[1], 0);
        await transfer.revertTransfer(ctx.dUSDC, accounts[0], accounts[1], 100 * (10 ** 6));
        await transfer.revertTransfer(ctx.dUSDC, accounts[0], accounts[1], 100000 * (10 ** 6));
        await sysConfig.SetTransferPaused(ctx, false);
        await transfer.revertTransfer(ctx.dUSDC, accounts[0], accounts[1], 0);
        await transfer.revertTransfer(ctx.dUSDC, accounts[0], accounts[1], 2 * (10 ** 6));
        await transfer.failTransfer(ctx.dUSDC, accounts[0], accounts[1], 10000 * (10 ** 6),
            "insufficient liquidity");
    });
});
