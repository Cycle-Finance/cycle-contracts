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

// TODO: print some log while initialize, split these code to multi file

module.exports = async function (depolyer) {
    /* deploy suit contract */
    await depolyer.deploy(SimpleInterestRateModel, web3.utils.toWei('0.03'), web3.utils.toWei('0.5'));
    await depolyer.deploy(ExchangePool);
    await depolyer.deploy(CycleStableCoin);
    await depolyer.deploy(CycleGovToken);
    /* deploy test contract */
    await depolyer.deploy(TestOracle);
    await depolyer.deploy(USDC);
    await depolyer.deploy(USDT);
    await depolyer.deploy(WBTC);
    /* deploy logic contract */
    await depolyer.deploy(Comptroller);
    await depolyer.deploy(Borrows);
    await depolyer.deploy(DEther);
    let zeroAddress = '0x0000000000000000000000000000000000000000';
    await depolyer.deploy(DERC20, "Cycle Finance ERC20 Deposit Token", "DERC20", zeroAddress);
    /* deploy proxy contract */
    let emptyData = new Buffer('');
    await depolyer.deploy(ComptrollerProxy, Comptroller.address, emptyData);
    await depolyer.deploy(BorrowsProxy, Borrows.address, emptyData);
    let dEtherProxy = await dTokenProxy.new(
        "Cycle Finance WBTC Deposit Token", "dEther", zeroAddress, DEther.address, emptyData);
    let dWBTCProxy = await dTokenProxy.new(
        "Cycle Finance WBTC Deposit Token", "dWBTC", WBTC.address, DERC20.address, emptyData);
    let dUSDCProxy = await dTokenProxy.new(
        "Cycle Finance USDT Deposit Token", "dUSDC", USDC.address, DERC20.address, emptyData);
    let dUSDTProxy = await dTokenProxy.new(
        "Cycle Finance USDC Deposit Token", "dUSDT", USDT.address, DERC20.address, emptyData);
    /* initialize system*/
    // feed price, for test
    let oracle = await TestOracle.deployed();
    /// @notice normalize price by asset decimals
    await oracle.setPrice(zeroAddress, web3.utils.toWei('1902'));
    await oracle.setPrice(WBTC.address, web3.utils.toWei('51234'));
    await oracle.setPrice(USDC.address, web3.utils.toWei('1'));
    await oracle.setPrice(USDT.address, web3.utils.toWei('1.012')); // 1.012
    // initialize comptroller
    let comptroller = await Comptroller.at(ComptrollerProxy.address);
    await comptroller.initialize(CycleStableCoin.address, CycleGovToken.address, BorrowsProxy.address);
    // initialize borrow pool, 20% reserve
    let borrowPool = await Borrows.at(BorrowsProxy.address);
    await borrowPool.initialize(CycleStableCoin.address, SimpleInterestRateModel.address, ComptrollerProxy.address,
        ExchangePool.address, TestOracle.address, web3.utils.toWei('0.2'));
    // initialize dToken
    let dEther = await DEther.at(dEtherProxy.address);
    await dEther.initialize(TestOracle.address, ComptrollerProxy.address);
    let dWBTC = await DERC20.at(dWBTCProxy.address);
    await dWBTC.initialize(TestOracle.address, ComptrollerProxy.address);
    let dUSDC = await DERC20.at(dUSDCProxy.address);
    await dUSDC.initialize(TestOracle.address, ComptrollerProxy.address);
    let dUSDT = await DERC20.at(dUSDTProxy.address);
    await dUSDT.initialize(TestOracle.address, ComptrollerProxy.address);
    // register market
    await comptroller.registerMarket(dEther.address, web3.utils.toWei('0.75'));
    await comptroller.registerMarket(dWBTC.address, web3.utils.toWei('0.75'));
    await comptroller.registerMarket(dUSDC.address, web3.utils.toWei('0.75'));
    await comptroller.registerMarket(dUSDT.address, web3.utils.toWei('0.75'));
    // set CFGT approver
    let cfgt = await CycleGovToken.deployed();
    await cfgt.setApprover(comptroller.address, web3.utils.toWei('2050000'));
    // set CFSC minter
    let cfsc = await CycleStableCoin.deployed();
    await cfsc.methods['setMinter(address,address)'](borrowPool.address, ExchangePool.address);
    // config exchange pool
    let exchangePool = await ExchangePool.deployed();
    await exchangePool.setOracle(oracle.address);
    await exchangePool.setCFSC(cfsc.address);
    await exchangePool.setSupportedAsset(USDT.address, true);
    await exchangePool.setSupportedAsset(USDC.address, true);
}