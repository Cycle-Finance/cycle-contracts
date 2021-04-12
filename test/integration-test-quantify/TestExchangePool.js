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

const ep = require('./method/exchange-pool');

contract('test exchange pool', async (accounts) => {
    it('use USDT to test exchange pool', async () => {
        let usdt = await USDT.deployed();
        let cfsc = await CycleStableCoin.deployed();
        let oracle = await TestOracle.deployed();
        let price = await oracle.getPrice(usdt.address);
        let exchangePool = await ExchangePool.deployed();
        // approve
        await usdt.approve(exchangePool.address, web3.utils.toBN('0xfffffffffffffffffffffff'));
        // mint
        let usdtBalanceBefore = await usdt.balanceOf(accounts[0]);
        let cfscBalanceBefore = await cfsc.balanceOf(accounts[0]);
        let exchangePoolBalanceBefore = await usdt.balanceOf(exchangePool.address);
        let cfscTotalSupplyBefore = await cfsc.totalSupply();
        let usdtAmount = web3.utils.toBN(1000 * (10 ** 6));
        await exchangePool.mint(usdt.address, usdtAmount);
        let usdtBalanceAfter = await usdt.balanceOf(accounts[0]);
        let cfscBalanceAfter = await cfsc.balanceOf(accounts[0]);
        let exchangePoolBalanceAfter = await usdt.balanceOf(exchangePool.address);
        let cfscTotalSupplyAfter = await cfsc.totalSupply();
        let usdtBalanceGap = usdtBalanceBefore.sub(usdtBalanceAfter);
        let cfscBalanceGap = cfscBalanceAfter.sub(cfscBalanceBefore);
        let exchangePoolBalanceGap = exchangePoolBalanceAfter.sub(exchangePoolBalanceBefore);
        let cfscTotalSupplyGap = cfscTotalSupplyAfter.sub(cfscTotalSupplyBefore);
        assert.equal(usdtBalanceGap.toString(), usdtAmount.toString());
        assert.equal(cfscBalanceGap.toString(), ep.mint(price, usdtAmount).toString());
        assert.equal(exchangePoolBalanceGap.toString(), usdtAmount.toString());
        assert.equal(cfscTotalSupplyGap.toString(), ep.mint(price, usdtAmount).toString());
        // mint by cfsc amount
        usdtBalanceBefore = usdtBalanceAfter;
        cfscBalanceBefore = cfscBalanceAfter;
        exchangePoolBalanceBefore = exchangePoolBalanceAfter;
        cfscTotalSupplyBefore = cfscTotalSupplyAfter;
        let cfscAmount = web3.utils.toBN(web3.utils.toWei('1000'));
        await exchangePool.mintByCFSCAmount(usdt.address, cfscAmount);
        usdtBalanceAfter = await usdt.balanceOf(accounts[0]);
        cfscBalanceAfter = await cfsc.balanceOf(accounts[0]);
        exchangePoolBalanceAfter = await usdt.balanceOf(exchangePool.address);
        cfscTotalSupplyAfter = await cfsc.totalSupply();
        usdtBalanceGap = usdtBalanceBefore.sub(usdtBalanceAfter);
        cfscBalanceGap = cfscBalanceAfter.sub(cfscBalanceBefore);
        exchangePoolBalanceGap = exchangePoolBalanceAfter.sub(exchangePoolBalanceBefore);
        cfscTotalSupplyGap = cfscTotalSupplyAfter.sub(cfscTotalSupplyBefore);
        assert.equal(usdtBalanceGap.toString(), ep.mintByCFSCAmount(price, cfscAmount).toString());
        assert.equal(cfscBalanceGap.toString(), cfscAmount.toString());
        assert.equal(exchangePoolBalanceGap.toString(), ep.mintByCFSCAmount(price, cfscAmount).toString());
        assert.equal(cfscTotalSupplyGap.toString(), cfscAmount.toString());
        // burn
        await cfsc.approve(exchangePool.address, cfscAmount.muln(10));
        usdtBalanceBefore = usdtBalanceAfter;
        cfscBalanceBefore = cfscBalanceAfter;
        exchangePoolBalanceBefore = exchangePoolBalanceAfter;
        cfscTotalSupplyBefore = cfscTotalSupplyAfter;
        await exchangePool.burn(usdt.address, usdtAmount);
        usdtBalanceAfter = await usdt.balanceOf(accounts[0]);
        cfscBalanceAfter = await cfsc.balanceOf(accounts[0]);
        exchangePoolBalanceAfter = await usdt.balanceOf(exchangePool.address);
        cfscTotalSupplyAfter = await cfsc.totalSupply();
        usdtBalanceGap = usdtBalanceAfter.sub(usdtBalanceBefore);
        cfscBalanceGap = cfscBalanceBefore.sub(cfscBalanceAfter);
        exchangePoolBalanceGap = exchangePoolBalanceBefore.sub(exchangePoolBalanceAfter);
        cfscTotalSupplyGap = cfscTotalSupplyBefore.sub(cfscTotalSupplyAfter);
        assert.equal(usdtBalanceGap.toString(), usdtAmount.toString());
        assert.equal(cfscBalanceGap.toString(), ep.burn(price, usdtAmount).toString());
        assert.equal(exchangePoolBalanceGap.toString(), usdtAmount.toString());
        assert.equal(cfscTotalSupplyGap.toString(), ep.burn(price, usdtAmount).toString());
        // burn by cfsc amount
        usdtBalanceBefore = usdtBalanceAfter;
        cfscBalanceBefore = cfscBalanceAfter;
        exchangePoolBalanceBefore = exchangePoolBalanceAfter;
        cfscTotalSupplyBefore = cfscTotalSupplyAfter;
        await exchangePool.burnByCFSCAmount(usdt.address, cfscAmount);
        usdtBalanceAfter = await usdt.balanceOf(accounts[0]);
        cfscBalanceAfter = await cfsc.balanceOf(accounts[0]);
        exchangePoolBalanceAfter = await usdt.balanceOf(exchangePool.address);
        cfscTotalSupplyAfter = await cfsc.totalSupply();
        usdtBalanceGap = usdtBalanceAfter.sub(usdtBalanceBefore);
        cfscBalanceGap = cfscBalanceBefore.sub(cfscBalanceAfter);
        exchangePoolBalanceGap = exchangePoolBalanceBefore.sub(exchangePoolBalanceAfter);
        cfscTotalSupplyGap = cfscTotalSupplyBefore.sub(cfscTotalSupplyAfter);
        assert.equal(usdtBalanceGap.toString(), ep.burnByCFSCAmount(price, cfscAmount).toString());
        assert.equal(cfscBalanceGap.toString(), cfscAmount.toString());
        assert.equal(exchangePoolBalanceGap.toString(), ep.burnByCFSCAmount(price, cfscAmount).toString());
        assert.equal(cfscTotalSupplyGap.toString(), cfscAmount.toString());
    });
});