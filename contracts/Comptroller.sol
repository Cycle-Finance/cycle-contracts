// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./ComptrollerStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./math/Exponential.sol";
import "./SafeERC20.sol";
import "./DTokenInterface.sol";

contract Comptroller is ComptrollerStorage, Ownable, Exponential {

    /* event */
    event DistributeInterest(address indexed market, address indexed user, uint amount, uint index);
    event DistributeSupplierCFGT(address indexed market, address indexed user, uint amount, uint index);
    event DistributeBorrowerCFGT(address indexed user, uint amount, uint index);

    constructor()Ownable(){}

    /*
    * @notice accrue interest, update interest index, update supply CFGT index, refresh market deposit
    * @notice the function could be invoked individually
    */
    function refreshMarketDeposit() public {
        /* borrow pool accrue interest */
        uint interest = borrowPool.accrueInterest();
        /*  update interest index, update supply CFGT index, refresh market deposit */
        uint deltaBlock = sub_(block.number, supplyDistributedBlock);
        uint supplyCFGTAccrued = mul_(supplySpeed, deltaBlock);
        uint tempTotalDeposit = 0;
        for (uint i = 0; i < markets.length; i++) {
            address market = markets[i];
            if (marketDeposit[market] > 0) {
                uint dTokenTotalSupply = IERC20(market).totalSupply();
                (MathError err,Exp memory marketWeight) = getExp(marketDeposit[market], totalDeposit);
                require(err == MathError.NO_ERROR, "cal market weight failed");
                /* update interest index */
                (MathError err1, uint marketInterest) = mulScalarTruncate(marketWeight, interest);
                require(err1 == MathError.NO_ERROR, "cal market interest failed");
                Double memory interestRatio = fraction(marketInterest, dTokenTotalSupply);
                marketInterestIndex[market] = add_(marketInterestIndex[market], interestRatio.mantissa);
                /* update supply index */
                if (supplyCFGTAccrued > 0) {
                    (MathError err, uint marketSupplyCFGT) = mulScalarTruncate(marketWeight, supplyCFGTAccrued);
                    require(err == MathError.NO_ERROR, "cal market interest failed");
                    Double memory supplyRatio = fraction(marketSupplyCFGT, dTokenTotalSupply);
                    supplyIndex[market] = add_(supplyIndex[market], supplyRatio.mantissa);
                }
            }
            /* update market deposit */
            uint deposit = DTokenInterface(market).deposit();
            marketDeposit[market] = deposit;
            tempTotalDeposit += deposit;
        }
        // record supply distribution block
        if (deltaBlock > 0) {
            supplyDistributedBlock = block.number;
        }
        // update total deposit
        totalDeposit = tempTotalDeposit;
    }

    // update CFGT borrower distribution index
    function updateBorrowIndex() internal {
        uint deltaBlock = block.number - borrowDistributedBlock;
        uint borrowCFGTAccrued = mul_(borrowSpeed, deltaBlock);
        uint totalBorrows = borrowPool.totalBorrows();
        if (borrowCFGTAccrued > 0) {
            Double memory ratio = fraction(borrowCFGTAccrued, totalBorrows);
            borrowIndex = add_(borrowIndex, ratio.mantissa);
        } else if (deltaBlock > 0) {
            borrowDistributedBlock = block.number;
        }
    }

    function distributeInterest(address market, address user) internal {
        Double memory marketState = Double(marketInterestIndex[market]);
        Double memory userState = Double(userInterestIndex[market][user]);
        // update user interest index
        userInterestIndex[market][user] = marketInterestIndex[market];
        if (userState.mantissa == 0 && marketState.mantissa > 0) {
            userState.mantissa = INITIAL_INDEX;
        }
        Double memory deltaIndex = sub_(marketState, userState);
        uint userBalance = IERC20(market).balanceOf(user);
        uint userDelta = mul_(userBalance, deltaIndex);
        CFSC.mint(user, userDelta);
        emit DistributeInterest(market, user, userDelta, marketState.mantissa);
    }

    function distributeSupplierCFGT(address market, address user) internal {
        Double memory marketState = Double(supplyIndex[market]);
        Double memory userState = Double(supplierIndex[market][user]);
        // update supplier index
        supplierIndex[market][user] = supplyIndex[market];
        if (userState.mantissa == 0 && marketState.mantissa > 0) {
            userState.mantissa = INITIAL_INDEX;
        }
        Double memory deltaIndex = sub_(marketState, userState);
        uint userBalance = IERC20(market).balanceOf(user);
        uint userDelta = mul_(userBalance, deltaIndex);
        userAccrued[user] = add_(userAccrued[user], userDelta);
        if (IERC20(CFGT).transferFrom(CFGT, user, userAccrued[user])) {
            userAccrued[user] = 0;
        }
        emit DistributeSupplierCFGT(market, user, userDelta, marketState.mantissa);
    }

    function distributeBorrowerCFGT(address user) internal {
        Double memory globalState = Double(borrowIndex);
        Double memory userState = Double(borrowerIndex[user]);
        borrowerIndex[user] = borrowIndex;
        if (userState.mantissa == 0 && globalState.mantissa > 0) {
            userState.mantissa = INITIAL_INDEX;
        }
        Double memory deltaIndex = sub_(globalState, userState);
        uint userBorrows = borrowPool.getBorrows(user);
        uint userDelta = mul_(userBorrows, deltaIndex);
        userAccrued[user] = add_(userAccrued[user], userDelta);
        if (IERC20(CFGT).transferFrom(CFGT, user, userAccrued[user])) {
            userAccrued[user] = 0;
        }
        emit DistributeBorrowerCFGT(user, userDelta, globalState.mantissa);
    }

    /// @return 0 means that no error
    function mintAllowed(address dToken, address minter, uint amount) public returns (uint){
        distributeInterest(dToken, minter);
        distributeSupplierCFGT(dToken, minter);
        refreshMarketDeposit();
        return 0;
    }

    /// @return 0 means that no error
    function mintVerified(address dToken, address minter, uint amount) public returns (uint){
        return 0;
    }

    /// @return (errCode, liquidity, shortfall)
    function getAccountLiquidity(address account) public view returns (uint, uint, uint){
        (MathError err, uint liquidity, uint shortfall) = getHypotheticalAccountLiquidity(account, address(0), 0, 0);
        return (uint(err), liquidity, shortfall);
    }

    function getHypotheticalAccountLiquidity(address account, address dToken, uint redeemTokens, uint borrowAmount)
    internal returns (MathError, uint, uint){
        if (account == publicBorrower) {
            return getHypotheticalPublicBorrowerLiquidity(borrowAmount);
        }
        (MathError err, uint borrowLimit) = getAccountBorrowLimit(account);
        if (err != MathError.NO_ERROR) {
            return (err, 0, 0);
        }
        uint hypotheticalBorrows = add_(DTokenInterface(dToken).tokenValue(redeemTokens), borrowAmount);
        if (borrowLimit > hypotheticalBorrows) {
            return (MathError.NO_ERROR, borrowLimit - hypotheticalBorrows, 0);
        } else {
            return (MathError.NO_ERROR, 0, hypotheticalBorrows - borrowLimit);
        }
    }

    function getHypotheticalPublicBorrowerLiquidity(uint borrowAmount)
    internal returns (MathError, uint, uint){
        Exp memory systemFactor = Exp(systemCollateralFactor);
        (MathError err, uint borrowLimit) = mulScalarTruncate(systemFactor, totalDeposit);
        if (err != MathError.NO_ERROR) {
            return (err, 0, 0);
        }
        uint totalBorrows = borrowPool.totalBorrows();
        uint publicBorrows = borrowPool.getBorrows(publicBorrower);
        uint userBorrows = sub_(totalBorrows, publicBorrows);
        uint hypotheticalPublicBorrows = add_(publicBorrows, borrowAmount);
        if (userBorrows < borrowLimit) {
            uint gap = borrowLimit - userBorrows;
            if (hypotheticalPublicBorrows < gap) {
                return (MathError.NO_ERROR, gap - hypotheticalPublicBorrows, 0);
            } else {
                return (MathError.NO_ERROR, 0, hypotheticalPublicBorrows - gap);
            }
        } else {
            return (MathError.NO_ERROR, 0, hypotheticalPublicBorrows);
        }
    }

    /// @return (errCode, borrowLimit)
    function getAccountBorrowLimit(address account) public view returns (MathError, uint){
        uint borrowLimit = 0;
        for (uint i = 0; i < markets.length; i++) {
            address market = markets[i];
            uint userDeposit = DTokenInterface(market).userDeposit(account);
            if (userDeposit == 0) {
                continue;
            }
            Exp memory factor = Exp(collateralFactor[market]);
            (MathError err, uint assetBorrowLimit) = mulScalarTruncate(factor, userDeposit);
            if (err != MathError.NO_ERROR) {
                return (err, 0, 0);
            }
            borrowLimit += assetBorrowLimit;
        }
        return borrowLimit;
    }
}
