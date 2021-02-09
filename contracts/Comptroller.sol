// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "./ComptrollerStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./math/Exponential.sol";
import "./SafeERC20.sol";
import "./DTokenInterface.sol";

contract Comptroller is ComptrollerStorage, Ownable, Exponential {

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
            uint dTokenTotalSupply = IERC20(market).totalSupply();
            Exp memory marketWeight = getExp(marketDeposit[market], totalDeposit);
            /* update interest index */
            (MathError err, uint marketInterest) = mulScalarTruncate(marketWeight, interest);
            require(err == MathError.NO_ERROR, "cal market interest failed");
            Double memory interestRatio = fraction(marketInterest, dTokenTotalSupply);
            marketInterestIndex[market] = add_(marketInterestIndex[market], interestRatio.mantissa);
            /* update supply index */
            if (supplyCFGTAccrued > 0) {
                (MathError err, uint marketSupplyCFGT) = mulScalarTruncate(marketWeight, supplyCFGTAccrued);
                require(err == MathError.NO_ERROR, "cal market interest failed");
                Double memory supplyRatio = fraction(marketSupplyCFGT, dTokenTotalSupply);
                supplyIndex[market] = add_(supplyIndex[market], supplyRatio.mantissa);
            }
            /* update market deposit */
            Exp memory deposit = Exp(DTokenInterface(market).deposit());
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
}
