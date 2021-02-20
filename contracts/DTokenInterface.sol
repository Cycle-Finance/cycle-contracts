// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./ComptrollerInterface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DTokenStorage is ERC20, Ownable {
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
}

interface DTokenInterface {
    function isDToken() external view returns (bool);

    // return the value of underlying asset, represented by USD, the value is exponential
    function deposit() external view returns (uint);
    // return the value of the balance of user underlying asset, represented by USD, the value is exponential
    function userDeposit(address account) external view returns (uint);
    // return the value of the specified number of token, the value is exponential
    function tokenValue(uint amount) external view returns (uint);
    // return the number of token that value equals `value`, the value is scalar
    function tokenAmount(uint value) external view returns (uint);
}