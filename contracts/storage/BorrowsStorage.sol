// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "../CycleStableCoin.sol";
import "../interfaces/InterestRateModel.sol";
import "../interfaces/ComptrollerInterface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BorrowsStorage is Ownable {

    CycleStableCoin public CFSC;

    InterestRateModel public interestRateModel;

    ComptrollerInterface public comptroller;

    address public exchangePool;

    /// @notice other supported stable Coin
    mapping(address => bool) public supportedSC;

    /// @notice DAF profit
    uint public reserves;

    uint public reserveFactor;

    /// @notice latest utilization rate
    uint public utilizationRate;

    uint public borrowIndex; // global borrow index
    uint public accrualBlock; // the height of last accrued interest
    uint public totalBorrows;

    struct AccountBorrowSnapshot {
        uint index;
        uint borrows;
    }
    /**
     * @dev Guard variable for re-entrancy checks
     */
    bool internal _notEntered;

    /*** Reentrancy Guard ***/

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     */
    modifier nonReentrant() {
        require(_notEntered, "re-entered");
        _notEntered = false;
        _;
        _notEntered = true;
    }

    modifier onlyComptroller(){
        require(msg.sender == address(comptroller), "only comptroller");
        _;
    }

    mapping(address => AccountBorrowSnapshot) accountBorrows;

    constructor()Ownable(){
        accrualBlock = block.number;
    }
}
