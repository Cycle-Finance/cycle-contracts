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

    mapping(address => AggregatorV3Interface) chainlink;

    constructor()Ownable(){
        // ether => ETH/USD
        chainlink[address(0)] = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
        // WBTC => BTC/ETH
        chainlink[0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599] = AggregatorV3Interface(0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c);
        // USDT => USDT/ETH
        chainlink[0xdAC17F958D2ee523a2206206994597C13D831ec7] = AggregatorV3Interface(0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46);
        // USDC => USDC/ETH
        chainlink[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48] = AggregatorV3Interface(0x986b5E1e1755e3C2440e960477f25201B0a8bbD4);
    }

    function registerOracle(address token, address oracle) public onlyOwner {
        chainlink[token] = AggregatorV3Interface(oracle);
    }

    // normalize price to Exponential
    function getPrice(address asset) public view override returns (uint){
        AggregatorV3Interface ethOracle = chainlink[address(0)];
        (,int256 ethAnswer, , ,) = ethOracle.latestRoundData();
        uint expScale = 10 ** 18;
        uint ethExpPrice = uint(ethAnswer).mul(expScale).div(10 ** ethOracle.decimals());
        if (asset == address(0)) {
            // return ethExpPrice * expScale / 10**18(ethDecimals)
            return ethExpPrice;
        }
        AggregatorV3Interface assetOracle = chainlink[asset];
        (,int256 assetAnswer, , ,) = assetOracle.latestRoundData();
        uint assetExpPrice = uint(assetAnswer).mul(expScale).div(10 ** assetOracle.decimals());
        // the price is double scale
        uint price = assetExpPrice.mul(ethExpPrice);
        uint assetDecimals = Decimals(asset).decimals();
        return price.div(10 ** assetDecimals);
    }
}
