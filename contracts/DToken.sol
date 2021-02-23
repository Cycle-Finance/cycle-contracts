// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./interfaces/DTokenInterface.sol";
import "./storage/DTokenStorage.sol";
import "./math/Exponential.sol";

abstract contract DToken is DTokenStorage, Exponential {

    event NewOracle(IOracle oldOracle, IOracle newOracle);
    event NewComptroller(ComptrollerInterface oldComptroller, ComptrollerInterface newComptroller);

    event Mint(address minter, uint amount);
    event Redeem(address redeemer, uint amount);
    event Seize(address liquidator, address borrower, uint amount);

    constructor(string memory name, string memory symbol, address _underlyingAsset)
    DTokenStorage(name, symbol, _underlyingAsset) {}


    function transferIn(address from, uint amount) internal virtual returns (uint);

    function transferOut(address payable to, uint amount) internal virtual;

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        string memory errMsg = comptroller.transferAllowed(address(this), msg.sender, recipient, amount);
        if (bytes(errMsg).length != 0) {
            fail(errMsg);
            return false;
        }
        _transfer(_msgSender(), recipient, amount);
        comptroller.transferVerify(address(this), msg.sender, recipient, amount);
        return true;
    }

    function mintInternal(uint mintAmount) internal nonReentrant returns (string memory){
        string memory errMsg = comptroller.mintAllowed(address(this), msg.sender, mintAmount);
        if (bytes(errMsg).length != 0) {
            return fail(errMsg);
        }
        uint actualMintAmount = transferIn(msg.sender, mintAmount);
        _mint(msg.sender, actualMintAmount);
        comptroller.mintVerify(address(this), msg.sender, actualMintAmount);
        emit Mint(msg.sender, mintAmount);
        return "";
    }

    function redeemInternal(uint redeemAmount) internal nonReentrant returns (string memory){
        if (redeemAmount == uint(- 1)) {
            redeemAmount = balanceOf(msg.sender);
        }
        string memory errMsg = comptroller.redeemAllowed(address(this), msg.sender, redeemAmount);
        if (bytes(errMsg).length != 0) {
            return fail(errMsg);
        }
        _burn(msg.sender, redeemAmount);
        transferOut(msg.sender, redeemAmount);
        comptroller.redeemVerify(address(this), msg.sender, redeemAmount);
        emit Redeem(msg.sender, redeemAmount);
        return "";
    }

    // msg.sender should be borrow pool
    function seize(address liquidator, address borrower, uint amount) public nonReentrant returns (string memory) {
        string memory errMsg = comptroller.seizeAllowed(address(this), msg.sender, liquidator, borrower, amount);
        if (bytes(errMsg).length != 0) {
            return fail(errMsg);
        }
        _transfer(borrower, liquidator, amount);
        comptroller.seizeVerify(address(this), msg.sender, liquidator, borrower, amount);
        emit Seize(liquidator, borrower, amount);
        return "";
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