// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CycleStableCoin is ERC20, Ownable {

    /// @notice these address has permission to mint
    address public borrowPool;
    address public exchangePool;

    /// @notice preserve this field in case DAF has new requirements
    mapping(address => bool) public otherMinters;

    event SetMinter(address indexed minter, bool valid);

    /* modifier */
    modifier couldMint(){
        require(msg.sender == borrowPool || msg.sender == exchangePool || otherMinters[msg.sender]);
        _;
    }

    constructor()ERC20("Cycle Finance Stable Coin", "CFSC") Ownable(){

    }

    function setMinter(address _borrowPool, address _exchangePool) public onlyOwner {
        require(_borrowPool != address(0) && _exchangePool != address(0));
        borrowPool = _borrowPool;
        exchangePool = _exchangePool;
        emit SetMinter(_borrowPool, true);
        emit SetMinter(_exchangePool, true);
    }

    function setMinter(address otherMinter, bool valid) public onlyOwner {
        require(otherMinter != address(0));
        otherMinters[otherMinter] = valid;
        emit SetMinter(otherMinter, valid);
    }

    function mint(address to, uint amount) public couldMint {
        _mint(to, amount);
    }

    function burn(uint amount) public {
        _burn(msg.sender, amount);
    }
}
