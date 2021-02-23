// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "../Oracle.sol";

contract TestOracle is IOracle {
    mapping(address => uint) public price;

    function setPrice(address asset, uint _price) public {
        price[asset] = _price;
    }

    function getPrice(address asset) public override view returns (uint){
        return price[asset];
    }
}
