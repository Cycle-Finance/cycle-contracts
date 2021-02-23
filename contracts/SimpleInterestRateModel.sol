// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "./interfaces/InterestRateModel.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./math/ExponentialNoError.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleInterestRateModel is InterestRateModel, ExponentialNoError, Ownable {

    event NewInterestParams(uint baseRatePerBlock, uint multiplierPerBlock);

    /**
     * @notice The approximate number of blocks per year that is assumed by the interest rate model
     */
    uint constant public  blocksPerYear = 2102400;

    /**
     * @notice The multiplier of utilization rate that gives the slope of the interest rate
     */
    uint public multiplierPerBlock;

    /**
     * @notice The base interest rate which is the y-intercept when utilization rate is 0
     */
    uint public baseRatePerBlock;

    /**
     * @notice Construct an interest rate model
     * @param baseRatePerYear The approximate target base APR, as a mantissa (scaled by 1e18)
     * @param multiplierPerYear The rate of increase in interest rate wrt utilization (scaled by 1e18)
     */
    constructor(uint baseRatePerYear, uint multiplierPerYear)Ownable() public {
        updateParam(baseRatePerYear, multiplierPerYear);
    }

    function updateParam(uint baseRatePerYear, uint multiplierPerYear) public onlyOwner {
        baseRatePerBlock = div_(baseRatePerYear, blocksPerYear);
        multiplierPerBlock = div_(multiplierPerYear, blocksPerYear);

        emit NewInterestParams(baseRatePerBlock, multiplierPerBlock);
    }

    /**
     * @notice Calculates the utilization rate of the market: `borrows / depositValue`
     * @param depositValueMantissa the value of all market deposit
     * @param borrowsValueMantissa total borrows
     * @return The utilization rate as a mantissa between [0, 1e18]
     */
    function utilizationRate(uint depositValueMantissa, uint borrowsValueMantissa) public pure returns (uint) {
        // Utilization rate is 0 when there are no borrows
        if (borrowsValueMantissa == 0) {
            return 0;
        }
        Exp memory deposit = Exp(depositValueMantissa);
        Exp memory borrows = Exp(borrowsValueMantissa);
        return div_(deposit, borrows).mantissa;
    }

    /**
     * @notice Calculates the current borrow rate per block
     * @param depositValueMantissa the value of all market deposit
     * @param borrowsValueMantissa total borrows
     * @return The borrow rate percentage per block as a mantissa (scaled by 1e18)
     */
    function borrowRatePerBlock(uint depositValueMantissa, uint borrowsValueMantissa)
    public override view returns (uint) {
        Exp memory ur = Exp(utilizationRate(depositValueMantissa, borrowsValueMantissa));
        Exp memory multiplier = Exp(multiplierPerBlock);
        Exp memory urInterestRate = mul_(ur, multiplier);
        Exp memory baseRate = Exp(baseRatePerBlock);
        return add_(urInterestRate, baseRate).mantissa;
    }

    /**
     * @notice Calculates the current supply rate per block
     * @param depositValueMantissa the value of all market deposit
     * @param borrowsValueMantissa total borrows
     * @param reserveFactorMantissa The current reserve factor for the system
     * @return The supply rate percentage per block as a mantissa (scaled by 1e18)
     */
    function supplyRatePerBlock(uint depositValueMantissa, uint borrowsValueMantissa, uint reserveFactorMantissa)
    public override view returns (uint) {
        Exp memory oneMinusReserveFactor = Exp(sub_(expScale, reserveFactorMantissa));
        Exp memory borrowRate = Exp(borrowRatePerBlock(depositValueMantissa, borrowsValueMantissa));
        Exp memory rateToPool = mul_(oneMinusReserveFactor, borrowRate);
        Exp memory ur = Exp(utilizationRate(depositValueMantissa, borrowsValueMantissa));
        return mul_(ur, rateToPool).mantissa;
    }

    function isInterestRateModel() public override pure returns (bool){
        return true;
    }
}
