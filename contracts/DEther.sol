// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./DToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

abstract contract DEther is DToken {

    fallback() external payable {
        _mint(msg.sender, msg.value);
    }

    constructor()DToken("Blockchain Development Bank Ether Deposit Token", "dETH"){

    }


}
