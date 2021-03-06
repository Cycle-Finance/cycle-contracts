// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
//pragma abicoder v2;

import "./storage/ComptrollerStorage.sol";
import "./math/Exponential.sol";
import "./SafeERC20.sol";
import "./interfaces/DTokenInterface.sol";
import "./interfaces/ComptrollerInterface.sol";

// If there are no deposit and borrows, the wing will not accumulate, and the distribution state will go ahead

contract Comptroller is ComptrollerStorage, ComptrollerInterface, Exponential {

    /* event */
    event DistributeInterest(address indexed market, address indexed user, uint amount, uint index);
    event DistributeSupplierCFGT(address indexed market, address indexed user, uint amount, uint index);
    event DistributeBorrowerCFGT(address indexed user, uint amount, uint index);

    event RegisterMarket(address dToken);
    event ReduceReserves(address indexed owner, uint amount);
    event NewPublicBorrower(address oldPublicBorrower, address newPublicBorrower);
    event NewBorrowPool(BorrowsInterface oldBorrowPool, BorrowsInterface newBorrowPool);

    event NewSupplySpeed(uint oldSpeed, uint newSpeed);
    event NewBorrowSpeed(uint oldSpeed, uint newSpeed);

    event NewCollateralFactor(address dToken, uint oldFactor, uint newFactor);
    event NewPublicBorrowThreshold(uint oldThreshold, uint newThreshold);
    event NewMaxUtilizationRate(uint oldRate, uint newRate);
    event NewMaxCloseFactor(uint oldFactor, uint newFactor);
    event NewLiquidationIncentive(uint oldIncentive, uint newIncentive);

    /// @notice Emitted when an action is paused globally
    event ActionPaused(string action, bool pauseState);

    /// @notice Emitted when an action is paused on a market
    event ActionPaused(DTokenInterface dToken, string action, bool pauseState);

    function _isComptroller() public override pure returns (bool){
        return true;
    }

    function _totalDeposit() public override view returns (uint){
        return totalDeposit;
    }

    /*
    * @notice accrue interest, update interest index, update supply CFGT index, refresh market deposit
    * @notice the function could be invoked individually
    * @notice we should make sure that the updates of marketDeposit and marketTotalSupply is synchronized
    * @notice but we mustn't update deposit value before update index, because the change of index represent
    * @notice the settlement of elder states
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
            uint dTokenTotalSupply = IERC20(market).totalSupply();
            if (marketDeposit[market] > 0 && totalDeposit > 0 && dTokenTotalSupply > 0) {
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
                    require(err2 == MathError.NO_ERROR, "cal market CFGT failed");
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
        require(borrowPool._accrualBlockNumber() == block.number, "stale accrual interest block");
        // update total deposit
        totalDeposit = tempTotalDeposit;
    }

    function updateDepositOnly() internal {
        uint tempTotalDeposit = 0;
        for (uint i = 0; i < markets.length; i++) {
            address market = markets[i];
            /* update market deposit */
            uint deposit = DTokenInterface(market).depositValue();
            marketDeposit[market] = deposit;
            tempTotalDeposit += deposit;
        }
        totalDeposit = tempTotalDeposit;
    }

    // @return 0 means that no error
    function mintAllowed(address dToken, address minter, uint amount) public override returns (string memory){
        require(!mintPaused[dToken], "mint is paused");
        /* shield compiler warning -- unused variable */
        amount;
        refreshMarketDeposit();
        distributeInterest(dToken, minter);
        distributeSupplierCFGT(dToken, minter);
        return "";
    }

    // @return 0 means that no error
    /// @notice as the synchronization of market deposit value and total supply, we should update market deposit at here
    function mintVerify(address, address, uint) public override {
        updateDepositOnly();
    }

    function redeemAllowed(address dToken, address redeemer, uint redeemTokens)
    public override returns (string memory){
        refreshMarketDeposit();
        distributeInterest(dToken, redeemer);
        distributeSupplierCFGT(dToken, redeemer);
        if (borrowPool.getBorrows(publicBorrower) > 0) {
            (MathError errS, , uint systemShortfall) = getHypotheticalSystemLiquidity(dToken, redeemTokens, 0);
            if (errS != MathError.NO_ERROR) {
                return "calculate system liquidity failed";
            }
            if (systemShortfall > 0) {
                return "insufficient system liquidity";
            }
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

    /// @notice as the synchronization of market deposit value and total supply, we should update market deposit at here
    function redeemVerify(address, address, uint) public override {
        updateDepositOnly();
    }

    function borrowAllowed(address user, uint borrowAmount) public override returns (string memory){
        require(!borrowPaused, "borrow is paused");
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
        } else {
            // totalBorrowsValue = _totalBorrows * cfscPrice / expScale
            Exp memory totalBorrowsValue = Exp(borrowPool._totalBorrows());
            (MathError err, Exp memory utilizationRate) = divExp(totalBorrowsValue, Exp(totalDeposit));
            if (err != MathError.NO_ERROR) {
                return "public borrow failed: UR";
            }
            if (lessThanOrEqualExp(Exp(publicBorrowThreshold), utilizationRate)) {
                return "public borrow failed: threshold";
            }
        }
        return "";
    }

    function borrowVerify(address, uint) public override {
    }

    function repayBorrowAllowed(address payer, address borrower, uint repayAmount) public override returns (string memory){
        /* shield compiler warning -- unused variable */
        payer;
        repayAmount;

        refreshMarketDeposit();
        updateBorrowIndex();
        distributeBorrowerCFGT(borrower);
        return "";
    }

    function repayBorrowVerify(address, address, uint) public override {
    }

    function liquidateBorrowAllowed(address dToken, address liquidator, address borrower, uint repayAmount)
    public override returns (string memory){
        /* shield compiler warning -- unused variable */
        dToken;
        liquidator;

        refreshMarketDeposit();
        if (borrower == publicBorrower) {
            return "disable liquidate public borrower";
        }
        (uint err,, uint shortfall) = getAccountLiquidity(borrower);
        if (err != 0) {
            return "calculate account liquidity failed";
        }
        if (shortfall == 0) {
            return "insufficient shortfall";
        }
        uint borrowBalance = borrowPool.getBorrows(borrower);
        (MathError mathErr, uint maxClose) = mulScalarTruncate(Exp({mantissa : maxCloseFactor}), borrowBalance);
        if (mathErr != MathError.NO_ERROR) {
            return "calculate maxClose failed";
        }
        if (repayAmount > maxClose) {
            return "liquidate too much";
        }
        return "";
    }

    function liquidateBorrowVerify(address, address, address, uint, uint) public override {
    }

    function seizeAllowed(address dToken, address _borrowPool, address liquidator, address borrower, uint seizedTokens)
    public override returns (string memory){
        require(!seizePaused, "seize is paused");
        /* shield compiler warning -- unused variable */
        seizedTokens;

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

    function seizeVerify(address, address, address, address, uint) public override {
    }

    function transferAllowed(address dToken, address from, address to, uint amount)
    public override returns (string memory){
        require(!transferPaused, "transfer is paused");
        refreshMarketDeposit();
        distributeInterest(dToken, from);
        distributeInterest(dToken, to);
        distributeSupplierCFGT(dToken, from);
        distributeSupplierCFGT(dToken, to);
        (MathError err,, uint shortfall) = getHypotheticalAccountLiquidity(from, dToken, amount, 0);
        if (err != MathError.NO_ERROR) {
            return "calculate account liquidity failed";
        }
        if (shortfall > 0) {
            return "insufficient liquidity";
        }
        return "";
    }

    function transferVerify(address, address, address, uint) public override {
    }

    function liquidateCalculateSeizeTokens(address dToken, uint repayAmount)
    public override view returns (string memory, uint){
        // repayValue = repayAmount * cfscPrice / expScale
        Exp memory repayValue = Exp(repayAmount);
        (MathError err, Exp memory incentiveRepayValue) = mulExp(Exp(liquidationIncentive), repayValue);
        if (err != MathError.NO_ERROR) {
            return ("calculate incentive value failed", 0);
        }
        uint seizedTokens = DTokenInterface(dToken).tokenAmount(incentiveRepayValue.mantissa);
        return ("", seizedTokens);
    }

    // return latest system liquidity
    /// @notice should refresh market deposit to use latest market deposit value
    function getCurrentSystemLiquidity() public override returns (uint, uint, uint){
        refreshMarketDeposit();
        (MathError err, uint liquidity, uint shortfall) = getHypotheticalSystemLiquidity(address(0), 0, 0);
        return (uint(err), liquidity, shortfall);
    }

    /// @return (errCode, liquidity, shortfall), the value is exponential
    function getSystemLiquidity() public override view returns (uint, uint, uint){
        (MathError err, uint liquidity, uint shortfall) = getHypotheticalSystemLiquidity(address(0), 0, 0);
        return (uint(err), liquidity, shortfall);
    }

    function getHypotheticalSystemLiquidity(address dToken, uint redeemTokens, uint borrowAmount)
    internal view returns (MathError, uint, uint){
        Exp memory deposit = Exp(totalDeposit);
        uint totalBorrows = borrowPool._totalBorrows();
        // borrows value = borrowBalance * CFSC price / expScale
        Exp memory hypotheticalBorrows = Exp(add_(totalBorrows, borrowAmount) * 1);
        Exp memory hypotheticalRedeemValue = Exp(dToken == address(0) ?
            0 : DTokenInterface(dToken).tokenValue(redeemTokens));
        (MathError err, Exp memory remainLiquidity) = subExp(deposit, hypotheticalRedeemValue);
        if (err != MathError.NO_ERROR) {
            return (err, 0, 0);
        }
        Exp memory systemFactor = Exp(maxSystemUtilizationRate);
        (MathError err1, Exp memory borrowLimit) = mulExp(systemFactor, remainLiquidity);
        if (err1 != MathError.NO_ERROR) {
            return (err1, 0, 0);
        }
        if (lessThanOrEqualExp(hypotheticalBorrows, borrowLimit)) {
            return (MathError.NO_ERROR, borrowLimit.mantissa - hypotheticalBorrows.mantissa, 0);
        } else {
            return (MathError.NO_ERROR, 0, hypotheticalBorrows.mantissa - borrowLimit.mantissa);
        }
    }

    /// @return (errCode, liquidity, shortfall), the value is exponential
    /// @notice if account is publicBorrower, the shortfall is always no less than 0
    function getAccountLiquidity(address account) public override view returns (uint, uint, uint){
        (MathError err, uint liquidity, uint shortfall) = getHypotheticalAccountLiquidity(account, address(0), 0, 0);
        return (uint(err), liquidity, shortfall);
    }

    function getHypotheticalAccountLiquidity(address account, address dToken, uint redeemTokens, uint borrowAmount)
    internal view returns (MathError, uint, uint){
        Exp memory borrowLimit;
        for (uint i = 0; i < markets.length; i++) {
            address market = markets[i];
            uint balance = IERC20(market).balanceOf(account);
            if (dToken == market) {
                (MathError err, uint hypotheticalBalance) = subUInt(balance, redeemTokens);
                if (err != MathError.NO_ERROR) {
                    return (err, 0, 0);
                }
                balance = hypotheticalBalance;
            }
            Exp memory userDeposit = Exp(DTokenInterface(market).tokenValue(balance));
            Exp memory factor = Exp(collateralFactor[market]);
            (MathError err1, Exp memory assetBorrowLimit) = mulExp(factor, userDeposit);
            if (err1 != MathError.NO_ERROR) {
                return (err1, 0, 0);
            }
            borrowLimit = add_(borrowLimit, assetBorrowLimit);
        }
        uint totalBorrows = borrowPool.getBorrows(account) + borrowAmount;
        // hypotheticalBorrows = totalBorrows * CFSCPrice / expScale
        Exp memory hypotheticalBorrows = Exp(totalBorrows);
        if (lessThanOrEqualExp(hypotheticalBorrows, borrowLimit)) {
            return (MathError.NO_ERROR, borrowLimit.mantissa - hypotheticalBorrows.mantissa, 0);
        } else {
            return (MathError.NO_ERROR, 0, hypotheticalBorrows.mantissa - borrowLimit.mantissa);
        }
    }

    /* distribution function */

    // update CFGT borrower distribution index
    /// @notice if there are no borrows, accrued CFGT has been accumulated
    function updateBorrowIndex() internal {
        uint deltaBlock = block.number - borrowDistributedBlock;
        if (deltaBlock > 0 && borrowSpeed > 0) {
            uint borrowCFGTAccrued = mul_(borrowSpeed, deltaBlock);
            Exp memory borrowPoolIndex = Exp(borrowPool._borrowIndex());
            uint totalBorrows = div_(borrowPool._totalBorrows(), borrowPoolIndex);
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
        if (userDelta > 0) {
            CFSC.transfer(user, userDelta);
        }
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
        if (userAccrued[user] > 0) {
            if (transferCFGT(user, userAccrued[user])) {
                userAccrued[user] = 0;
            }
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
        Exp memory borrowPoolIndex = Exp(borrowPool._borrowIndex());
        uint userBorrows = div_(borrowPool.getBorrows(user), borrowPoolIndex);
        uint userDelta = mul_(userBorrows, deltaIndex);
        userAccrued[user] = add_(userAccrued[user], userDelta);
        if (userAccrued[user] > 0) {
            if (transferCFGT(user, userAccrued[user])) {
                userAccrued[user] = 0;
            }
        }
        emit DistributeBorrowerCFGT(user, userDelta, globalState.mantissa);
    }

    function transferCFGT(address to, uint amount) internal returns (bool){
        IERC20 erc20 = IERC20(CFGT);
        if (erc20.balanceOf(CFGT) < amount) {
            return false;
        }
        return erc20.transferFrom(CFGT, to, amount);
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

    function initialize(CycleStableCoin cfsc, address cfgt, BorrowsInterface _borrowPool) public onlyOwner {
        require(borrowIndex == 0, "could be initialized only once");
        CFSC = cfsc;
        CFGT = cfgt;
        require(_borrowPool.isBorrowPool(), "illegal borrow pool");
        borrowPool = _borrowPool;
        borrowIndex = doubleScale;
        refreshedBlock = block.number;
        borrowDistributedBlock = block.number;
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
        supplyIndex[market] = doubleScale;
        marketInterestIndex[market] = doubleScale;
        refreshMarketDeposit();
        emit RegisterMarket(market);
    }

    function reduceServes() public onlyOwner {
        refreshMarketDeposit();
        borrowPool.reduceReserves(owner());
    }

    function setReserveFactor(uint factor) public onlyOwner {
        refreshMarketDeposit();
        borrowPool.setReserveFactor(factor);
    }

    function setInterestRateModel(address interestRateModel) public onlyOwner {
        refreshMarketDeposit();
        borrowPool.setInterestRateModel(interestRateModel);
    }

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
            require(oldPool._totalBorrows() == 0, "system has borrows");
        }
        require(newBorrowPool.isBorrowPool(), "illegal borrow pool");
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
    function setPublicBorrowThreshold(uint threshold) public onlyOwner {
        uint oldThreshold = publicBorrowThreshold;
        require(threshold < maxSystemUtilizationRate, "illegal threshold");
        publicBorrowThreshold = threshold;
        emit NewPublicBorrowThreshold(oldThreshold, threshold);
    }

    /// @notice don't limit the minimum UR
    function setMaxSystemUtilizationRate(uint rate) public onlyOwner {
        uint oldRate = maxSystemUtilizationRate;
        require(rate < expScale, "illegal utilization rate");
        maxSystemUtilizationRate = rate;
        emit NewMaxUtilizationRate(oldRate, rate);
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

    /// @notice maybe check market is existed
    function setMintPaused(DTokenInterface market, bool paused) public onlyOwner {
        mintPaused[address(market)] = paused;
        emit ActionPaused(market, "Mint", paused);
    }

    function setBorrowPaused(bool paused) public onlyOwner {
        borrowPaused = paused;
        emit ActionPaused("Borrow", paused);
    }

    function setTransferPaused(bool paused) public onlyOwner {
        transferPaused = paused;
        emit ActionPaused("Transfer", paused);
    }

    function setSeizePaused(bool paused) public onlyOwner {
        seizePaused = paused;
        emit ActionPaused("Seize", paused);
    }
}
