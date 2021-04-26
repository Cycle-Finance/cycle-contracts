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

const dToken = require('./method/dToken');

contract('test dToken', async (accounts) => {
    before(async () => {
        let wbtc = await WBTC.deployed();
        let comptroller = await Comptroller.at(ComptrollerProxy.address);
        let dWBTC = await DERC20.at(await comptroller.markets(1));
        // transfer asset to other accounts
        let wbtcAmount = 1000 * (10 ** 8);
        await wbtc.transfer(accounts[1], wbtcAmount);
        // approve
        await wbtc.approve(dWBTC.address, wbtcAmount);
        await wbtc.approve(dWBTC.address, wbtcAmount, {from: accounts[1]});
    });
    it('test dToken', async () => {
        // fetch price
        let oracle = await TestOracle.deployed();
        let wbtc = await WBTC.deployed();
        let price = await oracle.getPrice(wbtc.address);
        // accounts[0] deposit
        let comptroller = await Comptroller.at(ComptrollerProxy.address);
        let dWBTC = await DERC20.at(await comptroller.markets(1));
        let wbtcBalanceBefore = await wbtc.balanceOf(accounts[0]);
        let amount = web3.utils.toBN(10 * (10 ** 8));
        dWBTC.mint(amount);
        let wbtcBalanceAfter = await wbtc.balanceOf(accounts[0]);
        assert.equal(wbtcBalanceBefore.sub(wbtcBalanceAfter).toString(), amount.toString());
        let contractTotalSupply = await dWBTC.totalSupply();
        let contractBalanceOf0 = await dWBTC.balanceOf(accounts[0]);
        assert.equal(contractTotalSupply.toString(), contractBalanceOf0.toString());
        assert.equal(contractTotalSupply.toString(), amount.toString());
        let contractDepositValue = await dWBTC.depositValue();
        let localDepositValue = dToken.depositValue(amount, price);
        assert.equal(contractDepositValue.toString(), localDepositValue.toString());
        // accounts[1] deposit
        await dWBTC.mint(amount, {from: accounts[1]});
        contractTotalSupply = await dWBTC.totalSupply();
        let contractBalanceOf1 = await dWBTC.balanceOf(accounts[1]);
        assert.equal(contractBalanceOf1.toString(), amount.toString());
        assert.equal(contractTotalSupply.toString(), (amount.muln(2)).toString());
        contractDepositValue = await dWBTC.depositValue();
        localDepositValue = dToken.depositValue(amount.muln(2), price);
        assert.equal(contractDepositValue.toString(), localDepositValue.toString());
        // check user deposit value
        let contractUserValue0 = await dWBTC.userDepositValue(accounts[0]);
        let contractUserValue1 = await dWBTC.userDepositValue(accounts[1]);
        assert.equal(contractUserValue0.toString(), contractUserValue1.toString());
        // transfer
        let tx = await dWBTC.transfer(accounts[1], amount);
        console.log('dToken transfer: %s', tx.receipt.gasUsed);
        contractBalanceOf1 = await dWBTC.balanceOf(accounts[1]);
        assert.equal(contractBalanceOf1.toString(), contractTotalSupply.toString());
        // approve and transferFrom
        tx = await dWBTC.approve(accounts[0], amount, {from: accounts[1]});
        console.log('dToken approve: %s', tx.receipt.gasUsed);
        tx = await dWBTC.transferFrom(accounts[1], accounts[0], amount);
        console.log('dToken transferFrom: %s', tx.receipt.gasUsed);
        contractBalanceOf0 = await dWBTC.balanceOf(accounts[0]);
        contractBalanceOf1 = await dWBTC.balanceOf(accounts[1]);
        assert.equal(contractBalanceOf0.toString(), contractBalanceOf1.toString());
        // check token value and amount
        contractDepositValue = await dWBTC.depositValue();
        let contractTokenAmount = await dWBTC.tokenAmount(contractDepositValue);
        let localTokenAmount = dToken.tokenAmount(contractDepositValue, price);
        console.log(contractTokenAmount.toString(), localTokenAmount.toString());
        assert.equal(contractTokenAmount.toString(), localTokenAmount.toString());
        // accounts[0] redeem
        await dWBTC.redeem(amount);
        contractTotalSupply = await dWBTC.totalSupply();
        contractBalanceOf0 = await dWBTC.balanceOf(accounts[0]);
        contractBalanceOf1 = await dWBTC.balanceOf(accounts[1]);
        assert.equal(contractBalanceOf0.toString(), "0");
        assert.equal(contractTotalSupply.toString(), contractBalanceOf1.toString());
        // accounts[1] redeem
        await dWBTC.redeem(amount, {from: accounts[1]});
        contractTotalSupply = await dWBTC.totalSupply();
        contractBalanceOf0 = await dWBTC.balanceOf(accounts[0]);
        contractBalanceOf1 = await dWBTC.balanceOf(accounts[1]);
        assert.equal(contractTotalSupply.toString(), "0");
        assert.equal(contractBalanceOf0.toString(), "0");
        assert.equal(contractBalanceOf0.toString(), contractBalanceOf1.toString());
    });
});