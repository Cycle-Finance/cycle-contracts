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

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name, string memory symbol, address _underlyingAsset)
    DTokenStorage(name, symbol, _underlyingAsset) {}


    /* ERC-20 method */

    function transfer(address recipient, uint256 amount) public returns (bool) {
        return _transfer(msg.sender, recipient, amount);
    }

    function approve(address spender, uint amount) public returns (bool){
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool) {
        if (!_transfer(sender, recipient, amount)) {
            return false;
        }
        _approve(sender, msg.sender, sub_(allowance[sender][msg.sender], amount));
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal returns (bool) {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        string memory errMsg = comptroller.transferAllowed(address(this), sender, recipient, amount);
        if (bytes(errMsg).length != 0) {
            fail(errMsg);
            return false;
        }

        balanceOf[sender] = sub_(balanceOf[sender], amount);
        balanceOf[recipient] = add_(balanceOf[recipient], amount);

        comptroller.transferVerify(address(this), msg.sender, recipient, amount);

        emit Transfer(sender, recipient, amount);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        allowance[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        totalSupply = add_(totalSupply, amount);
        balanceOf[account] = add_(balanceOf[account], amount);
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        balanceOf[account] = sub_(balanceOf[account], amount);
        totalSupply = sub_(totalSupply, amount);
        emit Transfer(account, address(0), amount);
    }

    function transferIn(address from, uint amount) internal virtual returns (uint);

    function transferOut(address payable to, uint amount) internal virtual;

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
            redeemAmount = balanceOf[msg.sender];
        }
        string memory errMsg = comptroller.redeemAllowed(address(this), msg.sender, redeemAmount);
        if (bytes(errMsg).length != 0) {
            return fail(errMsg);
        }
        if (redeemAmount > balanceOf[msg.sender]) {
            return "insufficient dToken balance";
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
        balanceOf[borrower] = sub_(balanceOf[borrower], amount);
        balanceOf[liquidator] = add_(balanceOf[liquidator], amount);
        comptroller.seizeVerify(address(this), msg.sender, liquidator, borrower, amount);
        emit Transfer(borrower, liquidator, amount);
        return "";
    }

    function depositValue() public view returns (uint){
        return tokenValue(totalSupply);
    }

    function userDepositValue(address user) public view returns (uint){
        return tokenValue(balanceOf[user]);
    }

    function tokenValue(uint amount) public view returns (uint){
        Exp memory price = Exp(oracle.getPrice(underlyingAsset));
        // truncate expScale of normalized price
        (MathError err, uint value) = mulScalarTruncate(price, amount);
        require(err == MathError.NO_ERROR, "calculate value failed");
        return value;
    }

    function tokenAmount(uint value) public view returns (uint){
        Exp memory price = Exp(oracle.getPrice(underlyingAsset));
        Exp memory v = Exp(value);
        (MathError err, Exp memory amount) = divExp(v, price);
        require(err == MathError.NO_ERROR, "calculate amount failed");
        return amount.mantissa;
    }

    /* admin function */

    function initialize(IOracle _oracle, ComptrollerInterface _comptroller) public onlyOwner {
        setOracle(_oracle);
        setComptroller(_comptroller);
    }

    function setOracle(IOracle _oracle) public onlyOwner {
        IOracle oldOracle = oracle;
        oracle = _oracle;
        emit NewOracle(oldOracle, _oracle);
    }

    function setComptroller(ComptrollerInterface _comptroller) public onlyOwner {
        ComptrollerInterface oldComptroller = comptroller;
        require(_comptroller._isComptroller(), "illegal comptroller");
        comptroller = _comptroller;
        emit NewComptroller(oldComptroller, _comptroller);
    }
}