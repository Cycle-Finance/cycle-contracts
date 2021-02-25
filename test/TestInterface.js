const web3 = require('web3');
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

contract('Interface test', async (accounts) => {
    let zeroAddress = '0x0000000000000000000000000000000000000000';
    let emptyData = new Buffer('');
    it('comptroller refresh market', async () => {
        let borrowPool = await Borrows.at(BorrowsProxy.address);
        let initAccrualBlock = await borrowPool.accrualBlock();
        let initBorrowIndex = await borrowPool.borrowIndex();
        let initTotalBorrows = await borrowPool.totalBorrows();
        // there were four markets registered at comptroller because truffle migration
        let comptroller = await Comptroller.at(ComptrollerProxy.address);
        let initRefreshedBlock = await comptroller.refreshedBlock();
        // the marketDeposit and totalDeposit are 0, refresh market deposit
        let refreshMarketTxReceipt = await comptroller.refreshMarketDeposit();
        // check borrowPool state
        let currentAccrualBlock = await borrowPool.accrualBlock();
        let currentBorrowIndex = await borrowPool.borrowIndex();
        let currentTotalBorrows = await borrowPool.totalBorrows();
        assert.ok(currentAccrualBlock > initAccrualBlock);
        assert.ok(currentBorrowIndex > initBorrowIndex);
        assert.ok(currentTotalBorrows >= initTotalBorrows);
        // check comptroller state
        let currentRefreshedBlock = await comptroller.refreshedBlock();
        assert.ok(currentRefreshedBlock > initRefreshedBlock);
        // check log
        console.log(refreshMarketTxReceipt);
        // truffle has some problem that refreshMarketTxReceipt couldn't decode raw logs
        // assert.equal(refreshMarketTxReceipt.logs.length, 1);
    });
    it('comptroller update some config', async () => {
        let comptroller = await Comptroller.at(ComptrollerProxy.address);
        // use accounts[1] as test address
        let testAddr = accounts[1];
        // check public borrower
        await comptroller.setPublicBorrower(testAddr);
        let newPublicBorrower = await comptroller.publicBorrower();
        assert.equal(newPublicBorrower, testAddr);
        await comptroller.setPublicBorrower(zeroAddress);
        // check borrow pool
        let borrowPool = await BorrowsProxy.new(Borrows.address, emptyData);
        await comptroller.setBorrowPool(borrowPool.address);
        let newBorrowPool = await comptroller.borrowPool();
        assert.equal(newBorrowPool, borrowPool.address);
        await comptroller.setBorrowPool(BorrowsProxy.address);
        // check supply speed
        let suppleSpeed = web3.utils.toWei('1');
        await comptroller.setSupplySpeed(suppleSpeed);
        let newSupplySpeed = await comptroller.supplySpeed();
        assert.equal(newSupplySpeed, suppleSpeed);
        await comptroller.setSupplySpeed(0);
        // check borrow speed
        let borrowSpeed = suppleSpeed;
        await comptroller.setBorrowSpeed(borrowSpeed);
        let newBorrowSpeed = await comptroller.borrowSpeed();
        assert.equal(borrowSpeed, newBorrowSpeed);
        await comptroller.setBorrowSpeed(0);
        // check collateral factor
        let collateralFactor = web3.utils.toWei('0.8');
        let testMarket = await comptroller.markets(0);
        await comptroller.setCollateralFactor(testMarket, collateralFactor);
        let newCollateralFactor = await comptroller.collateralFactor(testMarket);
        assert.equal(collateralFactor, newCollateralFactor);
        await comptroller.setCollateralFactor(testMarket, web3.utils.toWei('0.75'));
        // check system utilization rate
        let sysUR = web3.utils.toWei('0.8');
        await comptroller.setSystemUtilizationRate(sysUR);
        let newSysUR = await comptroller.systemUtilizationRate();
        assert.equal(sysUR, newSysUR);
        await comptroller.setSystemUtilizationRate(web3.utils.toWei('0.75'));
        // check max close factor
        let maxCloseFactor = web3.utils.toWei('0.75');
        await comptroller.setMaxCloseFactor(maxCloseFactor);
        let newMaxCloseFactor = await comptroller.maxCloseFactor();
        assert.equal(newMaxCloseFactor, maxCloseFactor);
        await comptroller.setMaxCloseFactor(web3.utils.toWei('0.8'));
        // check max close factor
        let liquidationIncentive = web3.utils.toWei('1.1');
        await comptroller.setLiquidationIncentive(liquidationIncentive);
        let newLiquidationIncentive = await comptroller.liquidationIncentive();
        assert.equal(liquidationIncentive, newLiquidationIncentive);
        await comptroller.setLiquidationIncentive(web3.utils.toWei('1.08'));
    });
    it('oracle interface test', async () => {
        let oracle = await TestOracle.deployed();
        let ethPrice = web3.utils.toWei('1635.56');
        let btcPrice = web3.utils.toWei('50019') * (10 ** 10);
        let usdcPrice = web3.utils.toWei('1') * (10 ** 12);
        let usdtPrice = web3.utils.toWei('1.001') * (10 ** 12);
        await oracle.setPrice(zeroAddress, ethPrice);
        await oracle.setPrice(WBTC.address, btcPrice);
        await oracle.setPrice(USDC.address, usdcPrice);
        await oracle.setPrice(USDT.address, usdtPrice);
        let contractEthPrice = await oracle.getPrice(zeroAddress);
        let contractBTCPrice = await oracle.getPrice(WBTC.address);
        let contractUSDCPrice = await oracle.getPrice(USDC.address);
        let contractUSDTPrice = await oracle.getPrice(USDT.address);
        assert.equal(ethPrice, contractEthPrice);
        assert.equal(btcPrice, contractBTCPrice);
        assert.equal(usdcPrice, contractUSDCPrice);
        assert.equal(usdtPrice, contractUSDTPrice);
    });
    it('test exchange pool interface', async () => {
        let exchangePool = await ExchangePool.deployed();
        let cfsc = await CycleStableCoin.deployed();
        let usdc = await USDC.deployed();
        let usdt = await USDT.deployed();
        let initCFSCBalance = await cfsc.balanceOf(accounts[0]);
        let initUSDCBalance = await usdc.balanceOf(accounts[0]);
        let initUSDTBalance = await usdt.balanceOf(accounts[0]);
        console.log(initCFSCBalance, initUSDCBalance, initUSDTBalance);
        let contractInitUSDCBalance = await usdc.balanceOf(exchangePool.address);
        let contractInitUSDTBalance = await usdt.balanceOf(exchangePool.address);
        usdc.approve(exchangePool.address, initUSDCBalance);
        usdt.approve(exchangePool.address, initUSDTBalance);
        /// @notice USDC and USDT decimals is 6
        let exchangeAmount = web3.utils.toWei('1000') / (10 ** 12);
        let exchangeCFSCAmount = web3.utils.toWei('1000');
        // use USDC to buy CFSC
        await exchangePool.mint(usdc.address, exchangeAmount);
        let contractUSDCBalance = await usdc.balanceOf(exchangePool.address);
        let usdcBalance = await usdc.balanceOf(accounts[0]);
        let cfscBalance = await cfsc.balanceOf(accounts[0]);
        assert.equal(initUSDCBalance - usdcBalance, exchangeAmount);
        assert.equal(contractUSDCBalance - contractInitUSDCBalance, exchangeAmount);
        // because USDC price is $1
        assert.equal(cfscBalance - initCFSCBalance, exchangeCFSCAmount);
        // use USDT to buy CFSC
        await exchangePool.mintByCFSCAmount(usdt.address, exchangeCFSCAmount);
        let usdtBalance = await usdt.balanceOf(accounts[0]);
        // because USDT price is more than $1
        assert.ok(initUSDTBalance - usdtBalance < exchangeAmount);
        let contractUSDTBalance = await usdt.balanceOf(exchangePool.address);
        assert.equal(contractUSDTBalance - contractInitUSDTBalance, initUSDTBalance - usdtBalance);
        cfscBalance = await cfsc.balanceOf(accounts[0]);
        assert.equal(cfscBalance - initCFSCBalance, exchangeCFSCAmount * 2);
        // use CFSC to buy USDC
        await exchangePool.burn(usdc.address, exchangeAmount);
        usdcBalance = await usdc.balanceOf(accounts[0]);
        cfscBalance = await cfsc.balanceOf(accounts[0]);
        contractUSDCBalance = await usdc.balanceOf(exchangePool.address);
        assert.equal(usdcBalance, initUSDCBalance);
        assert.equal(cfscBalance, exchangeCFSCAmount);
        assert.equal(contractUSDCBalance, 0);
        // use CFSC to buy USDT
        await exchangePool.burnByCFSCAmount(usdt.address, exchangeCFSCAmount);
        usdtBalance = await usdt.balanceOf(accounts[0]);
        cfscBalance = await cfsc.balanceOf(accounts[0]);
        contractUSDTBalance = await usdt.balanceOf(exchangePool.address);
        assert.equal(usdtBalance, initUSDTBalance);
        assert.equal(cfscBalance, 0);
        assert.equal(contractUSDTBalance, 0);
    });
    it('dToken interface test', async () => {
        // deposit
    });
});