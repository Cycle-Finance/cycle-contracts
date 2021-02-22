// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "./storage/BorrowsStorage.sol";
import "./math/Exponential.sol";
import "./ErrorReporter.sol";
import "./SafeERC20.sol";
import "./interfaces/DTokenInterface.sol";

contract Borrows is BorrowsStorage, Exponential, ErrorReporter {

    using SafeERC20 for address;

    /* event */
    event AccrueInterest(uint totalDeposit, uint interestAccumulated, uint borrowIndex, uint totalBorrows);
    event Borrow(address borrower, uint amount, uint accountBorrowsNew, uint totalBorrowsNew);
    event RepayBorrow(address payer, address borrower, uint repayAmount, uint accountBorrows, uint totalBorrows);
    event LiquidateBorrow(address liquidator, address borrower, uint repayAmount, address dToken, uint seizeTokens);


    // return (errorInfo, interestAccumulated)
    function accrueInterest() public onlyComptroller returns (string memory, uint){
        uint blockDelta = block.number - accrualBlock;

        MathError mathErr;
        Exp memory simpleInterestFactor;
        uint interestAccumulated;
        uint totalBorrowsNew;
        uint reservesCurrent;
        uint borrowIndexNew;

        uint totalDeposit = comptroller.totalDeposit();
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
        CFSC.mint(address(this), interestAccumulated);
        CFSC.transfer(address(comptroller), sub_(interestAccumulated, reservesCurrent));

        /* We write the previously calculated values into storage */
        accrualBlock = block.number;
        borrowIndex = borrowIndexNew;
        totalBorrows = totalBorrowsNew;
        reserves += reservesCurrent;

        /* We emit an AccrueInterest event */
        emit AccrueInterest(totalDeposit, interestAccumulated, borrowIndexNew, totalBorrowsNew);

        return ("", interestAccumulated);
    }

    function borrow(uint amount) public nonReentrant returns (string memory){
        string memory errInfo = comptroller.borrowAllowed(msg.sender, amount);
        if (bytes(errInfo).length == 0) {
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

    function repayBorrow(address scAddr, uint amount) public returns (string memory){
        (string memory err,) = repayBorrowInternal(scAddr, msg.sender, msg.sender, amount);
        return err;
    }

    function repayBorrowBehalf(address scAddr, address borrower, uint amount) public returns (string memory){
        (string memory err,) = repayBorrowInternal(scAddr, msg.sender, borrower, amount);
        return err;
    }

    function repayBorrowInternal(address scAddr, address payer, address borrower, uint amount)
    internal nonReentrant returns (string memory, uint actualRepayAmount){
        // revert while asset transfer failed
        require(scAddr.safeTransferFrom(payer, address(this), amount), "transferFrom asset failed");
        if (scAddr == address(CFSC)) {
            CFSC.burn(amount);
        } else {
            // TODO: parse other SC value to CFSC value
            require(scAddr.safeTransfer(exchangePool, amount), "transfer asset to exchange pool failed");
        }
        string memory errInfo = comptroller.repayBorrowAllowed(payer,borrower, amount);
        if (bytes(errInfo).length == 0) {
            return (fail(errInfo), 0);
        }
        if (accrualBlock != block.number) {
            return (fail("stale accrual block"), 0);
        }
        uint userBorrows = getBorrows(borrower);
        if (amount == uint(- 1)) {
            amount = userBorrows;
        }
        uint userBorrowsNew = sub_(userBorrows, amount);
        accountBorrows[borrower] = AccountBorrowSnapshot(borrowIndex, userBorrowsNew);
        // update totalBorrows
        totalBorrows = sub_(totalBorrows, amount);
        comptroller.repayBorrowVerify(payer, borrower, amount);
        emit RepayBorrow(payer, borrower, amount, userBorrowsNew, totalBorrows);
        return ("", amount);
    }

    function liquidationBorrow(address scAddr, address dToken, address borrower, uint amount)
    public nonReentrant returns (string memory){
        string memory errInfo = comptroller.liquidateBorrowAllowed(address(this), msg.sender, borrower, amount);
        if (bytes(errInfo).length == 0) {
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
        if (bytes(errInfo).length == 0) {
            return fail(errInfo);
        }
        // seize
        uint seizeTokens;
        (errInfo, seizeTokens) = comptroller.liquidateCalculateSeizeTokens(dToken, msg.sender, borrower,
            actualRepayAmount);
        if (bytes(errInfo).length == 0) {
            return fail(errInfo);
        }
        DTokenInterface market = DTokenInterface(dToken);
        require(IERC20(dToken).balanceOf(borrower) >= seizeTokens, "liquidate seize too much");
        errInfo = market.seize(msg.sender, borrower, seizeTokens);
        require(bytes(errInfo).length == 0, errInfo);
        comptroller.liquidateBorrowVerify(dToken, msg.sender, borrower, actualRepayAmount, seizeTokens);
        emit LiquidateBorrow(msg.sender, borrower, actualRepayAmount, dToken, seizeTokens);
        return "";
    }

    function getBorrows(address user) public view returns (uint){
        Exp memory globalIndex = Exp(borrowIndex);
        AccountBorrowSnapshot memory snapshot = accountBorrows[user];
        Exp memory userIndex = Exp(snapshot.index);
        Exp memory deltaIndex = div_(globalIndex, userIndex);
        (MathError err, uint borrows) = mulScalarTruncate(deltaIndex, snapshot.borrows);
        require(err == MathError.NO_ERROR, "calculate user borrows failed");
        return borrows;
    }

    // TODO: other interface
}
