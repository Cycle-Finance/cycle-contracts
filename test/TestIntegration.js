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

let wbtc, usdc, usdt, comptroller, dEther, dWBTC, dUSDC, dUSDT, CFGT, CFSC, borrowPool;

contract('Integration test', async (accounts) => {
    before(async () => {
        wbtc = await WBTC.deployed();
        usdc = await USDC.deployed();
        usdt = await USDT.deployed();
        comptroller = await Comptroller.at(ComptrollerProxy.address)
        dEther = await DEther.at(await comptroller.makrets(0));
        dWBTC = await DEther.at(await comptroller.makrets(1));
        dUSDC = await DEther.at(await comptroller.makrets(2));
        dUSDT = await DEther.at(await comptroller.makrets(3));
        CFGT = await CycleGovToken.deployed();
        CFSC = await CycleStableCoin.deployed();
        borrowPool = await Borrows.at(BorrowsProxy.address);
    });
    // transfer asset to other accounts
    it('prepare assets for other accounts', async () => {
        let wbtcAmount = 1000 * (10 ** 8);
        let usdAmount = 1000000 * (10 ** 6);
        wbtc.transfer(accounts[1], wbtcAmount);
        wbtc.transfer(accounts[2], wbtcAmount);
        wbtc.transfer(accounts[3], wbtcAmount);
        wbtc.transfer(accounts[4], wbtcAmount);
        usdc.transfer(accounts[1], usdAmount);
        usdc.transfer(accounts[2], usdAmount);
        usdc.transfer(accounts[3], usdAmount);
        usdc.transfer(accounts[4], usdAmount);
        usdt.transfer(accounts[1], usdAmount);
        usdt.transfer(accounts[2], usdAmount);
        usdt.transfer(accounts[3], usdAmount);
        usdt.transfer(accounts[4], usdAmount);
    });
    // we set cfgtSupplySpeed and cfgtBorrowSpeed so that system initialized
    it('set CFGT speed', async () => {
        // 1 CFGT per block
        let speed = web3.utils.toWei('1');
        await comptroller.setSupplySpeed(speed);
        await comptroller.setBorrowSpeed(speed);
    });
    // deposit, should check cfgt supply index
    it('accounts[0] deposit', async () => {
        let refreshedBlockBefore = await comptroller.refreshedBlock();
        // deposit ether
        let accountCFGTBalanceBefore = await CFGT.balanceOf(accounts[0]);
        let accountCFSCBalanceBefore = await CFSC.balanceOf(accounts[0]);
        let interestIndexBefore = await comptroller.marketInterestIndex(dEther.address);
        let supplyIndexBefore = await comptroller.supplyIndex(dEther.address);
        let etherAmount = web3.utils.toWei('10');
        await dEther.mint(etherAmount, {value: etherAmount});

    });
});

async function comptrollerState() {
    // let cfsc = await comptroller.CFSC();
    // let cfgt = await comptroller.CFGT();
    let publicBorrower = await comptroller.publicBorrower();
    let borrowPool = await comptroller.borrowPool();
    let refreshedBlock = await comptroller.refreshedBlock();
    let totalDeposit = await comptroller.totalDeposit();
    let borrowDistributedBlock = await comptroller.borrowDistributedBlock();
    let borrowIndex = await comptroller.borrowIndex();
    let supplySpeed = await comptroller.supplySpeed();
    let borrowSpeed = await comptroller.borrowSpeed();
    let systemUtilizationRate = await comptroller.systemUtilizationRate();
    let maxCloseFactor = await comptroller.maxCloseFactor();
    let liquidationIncentive = await comptroller.liquidationIncentive();
    let borrowPaused = await comptroller.borrowPaused();
    let transferPaused = await comptroller.transferPaused();
    let seizePaused = await comptroller.seizePaused();
    return {
        publicBorrower: publicBorrower,
        borrowPool: borrowPool,
        refreshedBlock: refreshedBlock,
        totalDeposit: totalDeposit,
        borrowDistributedBlock: borrowDistributedBlock,
        borrowIndex: borrowIndex,
        supplySpeed: supplySpeed,
        borrowSpeed: borrowSpeed,
        systemUtilizationRate: systemUtilizationRate,
        maxCloseFactor: maxCloseFactor,
        liquidationIncentive: liquidationIncentive,
        borrowPaused: borrowPaused,
        transferPaused: transferPaused,
        seizePaused: seizePaused,
    };
}

async function borrowPoolState() {
    let interestRateModel = borrowPool.interestRateModel();
    let comptroller = borrowPool.comptroller();
    let exchangePool = borrowPool.exchangePool();
    let oracle = borrowPool.oracle();
    let reserveFactor = borrowPool.reserveFactor();
    let borrowIndex = borrowPool.borrowIndex();
    let accrualBlock = borrowPool.accrualBlock();
    let totalBorrows = borrowPool.totalBorrows();
    return {
        interestRateModel: interestRateModel,
        comptroller: comptroller,
        exchangePool: exchangePool,
        oracle: oracle,
        reserveFactor: reserveFactor,
        borrowIndex: borrowIndex,
        accrualBlock: accrualBlock,
        totalBorrows: totalBorrows
    };
}

async function accountAssetState(account) {
    let etherBalance = await web3.eth.getBalance(account);
    let wbtcBalance = await wbtc.balanceOf(account);
    let usdcBalance = await usdc.balanceOf(account);
    let usdtBalance = await usdt.balanceOf(account);
    let dEtherBalance = await dEther.balanceOf(account);
    let dWBTCBalance = await dWBTC.balanceOf(account);
    let dUSDCBalance = await dUSDC.balanceOf(account);
    let dUSDTBalance = await dUSDT.balanceOf(account);
    let cfgtBalance = await CFGT.balanceOf(account);
    let cfscBalance = await CFSC.balanceOf(account);
    return {
        etherBalance: etherBalance,
        wbtcBalance: wbtcBalance,
        usdcBalance: usdcBalance,
        usdtBalance: usdtBalance,
        dEtherBalance: dEtherBalance,
        dWBTCBalance: dWBTCBalance,
        dUSDCBalance: dUSDCBalance,
        dUSDTBalance: dUSDTBalance,
        cfgtBalance: cfgtBalance,
        cfscBalance: cfscBalance,
    };
}

async function marketComptrollerState(marketAddress) {
    let marketDeposit = await comptroller.marketDeposit(marketAddress);
    let marketInterestIndex = await comptroller.marketInterestIndex(marketAddress);
    let supplyIndex = await comptroller.supplyIndex(marketAddress);
    let collateralFactor = await comptroller.collateralFactor(marketAddress);
    let mintPaused = await comptroller.mintPaused(marketAddress);
    return {
        marketDeposit: marketDeposit,
        marketInterestIndex: marketInterestIndex,
        supplyIndex: supplyIndex,
        collateralFactor: collateralFactor,
        mintPaused: mintPaused,
    };
}

async function marketAccountComptrollerState(marketAddress, account) {
    let userInterestIndex = await comptroller.userInterestIndex(marketAddress, account);
    let supplierIndex = await comptroller.supplierIndex(marketAddress, account);
    let borrowerIndex = await comptroller.borrowerIndex(marketAddress, account);
    let userAccrued = await comptroller.userAccrued(marketAddress, account);
    return {
        userInterestIndex: userInterestIndex,
        supplierIndex: supplierIndex,
        borrowerIndex: borrowerIndex,
        userAccrued: userAccrued,
    };
}