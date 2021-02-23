// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "../Oracle.sol";
import "../interfaces/BorrowsInterface.sol";
import "../CycleStableCoin.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ComptrollerStorage is Ownable {

    //    IOracle public oracle;

    CycleStableCoin public CFSC;

    address public CFGT;

    /// @notice this should be DAF contract address
    address public publicBorrower;

    // supported dToken markets
    address[] public markets;

    BorrowsInterface public borrowPool;

    /// @dev market deposit
    /// @notice each block refresh market deposit only once
    /// @notice duplicate with borrowPool.accrualBlock
    uint public refreshedBlock;
    /// @notice deposit is represented by USD, and the value is exponential
    uint public totalDeposit;
    // market deposit is the weight of interest distribution and CFGT distribution
    // dTokenAddress => depositValue
    mapping(address => uint) marketDeposit;

    /// @dev interest distribution index
    // dTokenAddress => index
    mapping(address => uint) public marketInterestIndex;
    // dTokenAddress => userAddress => index
    mapping(address => mapping(address => uint)) public userInterestIndex;

    /// @dev used to distribute CFGT
    mapping(address => uint) public supplyIndex;
    // market => user => index
    mapping(address => mapping(address => uint)) public supplierIndex;
    // distribute CFGT to borrower
    uint public borrowDistributedBlock;
    uint public borrowIndex;
    mapping(address => uint) borrowerIndex;
    // user accrued CFGT
    mapping(address => uint) userAccrued;
    // CFGT distribution speed
    uint public supplySpeed;
    uint public borrowSpeed;

    /* system configure */
    // asset collateral factor, is exponential
    mapping(address => uint) collateralFactor;
    /// @notice totalDeposit * systemCollateralFactor >= totalBorrows
    uint public systemUtilizationRate;
    /// @notice multiplier used to calculate the maximum repayAmount when liquidating a borrow
    uint public maxCloseFactor;
    /// @notice multiplier representing the discount on collateral that a liquidator receives
    uint public liquidationIncentive;

    /* pause guardian */
    /// @notice redeem/repayBorrow cannot paused
    /// @notice liquidate/seize/transfer/borrow can only be paused globally
    mapping(address => bool) public mintPaused;
    bool public borrowPaused;
    bool public transferPaused;
    bool public seizePaused;

    constructor()Ownable(){}
}
