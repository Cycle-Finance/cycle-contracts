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

const Oracle = artifacts.require('Oracle');

/* test only, will be replaced at maninnet*/
const TestOracle = artifacts.require("TestOracle");
const USDC = artifacts.require("TestUSDC");
const USDT = artifacts.require("TestUSDT");
const WBTC = artifacts.require("TestWBTC");

const zeroAddress = '0x0000000000000000000000000000000000000000';

module.exports = async function (depolyer, network) {
    let oracle;
    let wbtc, usdc, usdt;
    if (network === "develop") {
        console.log('deploy test contract at network {develop}');
        /* deploy test contract */
        await depolyer.deploy(TestOracle);
        await depolyer.deploy(USDC);
        await depolyer.deploy(USDT);
        await depolyer.deploy(WBTC);
        oracle = await TestOracle.deployed();
        wbtc = await WBTC.deployed();
        usdc = await USDC.deployed();
        usdt = await USDT.deployed();
        // feed price, for test
        /// @notice normalize price by asset decimals
        await oracle.setPrice(zeroAddress, web3.utils.toWei('1902'));
        await oracle.setPrice(wbtc.address, web3.utils.toWei('51234'));
        await oracle.setPrice(usdc.address, web3.utils.toWei('1'));
        await oracle.setPrice(usdt.address, web3.utils.toWei('1.012')); // 1.012
    } else if (network === "testnet") {
        console.log('deploy test contract at network {testnet}');
        /* deploy test contract */
        // use chainlink oracle
        await depolyer.deploy(Oracle);
        await depolyer.deploy(USDC);
        await depolyer.deploy(USDT);
        await depolyer.deploy(WBTC);
        oracle = await Oracle.deployed();
        wbtc = await WBTC.deployed();
        usdc = await USDC.deployed();
        usdt = await USDT.deployed();
        await oracle.registerOracle(zeroAddress, '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526');
        await oracle.registerOracle(wbtc.address, '0x5741306c21795FdCBb9b265Ea0255F499DFe515C');
        await oracle.registerOracle(usdc.address, '0x90c069C4538adAc136E051052E14c1cD799C41B7');
        await oracle.registerOracle(usdt.address, '0xEca2605f0BCF2BA5966372C99837b1F182d3D620');
    } else {
        throw new Error('unsupported network');
    }
    /* deploy suit contract */
    await depolyer.deploy(SimpleInterestRateModel, web3.utils.toWei('0.03'), web3.utils.toWei('0.5'));
    await depolyer.deploy(ExchangePool);
    await depolyer.deploy(CycleStableCoin);
    await depolyer.deploy(CycleGovToken);
    /* deploy logic contract */
    await depolyer.deploy(Comptroller);
    await depolyer.deploy(Borrows);
    await depolyer.deploy(DEther);
    await depolyer.deploy(DERC20, "Cycle Finance ERC20 Deposit Token", "DERC20", zeroAddress);
    /* deploy proxy contract */
    let emptyData = new Buffer('');
    await depolyer.deploy(ComptrollerProxy, Comptroller.address, emptyData);
    await depolyer.deploy(BorrowsProxy, Borrows.address, emptyData);
    let dEtherProxy = await dTokenProxy.new(
        "Cycle Finance ETH Deposit Token", "dEther", zeroAddress, DEther.address, emptyData);
    let dWBTCProxy = await dTokenProxy.new(
        "Cycle Finance WBTC Deposit Token", "dWBTC", wbtc.address, DERC20.address, emptyData);
    let dUSDCProxy = await dTokenProxy.new(
        "Cycle Finance USDC Deposit Token", "dUSDC", usdc.address, DERC20.address, emptyData);
    let dUSDTProxy = await dTokenProxy.new(
        "Cycle Finance USDT Deposit Token", "dUSDT", usdt.address, DERC20.address, emptyData);
    /* initialize system*/
    // initialize comptroller
    let comptroller = await Comptroller.at(ComptrollerProxy.address);
    await comptroller.initialize(CycleStableCoin.address, CycleGovToken.address, BorrowsProxy.address);
    // initialize borrow pool, 20% reserve
    let borrowPool = await Borrows.at(BorrowsProxy.address);
    await borrowPool.initialize(CycleStableCoin.address, SimpleInterestRateModel.address, ComptrollerProxy.address,
        ExchangePool.address, oracle.address, web3.utils.toWei('0.2'));
    // initialize dToken
    let dEther = await DEther.at(dEtherProxy.address);
    await dEther.initialize(oracle.address, ComptrollerProxy.address);
    let dWBTC = await DERC20.at(dWBTCProxy.address);
    await dWBTC.initialize(oracle.address, ComptrollerProxy.address);
    let dUSDC = await DERC20.at(dUSDCProxy.address);
    await dUSDC.initialize(oracle.address, ComptrollerProxy.address);
    let dUSDT = await DERC20.at(dUSDTProxy.address);
    await dUSDT.initialize(oracle.address, ComptrollerProxy.address);
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
    await exchangePool.setSupportedAsset(usdt.address, true);
    await exchangePool.setSupportedAsset(usdc.address, true);
    // set CFGT distribution speed, 10 CFGT per block
    let speed = web3.utils.toWei('10');
    await comptroller.setSupplySpeed(speed);
    await comptroller.setBorrowSpeed(speed);
}