// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/proxy/UpgradeableProxy.sol";
import "../storage/ComptrollerStorage.sol";

contract ComptrollerProxy is ComptrollerStorage, UpgradeableProxy {

    constructor(address _logic, bytes memory _data)
    ComptrollerStorage() UpgradeableProxy(_logic, _data) {}

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
