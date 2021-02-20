// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./DTokenInterface.sol";
import "./math/Exponential.sol";

abstract contract DToken is DTokenStorage, Exponential {

    constructor(string memory name, string memory symbol)DTokenStorage(name, symbol) {}

    function mintInternal(uint mintAmount) internal nonReentrant returns (string memory){
        string memory errMsg = comptroller.mintAllowed(address(this), msg.sender, mintAmount);
        if (bytes(errMsg).length != 0) {
            emit Fail(errMsg);
            return errMsg;
        }
        transferIn(msg.sender, mintAmount);
        _mint(msg.sender, mintAmount);
        errMsg = comptroller.mintVerify(address(this), msg.sender, mintAmount);
        if (bytes(errMsg).length != 0) {
            emit Fail(errMsg);
        }
        return errMsg;
    }

    function redeemInternal(uint redeemAmount) internal nonReentrant returns (string memory){
        string memory errMsg = comptroller.redeemAllowed(address(this), msg.sender, redeemAmount);
        if (bytes(errMsg).length != 0) {
            emit Fail(errMsg);
            return errMsg;
        }
        _burn(msg.sender, redeemAmount);
        transferOut(msg.sender, redeemAmount);
        errMsg = comptroller.redeemVerify(address(this), msg.sender, redeemAmount);
        if (bytes(errMsg).length != 0) {
            emit Fail(errMsg);
        }
        return errMsg;
    }

    function seize(address liquidator, address borrower, uint amount) public nonReentrant returns (string memory) {
        string memory errMsg = comptroller.seizeAllowed(address(this), msg.sender, liquidator, borrower, amount);
        if (bytes(errMsg).length != 0) {
            emit Fail(errMsg);
            return errMsg;
        }
        _transfer(borrower, liquidator, amount);
        errMsg = comptroller.seizeVerify(address(this), msg.sender, liquidator, borrower, amount);
        if (bytes(errMsg).length != 0) {
            emit Fail(errMsg);
        }
        return errMsg;
    }

    function depositValue() public view returns (uint){
        return tokenValue(totalSupply());
    }

    function userDepositValue(address user) public view returns (uint){
        return tokenValue(balanceOf(user));
    }

    function tokenValue(uint amount) public view returns (uint){
        Exp memory price = Exp(oracle.getPrice(underlyingAsset));
        (MathError err, Exp memory value) = mulScalar(price, amount);
        require(err == MathError.NO_ERROR, "calculate value failed");
        return value.mantissa;
    }

    function tokenAmount(uint value) public view returns (uint){
        Exp memory price = Exp(oracle.getPrice(underlyingAsset));
        Exp memory v = Exp(value);
        (MathError err, Exp memory amount) = divExp(v, price);
        require(err == MathError.NO_ERROR, "calculate amount failed");
        return truncate(amount);
    }
}