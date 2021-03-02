// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "./storage/BorrowsStorage.sol";
import "./math/Exponential.sol";
import "./ErrorReporter.sol";
import "./SafeERC20.sol";
import "./interfaces/DTokenInterface.sol";
import "./interfaces/BorrowsInterface.sol";

contract Borrows is BorrowsStorage, BorrowsInterface, Exponential, ErrorReporter {

    using SafeERC20 for address;

    /* event */
    event AccrueInterest(uint totalDeposit, uint supplyInterest, uint reserves, uint borrowIndex, uint totalBorrows);
    event Borrow(address borrower, uint amount, uint accountBorrowsNew, uint totalBorrowsNew);
    event RepayBorrow(address payer, address borrower, uint repayAmount, uint accountBorrows, uint totalBorrows);
    event LiquidateBorrow(address liquidator, address borrower, uint repayAmount, address dToken, uint seizeTokens);

    event ReduceReserve(address recipient, uint amount);
    event NewReserveFactor(uint oldFactor, uint newFactor);
    event NewInterestRateModel(InterestRateModel oldModel, InterestRateModel newModel);

    event NewOracle(IOracle oldOracle, IOracle newOracle);
    event NewComptroller(ComptrollerInterface oldComptroller, ComptrollerInterface newComptroller);
    event UpdateSupportedSC(address sc, bool valid);

    // return (errorInfo, interestAccumulated)
    function accrueInterest() public onlyComptroller override returns (string memory, uint){
        uint blockDelta = block.number - accrualBlock;

        MathError mathErr;
        Exp memory simpleInterestFactor;
        uint interestAccumulated;
        uint totalBorrowsNew;
        uint reservesCurrent;
        uint borrowIndexNew;

        uint totalDeposit = comptroller._totalDeposit();
        Exp memory borrowRate = Exp(interestRateModel.borrowRatePerBlock(totalDeposit, totalBorrows * expScale));
        (mathErr, simpleInterestFactor) = mulScalar(borrowRate, blockDelta);
        if (mathErr != MathError.NO_ERROR) {
            return ("calculate interest factor failed", 0);
        }
        (mathErr, interestAccumulated) = mulScalarTruncate(simpleInterestFactor, totalBorrows);
        if (mathErr != MathError.NO_ERROR) {
            return ("calculate interest failed", 0);
        }

        (mathErr, totalBorrowsNew) = addUInt(interestAccumulated, totalBorrows);
        if (mathErr != MathError.NO_ERROR) {
            return ("calculate total borrows failed", 0);
        }

        (mathErr, reservesCurrent) = mulScalarTruncate(Exp({mantissa : reserveFactor}), interestAccumulated);
        if (mathErr != MathError.NO_ERROR) {
            return ("calculate reserves failed", 0);
        }

        (mathErr, borrowIndexNew) = mulScalarTruncateAddUInt(simpleInterestFactor, borrowIndex, borrowIndex);
        if (mathErr != MathError.NO_ERROR) {
            return ("calculate borrow index failed", 0);
        }

        /* transfer interest*/
        uint supplyInterest = sub_(interestAccumulated, reservesCurrent);
        if (reservesCurrent > 0) {
            CFSC.mint(address(this), reservesCurrent);
        }
        if (supplyInterest > 0) {
            CFSC.mint(address(comptroller), supplyInterest);
        }

        /* We write the previously calculated values into storage */
        accrualBlock = block.number;
        borrowIndex = borrowIndexNew;
        totalBorrows = totalBorrowsNew;

        /* We emit an AccrueInterest event */
        emit AccrueInterest(totalDeposit, supplyInterest, reservesCurrent, borrowIndexNew, totalBorrowsNew);

        return ("", supplyInterest);
    }

    function borrow(uint amount) public nonReentrant returns (string memory){
        string memory errInfo = comptroller.borrowAllowed(msg.sender, amount);
        if (bytes(errInfo).length != 0) {
            return fail(errInfo);
        }
        if (accrualBlock != block.number) {
            return fail("stale accrual block");
        }
        CFSC.mint(msg.sender, amount);
        // update account borrows
        uint userBorrows = getBorrows(msg.sender);
        uint userBorrowsNew = add_(userBorrows, amount);
        accountBorrows[msg.sender] = AccountBorrowSnapshot(borrowIndex, userBorrowsNew);
        // update totalBorrows
        totalBorrows = add_(totalBorrows, amount);
        comptroller.borrowVerify(msg.sender, amount);
        emit Borrow(msg.sender, amount, userBorrowsNew, totalBorrows);
        return "";
    }

    function repayBorrow(address scAddr, uint amount)
    public nonReentrant returns (string memory){
        (string memory err,) = repayBorrowInternal(scAddr, msg.sender, msg.sender, amount);
        return err;
    }

    function repayBorrowBehalf(address scAddr, address borrower, uint amount)
    public nonReentrant returns (string memory){
        (string memory err,) = repayBorrowInternal(scAddr, msg.sender, borrower, amount);
        return err;
    }

    // param `amount` represent the number of CFSC
    // if amount == -1, the borrower will repay whole borrows
    function repayBorrowInternal(address scAddr, address payer, address borrower, uint amount)
    internal returns (string memory, uint actualRepayAmount){
        string memory errInfo = comptroller.repayBorrowAllowed(payer, borrower, amount);
        if (bytes(errInfo).length != 0) {
            return (fail(errInfo), 0);
        }
        if (accrualBlock != block.number) {
            return (fail("stale accrual block"), 0);
        }
        uint userBorrows = getBorrows(borrower);
        if (amount == uint(- 1)) {
            amount = userBorrows;
        }
        // revert while asset transfer failed
        if (scAddr == address(CFSC)) {
            require(scAddr.safeTransferFrom(payer, address(this), amount), "transferFrom asset failed");
            CFSC.burn(amount);
        } else {
            /* scAmount = cfscAmount * cfscPrice / scPrice */
            (MathError err, Exp memory priceRatio) = divExp(Exp(expScale), Exp(oracle.getPrice(scAddr)));
            require(err == MathError.NO_ERROR, "parse price failed");
            uint scAmount;
            (err, scAmount) = mulScalarTruncate(priceRatio, amount);
            require(err == MathError.NO_ERROR, "parse amount failed");
            require(scAddr.safeTransferFrom(payer, exchangePool, scAmount), "transferFrom asset to exchange pool failed");
        }
        uint userBorrowsNew = sub_(userBorrows, amount);
        accountBorrows[borrower] = AccountBorrowSnapshot(borrowIndex, userBorrowsNew);
        // update totalBorrows
        totalBorrows = sub_(totalBorrows, amount);
        comptroller.repayBorrowVerify(payer, borrower, amount);
        emit RepayBorrow(payer, borrower, amount, userBorrowsNew, totalBorrows);
        return ("", amount);
    }

    // param `amount` represent the number of CFSC
    function liquidateBorrow(address scAddr, address dToken, address borrower, uint amount)
    public nonReentrant returns (string memory){
        string memory errInfo = comptroller.liquidateBorrowAllowed(dToken, msg.sender, borrower, amount);
        if (bytes(errInfo).length != 0) {
            return fail(errInfo);
        }
        if (accrualBlock != block.number) {
            return fail("stale accrual block");
        }
        if (msg.sender == borrower) {
            return fail("liquidator is same as borrower");
        }
        if (amount == 0 || amount == uint(- 1)) {
            return fail("illegal liquidation amount");
        }
        uint actualRepayAmount;
        (errInfo, actualRepayAmount) = repayBorrowInternal(scAddr, msg.sender, borrower, amount);
        if (bytes(errInfo).length != 0) {
            return fail(errInfo);
        }
        // seize
        uint seizeTokens;
        (errInfo, seizeTokens) = comptroller.liquidateCalculateSeizeTokens(dToken, actualRepayAmount);
        if (bytes(errInfo).length != 0) {
            return fail(errInfo);
        }
        DTokenInterface market = DTokenInterface(dToken);
        require(IERC20(dToken).balanceOf(borrower) >= seizeTokens, "liquidate seize too much");
        errInfo = market.seize(msg.sender, borrower, seizeTokens);
        // revert if there are some effect at other contract
        require(bytes(errInfo).length == 0, errInfo);
        comptroller.liquidateBorrowVerify(dToken, msg.sender, borrower, actualRepayAmount, seizeTokens);
        emit LiquidateBorrow(msg.sender, borrower, actualRepayAmount, dToken, seizeTokens);
        return "";
    }

    function getBorrows(address user) public override view returns (uint){
        Exp memory globalIndex = Exp(borrowIndex);
        AccountBorrowSnapshot memory snapshot = accountBorrows[user];
        if (snapshot.index == 0) {
            return 0;
        }
        Exp memory userIndex = Exp(snapshot.index);
        Exp memory deltaIndex = div_(globalIndex, userIndex);
        (MathError err, uint borrows) = mulScalarTruncate(deltaIndex, snapshot.borrows);
        require(err == MathError.NO_ERROR, "calculate user borrows failed");
        return borrows;
    }

    function isBorrowPool() public override pure returns (bool){
        return true;
    }

    function _borrowIndex() public override view returns (uint){
        return borrowIndex;
    }

    // return total borrows, is scalar
    function _totalBorrows() external override view returns (uint){
        return totalBorrows;
    }

    function reduceReserves(address recipient) public onlyComptroller override returns (uint){
        uint reserves = CFSC.balanceOf(address(this));
        require(CFSC.transfer(recipient, reserves), "reduce reserve failed");
        emit ReduceReserve(recipient, reserves);
        return reserves;
    }

    function setReserveFactor(uint factor) public onlyComptroller override {
        uint oldFactor = reserveFactor;
        require(factor < mantissaOne, "illegal reserve factor");
        reserveFactor = factor;
        emit NewReserveFactor(oldFactor, factor);
    }

    function setInterestRateModel(address _interestRateModel) public onlyComptroller override {
        InterestRateModel oldModel = interestRateModel;
        InterestRateModel newModel = InterestRateModel(_interestRateModel);
        require(newModel.isInterestRateModel(), "illegal interest rate model");
        interestRateModel = newModel;
        emit NewInterestRateModel(oldModel, newModel);
    }

    /* admin function */

    function initialize(CycleStableCoin cfsc, InterestRateModel _interestRateModel, ComptrollerInterface _comptroller,
        address _exchangePool, IOracle _oracle, uint _reserveFactor) public onlyOwner {
        require(accrualBlock == 0 && borrowIndex == 0, "could only be initialized once");
        CFSC = cfsc;
        interestRateModel = _interestRateModel;
        require(_comptroller._isComptroller(), "illegal comptroller");
        comptroller = _comptroller;
        exchangePool = _exchangePool;
        oracle = _oracle;
        borrowIndex = mantissaOne;
        require(_reserveFactor < mantissaOne, "illegal reserve factor");
        reserveFactor = _reserveFactor;
        _notEntered = true;
        accrualBlock = block.number;
    }

    function setOracle(IOracle _oracle) public onlyOwner {
        IOracle oldOracle = oracle;
        oracle = _oracle;
        emit NewOracle(oldOracle, _oracle);
    }

    function setComptroller(ComptrollerInterface _comptroller) public onlyOwner {
        ComptrollerInterface oldComptroller = comptroller;
        require(comptroller._isComptroller(), "illegal comptroller");
        comptroller = _comptroller;
        emit NewComptroller(oldComptroller, _comptroller);
    }

    function setSupportedSC(address sc, bool valid) public onlyOwner {
        supportedSC[sc] = valid;
        emit UpdateSupportedSC(sc, valid);
    }
}
