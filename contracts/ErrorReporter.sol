// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

contract ErrorReporter {
    event Fail(string errMsg);

    function fail(string memory errMsg) public returns (string memory){
        emit Fail(errMsg);
        return errMsg;
    }
}
