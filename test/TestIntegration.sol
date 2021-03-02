pragma solidity ^0.7.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Comptroller.sol";
import "../contracts/Borrows.sol";
import "../contracts/DEther.sol";
import "../contracts/DERC20.sol";
import "../contracts/CycleStableCoin.sol";
import "../contracts/CycleToken.sol";
import "../contracts/ExchangePool.sol";
import "../contracts/SimpleInterestRateModel.sol";
import "../contracts/test/TestOracle.sol";
import "../contracts/test/TestUSDC.sol";
import "../contracts/test/TestUSDT.sol";
import "../contracts/test/TestWBTC.sol";

contract TestIntegration {
    Comptroller comptroller;
    Borrows borrowPool;
    DEther dEther;
    DERC20 dWBTC;
    DERC20 dUSDC;
    DERC20 dUSDT;
    CycleStableCoin CFSC;
    CycleToken CFGT;
    ExchangePool exchangePool;
    SimpleInterestRateModel interestRateModel;
    TestOracle oracle;
    TestUSDC USDC;
    TestUSDT USDT;
    TestWBTC WBTC;

    function beforeAll(){

        USDC = TestUSDC(DeployedAddresses.TestUSDC());
        USDT = TestUSDC(DeployedAddresses.TestUSDT());
        WBTC = TestUSDC(DeployedAddresses.TestWBTC());

        comptroller = Comptroller(DeployedAddresses.ComptrollerProxy());

        borrowPool = Borrows(DeployedAddresses.BorrowsProxy());

    }
}
