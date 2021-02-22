// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./DToken.sol";

contract DEther is DToken {

    fallback() external payable {
        require(msg.value == 0, "this contract cannot receive ETH straightly");
    }

    constructor()DToken("Cycle Finance Ether Deposit Token", "dETH", address(0)){

    }

    function mint(uint amount) public payable returns (string memory){
        return mintInternal(amount);
    }

    function redeem(uint amount) public returns (string memory){
        return redeemInternal(amount);
    }

    function transferIn(address from, uint amount) internal override returns (uint){
        require(msg.sender == from);
        require(msg.value == amount);
        return msg.value;
    }

    function transferOut(address  payable to, uint amount) internal override {
        to.transfer(amount);
    }
}
