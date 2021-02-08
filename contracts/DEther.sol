// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./DToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DEther is DToken, ERC20 {

    fallback() external payable {
        _mint(msg.sender, msg.value);
    }

    constructor()ERC20("Blockchain Development Bank Ether Deposit Token", "dETH"){

    }


}
