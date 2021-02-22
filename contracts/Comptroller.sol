// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./storage/ComptrollerStorage.sol";
import "./math/Exponential.sol";
import "./SafeERC20.sol";
import "./interfaces/DTokenInterface.sol";

// TODO: pause guardian

contract Comptroller is ComptrollerStorage, Exponential {

    /* event */
    event DistributeInterest(address indexed market, address indexed user, uint amount, uint index);
    event DistributeSupplierCFGT(address indexed market, address indexed user, uint amount, uint index);
    event DistributeBorrowerCFGT(address indexed user, uint amount, uint index);

    event RegisterMarket(address dToken);
    event ReduceReserves(address indexed owner, uint amount);
    event NewCFToken(CycleStableCoin oldCFSC, CycleStableCoin newCFSC, address oldCFGT, address newCFGT);
    //    event NewOracle(IOracle oldOracle, IOracle newOracle);
    event NewPublicBorrower(address oldPublicBorrower, address newPublicBorrower);
    event NewBorrowPool(BorrowsInterface oldBorrowPool, BorrowsInterface newBorrowPool);

    event NewSupplySpeed(uint oldSpeed, uint newSpeed);
    event NewBorrowSpeed(uint oldSpeed, uint newSpeed);

    event NewCollateralFactor(address dToken, uint oldFactor, uint newFactor);
    event NewUtilizationRate(uint oldFactor, uint newFactor);
    event NewMaxCloseFactor(uint oldFactor, uint newFactor);
    event NewLiquidationIncentive(uint oldIncentive, uint newIncentive);

    /*
    * @notice accrue interest, update interest index, update supply CFGT index, refresh market deposit
    * @notice the function could be invoked individually
    */
    function refreshMarketDeposit() public {
        uint deltaBlock = sub_(block.number, refreshedBlock);
        if (deltaBlock == 0) {
            return;
        }
        /* borrow pool accrue interest */
        (string memory accrueInterestErr, uint interest) = borrowPool.accrueInterest();
        require(bytes(accrueInterestErr).length == 0, accrueInterestErr);
        /*  update interest index, update supply CFGT index, refresh market deposit */
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
                    (MathError err2, uint marketSupplyCFGT) = mulScalarTruncate(marketWeight, supplyCFGTAccrued);
                    require(err2 == MathError.NO_ERROR, "cal market interest failed");
                    Double memory supplyRatio = fraction(marketSupplyCFGT, dTokenTotalSupply);
                    supplyIndex[market] = add_(supplyIndex[market], supplyRatio.mantissa);
                }
            }
            /* update market deposit */
            uint deposit = DTokenInterface(market).depositValue();
            marketDeposit[market] = deposit;
            tempTotalDeposit += deposit;
        }
        // record refreshed block
        refreshedBlock = block.number;
        // update total deposit
        totalDeposit = tempTotalDeposit;
    }

    // @return 0 means that no error
    function mintAllowed(address dToken, address minter, uint amount) public returns (string memory){
        refreshMarketDeposit();
        distributeInterest(dToken, minter);
        distributeSupplierCFGT(dToken, minter);
        return "";
    }

    // @return 0 means that no error
    function mintVerified(address dToken, address minter, uint amount) public {
    }

    function redeemAllowed(address dToken, address redeemer, uint redeemTokens)
    public returns (string memory){
        refreshMarketDeposit();
        distributeInterest(dToken, redeemer);
        distributeSupplierCFGT(dToken, redeemer);
        (MathError errS, , uint systemShortfall) = getHypotheticalSystemLiquidity(dToken, redeemTokens, 0);
        if (errS != MathError.NO_ERROR) {
            return "calculate system liquidity failed";
        }
        if (systemShortfall > 0) {
            return "insufficient system liquidity";
        }
        (MathError err, , uint shortfall) = getHypotheticalAccountLiquidity(redeemer, dToken, redeemTokens, 0);
        if (err != MathError.NO_ERROR) {
            return "calculate account liquidity failed";
        }
        if (shortfall > 0) {
            return "insufficient liquidity";
        }
        return "";
    }

    function redeemVerify(address dToken, address minter, uint amount) public {
    }

    function borrowAllowed(address user, uint borrowAmount) public returns (string memory){
        refreshMarketDeposit();
        updateBorrowIndex();
        distributeBorrowerCFGT(user);
        (MathError errS, , uint systemShortfall) = getHypotheticalSystemLiquidity(address(0), 0, borrowAmount);
        if (errS != MathError.NO_ERROR) {
            return "calculate system liquidity failed";
        }
        if (systemShortfall > 0) {
            return "insufficient system liquidity";
        }
        if (user != publicBorrower) {
            (MathError err, , uint shortfall) = getHypotheticalAccountLiquidity(user, address(0), 0, borrowAmount);
            if (err != MathError.NO_ERROR) {
                return "calculate account liquidity failed";
            }
            if (shortfall > 0) {
                return "insufficient liquidity";
            }
        }
        return "";
    }

    function borrowVerify(address user, uint borrowAmount) public {
    }

    function repayBorrowAllowed(address payer, address borrower, uint repayAmount) public returns (string memory){
        refreshMarketDeposit();
        updateBorrowIndex();
        distributeBorrowerCFGT(borrower);
        return "";
    }

    function repayBorrowVerify(address payer, address user, uint repayAmount) public {
    }

    function liquidateBorrowAllowed(address dToken, address liquidator, address borrower, uint repayAmount)
    public returns (string memory){
        refreshMarketDeposit();
        if (borrower == publicBorrower) {
            return "disable liquidate public borrower";
        }
        (uint err, , uint shortfall) = getAccountLiquidity(borrower);
        if (err != 0) {
            return "calculate account liquidity failed";
        }
        if (shortfall == 0) {
            return "insufficient shortfall";
        }
        uint borrowBalance = borrowPool.getBorrows(liquidator);
        (MathError mathErr, uint maxClose) = mulScalarTruncate(Exp({mantissa : maxCloseFactor}), borrowBalance);
        if (mathErr != MathError.NO_ERROR) {
            return "calculate maxClose failed";
        }
        if (repayAmount > maxClose) {
            return "liquidate too much";
        }
        return "";
    }

    function liquidateBorrowVerify(address dToken, address liquidator, address borrower, uint repayAmount,
        uint seizedTokens) public {
    }

    function seizeAllowed(address dToken, address _borrowPool, address liquidator, address borrower, uint seizedTokens)
    public returns (string memory){
        // check dToken is registered
        bool existed = false;
        for (uint i = 0; i < markets.length; i++) {
            if (markets[i] == dToken) {
                existed = true;
            }
        }
        if (!existed) {
            return "dToken not existed";
        }
        if (_borrowPool != address(borrowPool)) {
            return "borrow pool mismatch";
        }
        // there is no need refresh market deposit here, because liquidate and repay borrow happened
        distributeInterest(dToken, liquidator);
        distributeInterest(dToken, borrower);
        distributeSupplierCFGT(dToken, liquidator);
        distributeSupplierCFGT(dToken, borrower);
        return "";
    }

    function seizeVerify(address dToken, address liquidator, address borrower, uint seizedTokens)
    public {
    }

    function transferAllowed(address dToken, address from, address to, uint amount)
    public returns (string memory){
        refreshMarketDeposit();
        distributeInterest(dToken, from);
        distributeInterest(dToken, to);
        distributeSupplierCFGT(dToken, from);
        distributeSupplierCFGT(dToken, to);
        (MathError err, , uint shortfall) = getHypotheticalAccountLiquidity(from, dToken, amount, 0);
        if (err != MathError.NO_ERROR) {
            return "calculate account liquidity failed";
        }
        if (shortfall > 0) {
            return "insufficient liquidity";
        }
        return "";
    }

    function transferVerify(address dToken, address from, address to, uint amount)
    public {
    }

    function liquidateCalculateSeizeTokens(address dToken, uint repayAmount)
    public view returns (string memory, uint){
        Exp memory repayValue = Exp(repayAmount * expScale);
        (MathError err, Exp memory incentiveRepayValue) = mulExp(Exp(liquidationIncentive), repayValue);
        if (err != MathError.NO_ERROR) {
            return ("calculate incentive value failed", 0);
        }
        uint seizedTokens = DTokenInterface(dToken).tokenAmount(incentiveRepayValue.mantissa);
        return ("", seizedTokens);
    }

    /// @return (errCode, liquidity, shortfall), the value is exponential
    function getSystemLiquidity() public view returns (uint, uint, uint){
        (MathError err, uint liquidity, uint shortfall) = getHypotheticalSystemLiquidity(address(0), 0, 0);
        return (uint(err), liquidity, shortfall);
    }

    function getHypotheticalSystemLiquidity(address dToken, uint redeemTokens, uint borrowAmount)
    internal view returns (MathError, uint, uint){
        Exp memory systemFactor = Exp(systemUtilizationRate);
        Exp memory deposit = Exp(totalDeposit);
        (MathError err, Exp memory borrowLimit) = mulExp(systemFactor, deposit);
        if (err != MathError.NO_ERROR) {
            return (err, 0, 0);
        }
        uint totalBorrows = borrowPool.totalBorrows();
        Exp memory hypotheticalBorrows = Exp((totalBorrows + borrowAmount) * expScale);
        Exp memory hypotheticalRedeemValue = Exp(dToken == address(0) ?
            0 : DTokenInterface(dToken).tokenValue(redeemTokens));
        (MathError err1,Exp memory borrowEffects) = addExp(hypotheticalBorrows, hypotheticalRedeemValue);
        if (err1 != MathError.NO_ERROR) {
            return (err, 0, 0);
        }
        if (lessThanExp(borrowEffects, borrowLimit)) {
            return (MathError.NO_ERROR, borrowLimit.mantissa - borrowEffects.mantissa, 0);
        } else {
            return (MathError.NO_ERROR, 0, borrowEffects.mantissa - borrowLimit.mantissa);
        }
    }

    /// @return (errCode, liquidity, shortfall), the value is exponential
    /// @notice if account is publicBorrower, the shortfall is always no less than 0
    function getAccountLiquidity(address account) public view returns (uint, uint, uint){
        (MathError err, uint liquidity, uint shortfall) = getHypotheticalAccountLiquidity(account, address(0), 0, 0);
        return (uint(err), liquidity, shortfall);
    }

    function getHypotheticalAccountLiquidity(address account, address dToken, uint redeemTokens, uint borrowAmount)
    internal view returns (MathError, uint, uint){
        (uint mErr, uint accountBorrowLimit) = getAccountBorrowLimit(account);
        if (mErr != 0) {
            return (MathError(mErr), 0, 0);
        }
        Exp memory redeems = Exp(redeemTokens > 0 ? DTokenInterface(dToken).tokenValue(redeemTokens) : 0);
        Exp memory hypotheticalBorrows = add_(redeems, Exp(borrowAmount * expScale));
        Exp memory borrowLimit = Exp(accountBorrowLimit);
        if (lessThanExp(hypotheticalBorrows, borrowLimit)) {
            return (MathError.NO_ERROR, sub_(borrowLimit, hypotheticalBorrows).mantissa, 0);
        } else {
            return (MathError.NO_ERROR, 0, sub_(hypotheticalBorrows, borrowLimit).mantissa);
        }
    }

    /// @return (errCode, borrowLimit), value is exponential
    function getAccountBorrowLimit(address account) public view returns (uint, uint){
        Exp memory borrowLimit = Exp(0);
        for (uint i = 0; i < markets.length; i++) {
            address market = markets[i];
            Exp memory userDeposit = Exp(DTokenInterface(market).userDepositValue(account));
            if (userDeposit.mantissa == 0) {
                continue;
            }
            Exp memory factor = Exp(collateralFactor[market]);
            (MathError err, Exp memory assetBorrowLimit) = mulExp(factor, userDeposit);
            if (err != MathError.NO_ERROR) {
                return (uint(err), 0);
            }
            borrowLimit = add_(borrowLimit, assetBorrowLimit);
        }
        return (0, borrowLimit.mantissa);
    }

    /* distribution function */

    // update CFGT borrower distribution index
    /// @notice if there are no borrows, accrued CFGT has been accumulated
    function updateBorrowIndex() internal {
        uint deltaBlock = block.number - borrowDistributedBlock;
        if (deltaBlock > 0 && borrowSpeed > 0) {
            uint borrowCFGTAccrued = mul_(borrowSpeed, deltaBlock);
            Exp memory borrowPoolIndex = Exp(borrowPool.borrowIndex());
            uint totalBorrows = div_(borrowPool.totalBorrows(), borrowPoolIndex);
            if (totalBorrows > 0) {
                Double memory ratio = fraction(borrowCFGTAccrued, totalBorrows);
                borrowIndex = add_(borrowIndex, ratio.mantissa);
                borrowDistributedBlock = block.number;
            }
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
            userState.mantissa = doubleScale;
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
            userState.mantissa = doubleScale;
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
            userState.mantissa = doubleScale;
        }
        Double memory deltaIndex = sub_(globalState, userState);
        Exp memory borrowPoolIndex = Exp(borrowPool.borrowIndex());
        uint userBorrows = div_(borrowPool.getBorrows(user), borrowPoolIndex);
        uint userDelta = mul_(userBorrows, deltaIndex);
        userAccrued[user] = add_(userAccrued[user], userDelta);
        if (IERC20(CFGT).transferFrom(CFGT, user, userAccrued[user])) {
            userAccrued[user] = 0;
        }
        emit DistributeBorrowerCFGT(user, userDelta, globalState.mantissa);
    }

    function claimAllProfit(address[] memory accounts) public {
        refreshMarketDeposit();
        updateBorrowIndex();
        for (uint i = 0; i < accounts.length; i++) {
            for (uint j = 0; j < markets.length; j++) {
                distributeInterest(markets[j], accounts[i]);
                distributeSupplierCFGT(markets[j], accounts[i]);
            }
            distributeBorrowerCFGT(accounts[i]);
        }
    }

    function claimInterest(address[] memory markets, address[] memory accounts) public {
        refreshMarketDeposit();
        for (uint i = 0; i < accounts.length; i++) {
            for (uint j = 0; j < markets.length; j++) {
                distributeInterest(markets[j], accounts[i]);
            }
        }
    }

    function claimSupplierCFGT(address[] memory markets, address[] memory accounts) public {
        refreshMarketDeposit();
        for (uint i = 0; i < accounts.length; i++) {
            for (uint j = 0; j < markets.length; j++) {
                distributeSupplierCFGT(markets[j], accounts[i]);
            }
        }
    }

    function claimBorrowerCFGT(address[] memory accounts) public {
        refreshMarketDeposit();
        updateBorrowIndex();
        for (uint i = 0; i < accounts.length; i++) {
            distributeBorrowerCFGT(accounts[i]);
        }
    }

    /* admin function */

    function setCFToken(CycleStableCoin cfsc, address cfgt) public onlyOwner {
        CycleStableCoin oldSC = CFSC;
        address oldGT = CFGT;
        CFSC = cfsc;
        CFGT = cfgt;
        emit NewCFToken(oldSC, cfsc, oldGT, cfgt);
    }

    function registerMarket(address market, uint _collateralFactor) public onlyOwner {
        bool existed = false;
        for (uint i = 0; i < markets.length; i++) {
            if (markets[i] == market) {
                existed = true;
                break;
            }
        }
        require(!existed, "already registered");
        DTokenInterface dToken = DTokenInterface(market);
        // check some dToken interface
        require(dToken.isDToken());
        require(dToken.userDepositValue(address(this)) == 0);
        require(dToken.depositValue() == 0);
        markets.push(market);
        require(_collateralFactor < expScale, "illegal collateral factor");
        collateralFactor[market] = _collateralFactor;
        refreshMarketDeposit();
        emit RegisterMarket(market);
    }

    function reduceServes() public onlyOwner {
        refreshMarketDeposit();
        borrowPool.reduceReserves(owner());
    }

    //    function setOracle(IOracle _oracle) public onlyOwner {
    //        IOracle oldOracle = oracle;
    //        oracle = _oracle;
    //        emit NewOracle(oldOracle, _oracle);
    //    }

    function setPublicBorrower(address newBorrower) public onlyOwner {
        address oldBorrower = publicBorrower;
        uint publicBorrows = borrowPool.getBorrows(oldBorrower);
        require(publicBorrows == 0, "old public borrower is indebted");
        publicBorrower = newBorrower;
        emit NewPublicBorrower(oldBorrower, newBorrower);
    }

    function setBorrowPool(BorrowsInterface newBorrowPool) public onlyOwner {
        BorrowsInterface oldPool = borrowPool;
        if (address(oldPool) != address(0)) {
            require(oldPool.totalBorrows() == 0, "system has borrows");
        }
        borrowPool = newBorrowPool;
        emit NewBorrowPool(oldPool, newBorrowPool);
    }

    function setSupplySpeed(uint newSpeed) public onlyOwner {
        uint oldSpeed = supplySpeed;
        refreshMarketDeposit();
        supplySpeed = newSpeed;
        emit NewSupplySpeed(oldSpeed, newSpeed);
    }

    function setBorrowSpeed(uint newSpeed) public onlyOwner {
        uint oldSpeed = borrowSpeed;
        updateBorrowIndex();
        borrowSpeed = newSpeed;
        emit NewBorrowSpeed(oldSpeed, newSpeed);
    }

    function setCollateralFactor(address dToken, uint factor) public onlyOwner {
        uint oldFactor = collateralFactor[dToken];
        require(factor < expScale, "illegal factor");
        bool exited = false;
        for (uint i = 0; i < markets.length; i++) {
            if (markets[i] == dToken) {
                exited = true;
                break;
            }
        }
        require(exited, "dToken is not existed");
        collateralFactor[dToken] = factor;
        emit NewCollateralFactor(dToken, oldFactor, factor);
    }

    /// @notice don't limit the minimum UR
    function setSystemUtilizationRate(uint rate) public onlyOwner {
        uint oldRate = systemUtilizationRate;
        require(rate < expScale, "illegal utilization rate");
        systemUtilizationRate = rate;
        emit NewUtilizationRate(oldRate, rate);
    }

    function setMaxCloseFactor(uint factor) public onlyOwner {
        uint oldFactor = maxCloseFactor;
        require(factor < expScale, "illegal factor");
        maxCloseFactor = factor;
        emit NewMaxCloseFactor(oldFactor, factor);
    }

    function setLiquidationIncentive(uint incentive) public onlyOwner {
        uint oldIncentive = liquidationIncentive;
        require(incentive > expScale, "illegal incentive");
        liquidationIncentive = incentive;
        emit NewLiquidationIncentive(oldIncentive, incentive);
    }
}
