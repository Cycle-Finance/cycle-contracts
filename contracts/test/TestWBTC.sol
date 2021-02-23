// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestWBTC is ERC20 {

    constructor()ERC20("Wrapped Bitcoin", "WBTC"){
        uint8 decimals = 8;
        _mint(msg.sender, 21000000 * (10 ** decimals));
        _setupDecimals(decimals);
    }
}
