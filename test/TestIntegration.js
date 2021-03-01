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

contract('Integration test', async (accounts) => {
    // we set cfgtSupplySpeed and cfgtBorrowSpeed so that system initialized
    it('set CFGT speed', async () => {
        let comptroller = await Comptroller.at(ComptrollerProxy.address);
        // 1 CFGT per block
        let speed = web3.utils.toWei('1');
        await comptroller.setSupplySpeed(speed);
        await comptroller.setBorrowSpeed(speed);
    });
});