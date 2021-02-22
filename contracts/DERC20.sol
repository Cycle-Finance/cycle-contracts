// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./DToken.sol";
import "./SafeERC20.sol";

contract DERC20 is DToken {

    using SafeERC20 for address;

    constructor(string memory name, string memory symbol, address _underlyingAsset)
    DToken(name, symbol, _underlyingAsset){

    }

    function mint(uint amount) public returns (string memory){
        return mintInternal(amount);
    }

    function redeem(uint amount) public returns (string memory){
        return redeemInternal(amount);
    }

    function transferIn(address from, uint amount) internal override returns (uint){
        require(underlyingAsset.safeTransferFrom(from, address(this), amount));
        return amount;
    }

    function transferOut(address  payable to, uint amount) internal override {
        require(underlyingAsset.safeTransfer(to, amount));
    }
}
