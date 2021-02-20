// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./ComptrollerInterface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ErrorReporter.sol";
import "./Oracle.sol";

abstract contract DTokenStorage is ERC20, Ownable, ErrorReporter {

    // uint constant public EXCHANGE_RATE = 1;

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

    function transferOut(address to, uint amount) internal virtual returns (uint);
}

interface DTokenInterface {
    function isDToken() external view returns (bool);

    /* user interface */
    function mint(uint amount) external returns (string memory);

    function redeem(uint amount) external returns (string memory);

    function seize(address liquidator, address borrower, uint amount) external returns (string memory);

    /* view interface */
    // return the value of underlying asset, represented by USD, the value is exponential
    function depositValue() external view returns (uint);
    // return the value of the balance of user underlying asset, represented by USD, the value is exponential
    function userDepositValue(address account) external view returns (uint);
    // return the value of the specified number of token, the value is exponential
    function tokenValue(uint amount) external view returns (uint);
    // return the number of token that value equals `value`, the value is scalar
    function tokenAmount(uint value) external view returns (uint);
}