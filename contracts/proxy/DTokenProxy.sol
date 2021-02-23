// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/proxy/UpgradeableProxy.sol";
import "../storage/DTokenStorage.sol";

contract DTokenProxy is DTokenStorage, UpgradeableProxy {

    constructor(string memory name, string memory symbol, address _underlyingAsset, address _logic, bytes memory _data)
    DTokenStorage(name, symbol, _underlyingAsset) UpgradeableProxy(_logic, _data) {}

    function implementation() public view returns (address){
        return _implementation();
    }

    function upgradeTo(address logic, bytes memory data) public onlyOwner {
        _upgradeTo(logic);
        if (data.length > 0) {
            Address.functionDelegateCall(logic, data);
        }
    }
}
