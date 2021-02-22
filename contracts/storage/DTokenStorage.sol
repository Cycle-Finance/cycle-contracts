// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "../interfaces/ComptrollerInterface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../ErrorReporter.sol";
import "../Oracle.sol";

abstract contract DTokenStorage is ERC20, Ownable, ErrorReporter {

    // uint constant public EXCHANGE_RATE = 1;

    bool constant public isDToken = true;

    // ether address is 0
    address public underlyingAsset;

    IOracle public oracle;

    /**
     * @dev Guard variable for re-entrancy checks
     */
    bool internal _notEntered;

    /// @dev comptroller
    ComptrollerInterface public comptroller;

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

    constructor(string memory name, string memory symbol)ERC20(name, symbol) Ownable(){}

    function transferIn(address from, uint amount) internal virtual returns (uint);

    function transferOut(address payable to, uint amount) internal virtual;
}