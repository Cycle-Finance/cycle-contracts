const BN = require('bn.js');
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
        // console.log(refreshMarketTxReceipt);
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
        let btcPrice = web3.utils.toWei('50019');
        let usdcPrice = web3.utils.toWei('1');
        let usdtPrice = web3.utils.toWei('1.001');
        await oracle.setPrice(zeroAddress, ethPrice);
        await oracle.setPrice(WBTC.address, btcPrice);
        await oracle.setPrice(USDC.address, usdcPrice);
        await oracle.setPrice(USDT.address, usdtPrice);
        let contractEthPrice = await oracle.getPrice(zeroAddress);
        let contractBTCPrice = await oracle.getPrice(WBTC.address);
        let contractUSDCPrice = await oracle.getPrice(USDC.address);
        let contractUSDTPrice = await oracle.getPrice(USDT.address);
        assert.equal(ethPrice, contractEthPrice);
        assert.equal(btcPrice, contractBTCPrice / (10 ** 10));
        assert.equal(usdcPrice, contractUSDCPrice / (10 ** 12));
        assert.equal(usdtPrice, contractUSDTPrice / (10 ** 12));
    });
    it('test exchange pool interface', async () => {
        let exchangePool = await ExchangePool.deployed();
        let cfsc = await CycleStableCoin.deployed();
        let usdc = await USDC.deployed();
        let usdt = await USDT.deployed();
        let initCFSCBalance = await cfsc.balanceOf(accounts[0]);
        let initUSDCBalance = await usdc.balanceOf(accounts[0]);
        let initUSDTBalance = await usdt.balanceOf(accounts[0]);
        console.log(initCFSCBalance.toString(), initUSDCBalance.toString(), initUSDTBalance.toString());
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
        console.log('contract USDT balance: %d', contractUSDTBalance);
        assert.equal(contractUSDTBalance - contractInitUSDTBalance, initUSDTBalance - usdtBalance);
        cfscBalance = await cfsc.balanceOf(accounts[0]);
        assert.equal(cfscBalance - initCFSCBalance, exchangeCFSCAmount * 2);
        // use CFSC to buy USDC, approve CFSC firstly
        await cfsc.approve(exchangePool.address, cfscBalance);
        await exchangePool.burn(usdc.address, exchangeAmount);
        usdcBalance = await usdc.balanceOf(accounts[0]);
        cfscBalance = await cfsc.balanceOf(accounts[0]);
        contractUSDCBalance = await usdc.balanceOf(exchangePool.address);
        assert.equal(usdcBalance.toString(), initUSDCBalance.toString());
        assert.equal(cfscBalance.toString(), exchangeCFSCAmount.toString());
        assert.equal(contractUSDCBalance, 0);
        // use CFSC to buy USDT
        await exchangePool.burnByCFSCAmount(usdt.address, exchangeCFSCAmount);
        usdtBalance = await usdt.balanceOf(accounts[0]);
        cfscBalance = await cfsc.balanceOf(accounts[0]);
        contractUSDTBalance = await usdt.balanceOf(exchangePool.address);
        assert.equal(usdtBalance.toString(), initUSDTBalance.toString());
        assert.equal(cfscBalance, 0);
        assert.equal(contractUSDTBalance, 0);
    });
    it('dToken interface test', async () => {
        let comptroller = await Comptroller.at(ComptrollerProxy.address);
        let dEtherAddr = await comptroller.markets(0);
        let dWBTCAddr = await comptroller.markets(1);
        let dUSDCAddr = await comptroller.markets(2);
        let dUSDTAddr = await comptroller.markets(3);
        let dEther = await DEther.at(dEtherAddr);
        let dWBTC = await DERC20.at(dWBTCAddr);
        let dUSDC = await DERC20.at(dUSDCAddr);
        let dUSDT = await DERC20.at(dUSDTAddr);
        // set oracle and comptroller
        let newOracle = await TestOracle.new();
        let newComptroller = await ComptrollerProxy.new(Comptroller.address, emptyData);
        await dEther.setOracle(newOracle.address);
        await dEther.setComptroller(newComptroller.address);
        let contractOracle = await dEther.oracle();
        let contractComptroller = await dEther.comptroller();
        assert.equal(newOracle.address, contractOracle);
        assert.equal(newComptroller.address, contractComptroller);
        await dEther.setOracle(TestOracle.address);
        await dEther.setComptroller(ComptrollerProxy.address);
        // check tokenValue and tokenAmount interface
        let tokenAmount = web3.utils.toWei('1'); // 1 ether
        let contractTokenValue = await dEther.tokenValue(tokenAmount);
        let contractTokenAmount = await dEther.tokenAmount(contractTokenValue);
        assert.equal(tokenAmount.toString(), contractTokenAmount.toString());
        // mint
        let etherAmount = web3.utils.toWei('1'); // 1 ether
        let wbtcAmount = 100000000; // 1 WBTC
        let usdcAmount = 100000000; // 100 USDC
        let usdtAmount = 100000000; // 100 USDT
        await dEther.mint(etherAmount, {value: etherAmount});
        let wbtc = await WBTC.deployed();
        let usdc = await USDC.deployed();
        let usdt = await USDT.deployed();
        await wbtc.approve(dWBTC.address, wbtcAmount);
        await usdc.approve(dUSDC.address, usdcAmount);
        await usdt.approve(dUSDT.address, usdtAmount);
        await dWBTC.mint(wbtcAmount);
        await dUSDC.mint(usdcAmount);
        await dUSDT.mint(usdtAmount);
        // check balance
        let dEtherAmount = await dEther.balanceOf(accounts[0]);
        let dWBTCAmount = await dWBTC.balanceOf(accounts[0]);
        let dUSDCAmount = await dUSDC.balanceOf(accounts[0]);
        let dUSDTAmount = await dUSDT.balanceOf(accounts[0]);
        assert.equal(dEtherAmount.toString(), etherAmount.toString());
        assert.equal(dWBTCAmount.toString(), wbtcAmount.toString());
        assert.equal(dUSDCAmount.toString(), usdcAmount.toString());
        assert.equal(dUSDTAmount.toString(), usdtAmount.toString());
        // check deposit value
        let dEtherDepositValue = await dEther.depositValue();
        let dWBTCDepositValue = await dWBTC.depositValue();
        let dUSDCDepositValue = await dUSDC.depositValue();
        let dUSDTDepositValue = await dUSDT.depositValue();
        assert.ok(dEtherDepositValue > 0);
        assert.ok(dWBTCDepositValue > 0);
        assert.ok(dUSDCDepositValue > 0);
        assert.ok(dUSDTDepositValue > 0);
        let userDEtherDepositValue = await dEther.userDepositValue(accounts[0]);
        let userDWBTCDepositValue = await dWBTC.userDepositValue(accounts[0]);
        let userDUSDCDepositValue = await dUSDC.userDepositValue(accounts[0]);
        let userDUSDTDepositValue = await dUSDT.userDepositValue(accounts[0]);
        // user deposit should equals total deposit, because there is only one user deposit
        assert.equal(dEtherDepositValue.toString(), userDEtherDepositValue.toString());
        assert.equal(dWBTCDepositValue.toString(), userDWBTCDepositValue.toString());
        assert.equal(dUSDCDepositValue.toString(), userDUSDCDepositValue.toString());
        assert.equal(dUSDTDepositValue.toString(), userDUSDTDepositValue.toString());
        let totalDeposit = dEtherDepositValue.add(dWBTCDepositValue).add(dUSDCDepositValue).add(dUSDTDepositValue);
        await comptroller.refreshMarketDeposit();
        let comptrollerTotalDeposit = await comptroller.totalDeposit();
        assert.equal(totalDeposit.toString(), comptrollerTotalDeposit.toString());
        let comptrollerDEtherDeposit = await comptroller.marketDeposit(dEther.address);
        let comptrollerDWBTCDeposit = await comptroller.marketDeposit(dWBTC.address);
        let comptrollerDUSDTDeposit = await comptroller.marketDeposit(dUSDT.address);
        let comptrollerDUSDCDeposit = await comptroller.marketDeposit(dUSDC.address);
        assert.equal(dEtherDepositValue.toString(), comptrollerDEtherDeposit.toString());
        assert.equal(dWBTCDepositValue.toString(), comptrollerDWBTCDeposit.toString());
        assert.equal(dUSDCDepositValue.toString(), comptrollerDUSDCDeposit.toString());
        assert.equal(dUSDTDepositValue.toString(), comptrollerDUSDTDeposit.toString());
        // transfer
        await dEther.transfer(accounts[1], etherAmount);
        await dWBTC.transfer(accounts[1], wbtcAmount);
        await dUSDC.transfer(accounts[1], usdcAmount);
        await dUSDT.transfer(accounts[1], usdtAmount);
        // check balanceOf accounts[1]
        dEtherAmount = await dEther.balanceOf(accounts[1]);
        dWBTCAmount = await dWBTC.balanceOf(accounts[1]);
        dUSDCAmount = await dUSDC.balanceOf(accounts[1]);
        dUSDTAmount = await dUSDT.balanceOf(accounts[1]);
        assert.equal(dEtherAmount.toString(), etherAmount.toString());
        assert.equal(dWBTCAmount.toString(), wbtcAmount.toString());
        assert.equal(dUSDCAmount.toString(), usdcAmount.toString());
        assert.equal(dUSDTAmount.toString(), usdtAmount.toString());
        // redeem
        await dEther.redeem(dEtherAmount, {from: accounts[1]});
        let tx = await dWBTC.redeem(dWBTCAmount, {from: accounts[1]});
        await dUSDC.redeem(dUSDCAmount, {from: accounts[1]});
        await dUSDT.redeem(dUSDTAmount, {from: accounts[1]});
        dEtherAmount = await dEther.balanceOf(accounts[1]);
        dWBTCAmount = await dWBTC.balanceOf(accounts[1]);
        dUSDCAmount = await dUSDC.balanceOf(accounts[1]);
        dUSDTAmount = await dUSDT.balanceOf(accounts[1]);
        assert.equal(dEtherAmount, 0);
        assert.equal(dWBTCAmount, 0);
        assert.equal(dUSDCAmount, 0);
        assert.equal(dUSDTAmount, 0);
        dEtherDepositValue = await dEther.depositValue();
        dWBTCDepositValue = await dWBTC.depositValue();
        dUSDCDepositValue = await dUSDC.depositValue();
        dUSDTDepositValue = await dUSDT.depositValue();
        assert.equal(dEtherDepositValue, 0);
        assert.equal(dWBTCDepositValue, 0);
        assert.equal(dUSDCDepositValue, 0);
        assert.equal(dUSDTDepositValue, 0);
    });
});