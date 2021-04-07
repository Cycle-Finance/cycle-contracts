// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "../interfaces/ComptrollerInterface.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../ErrorReporter.sol";
import "../Oracle.sol";

abstract contract DTokenStorage is Ownable, ErrorReporter {
    mapping(address => uint256) public balanceOf;

    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public totalSupply;

    string public name;
    string public symbol;
    uint8 public decimals;

    // uint constant public EXCHANGE_RATE = 1;

    bool constant public isDToken = true;

    // ether address is 0
    address public underlyingAsset;

    IOracle public oracle;

    /// @dev comptroller
    ComptrollerInterface public comptroller;

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

    constructor(string memory _name, string memory _symbol, address _underlyingAsset)Ownable(){
        name = _name;
        symbol = _symbol;
        // check underlying is erc20
        if (_underlyingAsset != address(0)) {
            require(IERC20(_underlyingAsset).balanceOf(address(this)) >= 0, "illegal erc20 underlying asset");
            decimals = uint8(Decimals(_underlyingAsset).decimals());
        } else {
            // eth decimals
            decimals = 18;
        }
        underlyingAsset = _underlyingAsset;
        _notEntered = true;
    }
}
