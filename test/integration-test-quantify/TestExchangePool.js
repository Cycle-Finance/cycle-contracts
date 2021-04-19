const ExchangePool = artifacts.require("ExchangePool");
const CycleStableCoin = artifacts.require("CycleStableCoin");

/* test only, will be replaced at maninnet*/
const TestOracle = artifacts.require("TestOracle");
const USDT = artifacts.require("TestUSDT");

const ep = require('./method/exchange-pool');

let feeRate = web3.utils.toBN(web3.utils.toWei('0.0001'));

contract('test exchange pool', async (accounts) => {
    before('set fee rate at here', async () => {
        let exchangePool = await ExchangePool.deployed();
        await exchangePool.setFeeRate(feeRate);
    });
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
        let exchangePoolCFSCBalance = await cfsc.balanceOf(exchangePool.address);
        let usdtBalanceGap = usdtBalanceBefore.sub(usdtBalanceAfter);
        let cfscBalanceGap = cfscBalanceAfter.sub(cfscBalanceBefore);
        let exchangePoolBalanceGap = exchangePoolBalanceAfter.sub(exchangePoolBalanceBefore);
        let cfscTotalSupplyGap = cfscTotalSupplyAfter.sub(cfscTotalSupplyBefore);
        assert.equal(usdtBalanceGap.toString(), usdtAmount.toString());
        let localMintResult0 = ep.mint(price, usdtAmount, feeRate);
        assert.equal(cfscBalanceGap.toString(), localMintResult0[0].toString());
        assert.equal(exchangePoolBalanceGap.toString(), usdtAmount.toString());
        assert.equal(cfscTotalSupplyGap.toString(), localMintResult0[0].add(localMintResult0[1]).toString());
        assert.equal(exchangePoolCFSCBalance.toString(), localMintResult0[1].toString());
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
        exchangePoolCFSCBalance = await cfsc.balanceOf(exchangePool.address);
        usdtBalanceGap = usdtBalanceBefore.sub(usdtBalanceAfter);
        cfscBalanceGap = cfscBalanceAfter.sub(cfscBalanceBefore);
        exchangePoolBalanceGap = exchangePoolBalanceAfter.sub(exchangePoolBalanceBefore);
        cfscTotalSupplyGap = cfscTotalSupplyAfter.sub(cfscTotalSupplyBefore);
        let localMintResult1 = ep.mintByCFSCAmount(price, cfscAmount, feeRate);
        assert.equal(usdtBalanceGap.toString(), localMintResult1[0].toString());
        assert.equal(cfscBalanceGap.toString(), cfscAmount.sub(localMintResult1[1]).toString());
        assert.equal(exchangePoolBalanceGap.toString(), localMintResult1[0].toString());
        assert.equal(cfscTotalSupplyGap.toString(), cfscAmount.toString());
        assert.equal(exchangePoolCFSCBalance.toString(), localMintResult0[1].add(localMintResult1[1]).toString());
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
        exchangePoolCFSCBalance = await cfsc.balanceOf(exchangePool.address);
        usdtBalanceGap = usdtBalanceAfter.sub(usdtBalanceBefore);
        cfscBalanceGap = cfscBalanceBefore.sub(cfscBalanceAfter);
        exchangePoolBalanceGap = exchangePoolBalanceBefore.sub(exchangePoolBalanceAfter);
        cfscTotalSupplyGap = cfscTotalSupplyBefore.sub(cfscTotalSupplyAfter);
        let localBurnResult0 = ep.burn(price, usdtAmount, feeRate);
        assert.equal(usdtBalanceGap.toString(), usdtAmount.toString());
        assert.equal(cfscBalanceGap.toString(), localBurnResult0[0].add(localBurnResult0[1]).toString());
        assert.equal(exchangePoolBalanceGap.toString(), usdtAmount.toString());
        assert.equal(cfscTotalSupplyGap.toString(), localBurnResult0[0].toString());
        assert.equal(exchangePoolCFSCBalance.toString(), localMintResult0[1].add(localMintResult1[1])
            .add(localBurnResult0[1]).toString());
        // burn by cfsc amount
        usdtBalanceBefore = usdtBalanceAfter;
        cfscBalanceBefore = cfscBalanceAfter;
        exchangePoolBalanceBefore = exchangePoolBalanceAfter;
        cfscTotalSupplyBefore = cfscTotalSupplyAfter;
        cfscAmount = await cfsc.balanceOf(accounts[0]);
        await exchangePool.burnByCFSCAmount(usdt.address, cfscAmount);
        usdtBalanceAfter = await usdt.balanceOf(accounts[0]);
        cfscBalanceAfter = await cfsc.balanceOf(accounts[0]);
        exchangePoolBalanceAfter = await usdt.balanceOf(exchangePool.address);
        cfscTotalSupplyAfter = await cfsc.totalSupply();
        exchangePoolCFSCBalance = await cfsc.balanceOf(exchangePool.address);
        usdtBalanceGap = usdtBalanceAfter.sub(usdtBalanceBefore);
        cfscBalanceGap = cfscBalanceBefore.sub(cfscBalanceAfter);
        exchangePoolBalanceGap = exchangePoolBalanceBefore.sub(exchangePoolBalanceAfter);
        cfscTotalSupplyGap = cfscTotalSupplyBefore.sub(cfscTotalSupplyAfter);
        let localBurnResult1 = ep.burnByCFSCAmount(price, cfscAmount, feeRate);
        assert.equal(usdtBalanceGap.toString(), localBurnResult1[0].toString());
        assert.equal(cfscBalanceGap.toString(), cfscAmount.toString());
        assert.equal(exchangePoolBalanceGap.toString(), localBurnResult1[0].toString());
        assert.equal(cfscTotalSupplyGap.toString(), cfscAmount.sub(localBurnResult1[1]).toString());
        assert.equal(exchangePoolCFSCBalance.toString(), localMintResult0[1].add(localMintResult1[1])
            .add(localBurnResult0[1]).add(localBurnResult1[1]).toString());
        cfscBalanceBefore = cfscBalanceAfter;
        await exchangePool.withdrawFee(accounts[0], exchangePoolCFSCBalance);
        cfscBalanceAfter = await cfsc.balanceOf(accounts[0]);
        cfscBalanceGap = cfscBalanceAfter.sub(cfscBalanceBefore);
        assert.equal(cfscBalanceGap.toString(), exchangePoolCFSCBalance.toString());
        exchangePoolCFSCBalance = await cfsc.balanceOf(exchangePool.address);
        assert.equal(exchangePoolCFSCBalance.toString(), '0');
    });
});