// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "@chainlink/contracts/src/v0.7/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IOracle {
    function getPrice(address asset) external view returns (uint);
}

interface Decimals {
    function decimals() external view returns (uint);
}

contract Oracle is IOracle, Ownable {

    using SafeMath for uint;

    uint private constant  expScale = 10 ** 18;

    mapping(address => AggregatorV3Interface) public chainlink;

    constructor()Ownable(){
    }

    function registerOracle(address token, address oracle) public onlyOwner {
        chainlink[token] = AggregatorV3Interface(oracle);
    }

    // normalize price to Exponential and truncate with asset decimals
    function getPrice(address asset) public view override returns (uint){
        AggregatorV3Interface assetOracle = chainlink[asset];
        (,int256 assetAnswer, , ,) = assetOracle.latestRoundData();
        uint assetExpPrice = uint(assetAnswer).mul(expScale).div(10 ** assetOracle.decimals());
        uint assetDecimals = 18;
        if (asset != address(0)) {
            assetDecimals = Decimals(asset).decimals();
        }
        require(assetDecimals < 40, "asset decimals exceed");
        return assetExpPrice.mul(expScale).div(10 ** assetDecimals);
    }
}
