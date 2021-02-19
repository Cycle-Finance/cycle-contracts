// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./DTokenInterface.sol";

abstract contract DToken is DTokenStorage {

    constructor(string memory name, string memory symbol)DTokenStorage(name, symbol) {}

    function mintInternal(uint mintAmount) internal nonReentrant returns (string memory){
        return "";
    }
}