const BN = require('bn.js');
const web3 = require('web3');
const Comptroller = artifacts.require("Comptroller");
const Borrows = artifacts.require("Borrows");
const DERC20 = artifacts.require("DERC20");
const DEther = artifacts.require("DEther");
const ComptrollerProxy = artifacts.require("ComptrollerProxy");
const BorrowsProxy = artifacts.require("BorrowsProxy");

const ExchangePool = artifacts.require("ExchangePool");
const CycleStableCoin = artifacts.require("CycleStableCoin");

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
        borrowPool = await Borrows.at(BorrowsProxy.address);
        // check supply speed
        let supplySpeed = web3.utils.toWei('1');
        await comptroller.setSupplySpeed(supplySpeed);
        let newSupplySpeed = await comptroller.supplySpeed();
        assert.equal(newSupplySpeed, supplySpeed);
        await comptroller.setSupplySpeed(0);
        // check borrow speed
        let borrowSpeed = supplySpeed;
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
        await comptroller.setMaxSystemUtilizationRate(sysUR);
        let newSysUR = await comptroller.maxSystemUtilizationRate();
        assert.equal(sysUR, newSysUR);
        await comptroller.setMaxSystemUtilizationRate(web3.utils.toWei('0.75'));
        // check max close factor
        let maxCloseFactor = web3.utils.toWei('0.75');
        await comptroller.setMaxCloseFactor(maxCloseFactor);
        let newMaxCloseFactor = await comptroller.maxCloseFactor();
        assert.equal(newMaxCloseFactor, maxCloseFactor);
        await comptroller.setMaxCloseFactor(web3.utils.toWei('0.8'));
        // check liquidation incentive
        let liquidationIncentive = web3.utils.toWei('1.1');
        await comptroller.setLiquidationIncentive(liquidationIncentive);
        let newLiquidationIncentive = await comptroller.liquidationIncentive();
        assert.equal(liquidationIncentive, newLiquidationIncentive);
        await comptroller.setLiquidationIncentive(web3.utils.toWei('1.08'));
        // check reserve factor
        let reserveFactor = web3.utils.toWei('0.3');
        await comptroller.setReserveFactor(reserveFactor);
        let newReserveFactor = await borrowPool.reserveFactor();
        assert.equal(reserveFactor, newReserveFactor);
        await comptroller.setReserveFactor(web3.utils.toWei('0.2'));
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
        // TODO: approve and transfer from
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
    it('borrow pool interface test', async () => {
        let comptroller = await Comptroller.at(ComptrollerProxy.address);
        let dEtherAddr = await comptroller.markets(0);
        let dEther = await DEther.at(dEtherAddr);
        let etherAmount = web3.utils.toWei('10');
        let oracle = await TestOracle.deployed();
        // set eth price is $2000
        await oracle.setPrice(zeroAddress, web3.utils.toWei('2000'));
        // deposit 10 ETH
        await dEther.mint(etherAmount, {value: etherAmount});
        // borrow $10000
        let borrowPool = await Borrows.at(BorrowsProxy.address);
        let initBorrowIndex = await borrowPool.borrowIndex();
        let initAccountBorrows = await borrowPool.getBorrows(accounts[0]);
        let initTotalBorrows = await borrowPool.totalBorrows();
        let borrowPrincipal = web3.utils.toWei('10000');
        await borrowPool.borrow(borrowPrincipal);
        let accountBorrows = await borrowPool.getBorrows(accounts[0]);
        let totalBorrows = await borrowPool.totalBorrows();
        let borrowIndex = await borrowPool.borrowIndex();
        assert.equal(accountBorrows.toString(), totalBorrows.toString());
        assert.ok(accountBorrows > initAccountBorrows);
        assert.ok(borrowIndex > initBorrowIndex);
        assert.ok(totalBorrows > initTotalBorrows);
        let cfsc = await CycleStableCoin.deployed();
        let cfscBalance = await cfsc.balanceOf(accounts[0]);
        assert.equal(cfscBalance.toString(), borrowPrincipal.toString());
        // check other interface, so that block chain increase
        // set oracle and comptroller
        let newOracle = await TestOracle.new();
        let newComptroller = await ComptrollerProxy.new(Comptroller.address, emptyData);
        await borrowPool.setOracle(newOracle.address);
        await borrowPool.setComptroller(newComptroller.address);
        let contractOracle = await borrowPool.oracle();
        let contractComptroller = await borrowPool.comptroller();
        assert.equal(newOracle.address, contractOracle);
        assert.equal(newComptroller.address, contractComptroller);
        await borrowPool.setOracle(TestOracle.address);
        await borrowPool.setComptroller(ComptrollerProxy.address);
        // supported SC
        await borrowPool.setSupportedSC(USDT.address, true);
        await borrowPool.setSupportedSC(USDC.address, true);
        let usdcSupport = await borrowPool.supportedSC(USDC.address);
        let usdtSupport = await borrowPool.supportedSC(USDT.address);
        assert.ok(usdcSupport);
        assert.ok(usdtSupport);
        // use USDC to repay 1/3 borrows
        accountBorrows = await borrowPool.getBorrows(accounts[0])
        let repayAmount = accountBorrows.divn(new BN('3'));
        let usdc = await USDC.deployed();
        let usdcInitBalance = await usdc.balanceOf(accounts[0]);
        await usdc.approve(borrowPool.address, repayAmount);
        await borrowPool.repayBorrow(usdc.address, repayAmount);
        accountBorrows = await borrowPool.getBorrows(accounts[0]);
        let usdcAfterBalance = await usdc.balanceOf(accounts[0]);
        // usdc price is $1, so repay 1000 * 10**6 / 3
        let usdcRepayAmount = Math.floor(repayAmount / (10 ** 12));
        assert.equal(usdcInitBalance - usdcAfterBalance, usdcRepayAmount);
        // because there is one block to accrue interest
        assert.ok(accountBorrows / 2 > repayAmount);
        // use USDT to repay 1/3 borrows behalf
        let usdt = await USDT.deployed();
        await usdt.transfer(accounts[1], 10000 * (10 ** 6));
        let usdtInitBalance = await usdt.balanceOf(accounts[1]);
        await usdt.approve(borrowPool.address, repayAmount, {from: accounts[1]});
        await borrowPool.repayBorrowBehalf(usdt.address, accounts[0], repayAmount, {from: accounts[1]});
        accountBorrows = await borrowPool.getBorrows(accounts[0]);
        let usdtAfterBalance = await usdt.balanceOf(accounts[1]);
        // usdt price > $1 usdtInitBalance - usdtAfterBalance should less than usdcRepayAmount
        // but usdt&usdc decimals is 6, is far less than 18
        assert.ok(usdtInitBalance - usdtAfterBalance < usdcRepayAmount);
        // because there is one block to accrue interest
        assert.ok(accountBorrows > repayAmount);
        // check exchange pool
        let exchangePool = await ExchangePool.deployed();
        let epUSDCBalance = await usdc.balanceOf(exchangePool.address);
        let epUSDTBalance = await usdt.balanceOf(exchangePool.address);
        assert.equal(usdcInitBalance - usdcAfterBalance, epUSDCBalance);
        assert.equal(usdtInitBalance - usdtAfterBalance, epUSDTBalance);
        // we change ether price to decrease account liquidity
        await oracle.setPrice(zeroAddress, web3.utils.toWei('400'));
        // make price change effect
        await comptroller.refreshMarketDeposit();
        let sysLiquidity = await comptroller.getSystemLiquidity();
        assert.equal(sysLiquidity[1], 0);
        assert.ok(sysLiquidity[2] > 0);
        let accountLiquidity = await comptroller.getAccountLiquidity(accounts[0]);
        totalBorrows = await borrowPool.totalBorrows();
        accountBorrows = await borrowPool.getBorrows(accounts[0]);
        // the method of accountBorrows calculation has some tiny precision errors
        assert.ok(totalBorrows >= accountBorrows);
        assert.equal(accountLiquidity[1], 0);
        assert.ok(sysLiquidity[2] >= accountLiquidity[2]);
        // liquidate, use USDT to repay borrow
        let liquidateAmount = web3.utils.toWei('2600');
        let borrowerDEtherAmount = dEther.balanceOf(accounts[0]);
        let liquidatorDEtherAmount = dEther.balanceOf(accounts[1]);
        await borrowPool.liquidateBorrow(usdt.address, dEther.address, accounts[0], liquidateAmount,
            {from: accounts[1]});
        let usdtBalanceAfterLiquidate = await usdt.balanceOf(accounts[1]);
        let epUSDTBalanceAfterLiquidate = await usdt.balanceOf(exchangePool.address);
        let accountBorrowsAfterLiquidate = await borrowPool.getBorrows(accounts[0]);
        assert.equal((epUSDTBalanceAfterLiquidate - epUSDTBalance).toString(),
            (usdtAfterBalance - usdtBalanceAfterLiquidate).toString());
        assert.ok((usdtAfterBalance - usdtBalanceAfterLiquidate) <
            (accountBorrows - accountBorrowsAfterLiquidate) / (10 ** 12));
        sysLiquidity = await comptroller.getSystemLiquidity()
        assert.ok(sysLiquidity[1] > 0);
        assert.equal(sysLiquidity[2].toNumber(), 0);
        accountLiquidity = await comptroller.getAccountLiquidity(accounts[0]);
        assert.ok(sysLiquidity[1] >= accountLiquidity[1]);
        assert.equal(accountLiquidity[2], 0);
        // check dToken amount after liquidate
        let borrowerDEtherAmountAfter = dEther.balanceOf(accounts[0]);
        let liquidatorDEtherAmountAfter = dEther.balanceOf(accounts[1]);
        assert.equal((borrowerDEtherAmount - borrowerDEtherAmountAfter).toString(),
            (liquidatorDEtherAmountAfter - liquidatorDEtherAmount).toString());
        // use CFSC repay whole borrows
        let maxUint256 = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
        cfsc.approve(borrowPool.address, maxUint256);
        await borrowPool.repayBorrow(cfsc.address, maxUint256);
        accountBorrows = await borrowPool.getBorrows(accounts[0]);
        assert.equal(accountBorrows.toNumber(), 0);
        accountLiquidity = await comptroller.getAccountLiquidity(accounts[0]);
        assert.ok(accountLiquidity[1] > 0);
        assert.equal(accountLiquidity[2], 0);
    });
    it('claim profit from comptroller', async () => {
        let comptroller = await Comptroller.at(ComptrollerProxy.address);
        let users = [accounts[0], accounts[1]];
        let markets = [
            await comptroller.markets(0),
            await comptroller.markets(1),
            await comptroller.markets(2),
            await comptroller.markets(3),
        ];
        await comptroller.claimAllProfit(users);
        await comptroller.claimInterest(markets, users);
        await comptroller.claimSupplierCFGT(markets, users);
        await comptroller.claimBorrowerCFGT(users);
    });
});