// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "../CycleStableCoin.sol";
import "../interfaces/InterestRateModel.sol";

contract BorrowsStorage {

    CycleStableCoin public CFSC;

    InterestRateModel public interestRateModel;

    /// @notice DAF profit
    uint public reserves;

    /// @notice latest utilization rate
    uint public utilizationRate;

    uint public borrowIndex; // global borrow index
    uint public accrualBlock; // the height of last accrued interest
    uint public totalBorrows;

    struct AccountBorrowSnapshot {
        uint index;
        uint borrows;
    }

    mapping(address => AccountBorrowSnapshot) accountBorrows;
}
