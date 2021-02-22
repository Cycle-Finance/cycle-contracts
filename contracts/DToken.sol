// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./interfaces/DTokenInterface.sol";
import "./storage/DTokenStorage.sol";
import "./math/Exponential.sol";

abstract contract DToken is DTokenStorage, Exponential {

    event NewOracle(IOracle oldOracle, IOracle newOracle);
    event NewComptroller(ComptrollerInterface oldComptroller, ComptrollerInterface newComptroller);

    constructor(string memory name, string memory symbol, address _underlyingAsset)DTokenStorage(name, symbol) {
        // check underlying is erc20
        if (_underlyingAsset != address(0)) {
            require(IERC20(_underlyingAsset).balanceOf(address(this)) >= 0, "illegal erc20 underlying asset");
        }
        underlyingAsset = _underlyingAsset;
        _notEntered = true;
    }

    function mintInternal(uint mintAmount) internal nonReentrant returns (string memory){
        string memory errMsg = comptroller.mintAllowed(address(this), msg.sender, mintAmount);
        if (bytes(errMsg).length != 0) {
            emit Fail(errMsg);
            return errMsg;
        }
        uint actualMintAmount = transferIn(msg.sender, mintAmount);
        _mint(msg.sender, actualMintAmount);
        errMsg = comptroller.mintVerify(address(this), msg.sender, actualMintAmount);
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

    /* admin function */

    function setOracle(IOracle _oracle) public onlyOwner {
        IOracle oldOracle = oracle;
        oracle = _oracle;
        emit NewOracle(oldOracle, _oracle);
    }

    function setComptroller(ComptrollerInterface _comptroller) public onlyOwner {
        ComptrollerInterface oldComptroller = comptroller;
        require(comptroller.isComptroller(), "illegal comptroller");
        comptroller = _comptroller;
        emit NewComptroller(oldComptroller, _comptroller);
    }
}