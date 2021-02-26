// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "../Oracle.sol";

contract TestOracle is IOracle {
    mapping(address => uint) public price;

    function setPrice(address asset, uint _price) public {
        if (asset != address(0)) {
            uint expScale = 10 ** 18;
            uint decimals = Decimals(asset).decimals();
            _price = _price * expScale / (10 ** decimals);
        }
        price[asset] = _price;
    }

    function getPrice(address asset) public override view returns (uint){
        return price[asset];
    }
}
