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
const Oracle = artifacts.require("TestOracle");
const USDC = artifacts.require("TestUSDC");
const USDT = artifacts.require("TestUSDT");
const WBTC = artifacts.require("TestWBTC");

module.exports = async function (depolyer) {
    /* deploy suit contract */
    depolyer.deploy(SimpleInterestRateModel, 3 * (10 ** 16), 5 * (10 ** 17));
    depolyer.deploy(ExchangePool);
    depolyer.deploy(CycleStableCoin);
    depolyer.deploy(CycleGovToken);
    /* deploy test contract */
    depolyer.deploy(Oracle);
    depolyer.deploy(USDC);
    depolyer.deploy(USDT);
    depolyer.deploy(WBTC);
    /* deploy logic contract */
    depolyer.deploy(Comptroller);
    depolyer.deploy(Borrows);
    depolyer.deploy(DEther);
    let zeroAddress = '';
    depolyer.deploy(DERC20, "Cycle Finance ERC20 Deposit Token", "DERC20", zeroAddress);
    /* deploy proxy contract */
    let emptyData = new Buffer('');
    depolyer.deploy(ComptrollerProxy, Comptroller.address, emptyData);
    depolyer.deploy(BorrowsProxy, Borrows.address, emptyData);
    let dEtherProxy = await dTokenProxy.new(
        "Cycle Finance WBTC Deposit Token", "dWBTC", zeroAddress, DEther.address, emptyData);
    let dWBTCProxy = await dTokenProxy.new(
        "Cycle Finance WBTC Deposit Token", "dWBTC", WBTC.address, DERC20.address, emptyData);
    let dUSDCProxy = await dTokenProxy.new(
        "Cycle Finance USDT Deposit Token", "dUSDC", USDC.address, DERC20.address, emptyData);
    let dUSDTProxy = await dTokenProxy.new(
        "Cycle Finance USDC Deposit Token", "dUSDT", USDT.address, DERC20.address, emptyData);
    /* initialize system*/
    // feed price, for test
    await Oracle.setPrice(zeroAddress, 1902 * (10 ** 18));
    await Oracle.setPrice(WBTC.address, 51234 * (10 ** 18));
    await Oracle.setPrice(USDC.address, 10 ** 18);
    await Oracle.setPrice(USDT.address, 1012 * (10 ** 15)); // 1.012
    // initialize borrow pool, 20% reserve
    let borrowPool = await Borrows.at(BorrowsProxy.address);
    await borrowPool.initialize(CycleStableCoin.address, SimpleInterestRateModel.address, ComptrollerProxy.address,
        ExchangePool.address, Oracle.address, 2 * (10 ** 17));
    // initialize comptroller
    let comptroller = await Comptroller.at(ComptrollerProxy.address);
    comptroller.initialize(CycleStableCoin.address, CycleGovToken.address, BorrowsProxy.address);
    // initialize dToken
    let dEther = await DEther.at(dEtherProxy.address);
    dEther.initialize(Oracle.address, ComptrollerProxy.address);
    let dWBTC = await DERC20.at(dWBTCProxy.address);
    dWBTC.initialize(Oracle.address, ComptrollerProxy.address);
    let dUSDC = await DERC20.at(dUSDCProxy.address);
    dUSDC.initialize(Oracle.address, ComptrollerProxy.address);
    let dUSDT = await DERC20.at(dUSDTProxy.address);
    dUSDT.initialize(Oracle.address, ComptrollerProxy.address);
    // register market
    comptroller.registerMarket(dEther.address, 75 * (10 ** 16));
    comptroller.registerMarket(dWBTC.address, 75 * (10 ** 16));
    comptroller.registerMarket(dUSDC.address, 75 * (10 ** 16));
    comptroller.registerMarket(dUSDT.address, 75 * (10 ** 16));
    // system config, 100 CFGT per block, for test
    comptroller.setSupplySpeed();
    comptroller.setBorrowSpeed();
}