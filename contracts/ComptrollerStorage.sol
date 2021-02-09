// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "./Oracle.sol";
import "./BorrowsInterface.sol";

contract ComptrollerStorage {

    Oracle public oracle;

    address public CFSC;

    address public CFGT;

    /// @notice this should be DAF contract address
    address public publicBorrower;

    // supported dToken markets
    address[] public markets;

    BorrowsInterface public borrowPool;

    /// @dev market deposit
    /// @notice deposit is represented by USD, and the value is Exp, not scalar
    uint public totalDeposit;
    // market deposit is the weight of interest distribution and CFGT distribution
    // dTokenAddress => depositValue
    mapping(address => uint) marketDeposit;

    /// @dev interest distribution index
    // dTokenAddress => index
    // TODO: initialize this value as doubleScale while register market
    mapping(address => uint) public marketInterestIndex;
    // dTokenAddress => userAddress => index
    mapping(address => mapping(address => uint)) public userInterestIndex;

    /// @dev used to distribute CFGT
    // distribute CFGT to supplier
    uint public supplyDistributedBlock;
    mapping(address => uint) public supplyIndex;
    mapping(address => mapping(address => uint)) public supplierIndex;
    // distribute CFGT to borrower
    uint public borrowDistributedBlock;
    uint public borrowIndex;
    mapping(address => uint) borrowerIndex;
    // CFGT distribution speed
    uint public supplySpeed;
    uint public borrowSpeed;
}
