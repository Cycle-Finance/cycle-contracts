// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
//pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CycleStableCoin.sol";
import "./Oracle.sol";
import "./math/Exponential.sol";
import "./SafeERC20.sol";

contract ExchangePool is Ownable, Exponential {
    using SafeERC20 for address;
    Oracle public oracle;

    uint public constant CFSC_PRICE = expScale;

    CycleStableCoin public CFSC;
    mapping(address => bool) public supportedAssets;

    uint public feeRate;

    /* modifier */
    modifier assetSupported(address asset){
        require(supportedAssets[asset], "asset is unsupported");
        _;
    }

    event SetSupportedAsset(address indexed asset, bool valid);
    event FeeRateUpdated(uint oldRate, uint newRate);
    event MintCFSC(address minter, uint amount);
    event BurnCFSC(address burner, uint amount);

    constructor()Ownable(){

    }

    function setOracle(address _oracle) public onlyOwner {
        oracle = Oracle(_oracle);
    }

    function setCFSC(address cfsc) public onlyOwner {
        CFSC = CycleStableCoin(cfsc);
    }

    function setSupportedAsset(address asset, bool valid) public onlyOwner {
        supportedAssets[asset] = valid;
        emit SetSupportedAsset(asset, valid);
    }

    function setFeeRate(uint rate) public onlyOwner {
        require(rate < expScale, "illegal fee rate");
        uint oldRate = feeRate;
        feeRate = rate;
        emit FeeRateUpdated(oldRate, rate);
    }

    function withdrawFee(address recipient, uint amount) public onlyOwner {
        require(CFSC.balanceOf(address(this)) <= amount, "fee isn't enough");
        require(CFSC.transfer(recipient, amount), "transfer fee failed");
    }

    // return minted CFSC amount
    function mint(address asset, uint tokenAmount) public assetSupported(asset) returns (uint){
        // transfer asset to self
        require(asset.safeTransferFrom(msg.sender, address(this), tokenAmount), "transferFrom failed");
        Exp memory price = Exp(oracle.getPrice(asset));
        // because CFSC decimals is same with expScale, the cfscAmount is the final result
        (MathError err, uint cfscAmount) = mulScalarTruncate(price, tokenAmount);
        require(err == MathError.NO_ERROR, "calculate CFSC amount failed");
        // calculate mint fee
        (MathError err1, uint fee) = mulScalarTruncate(Exp(feeRate), cfscAmount);
        require(err1 == MathError.NO_ERROR, "calculate fee failed");
        // calculate actual mint amount
        cfscAmount = sub_(cfscAmount, fee);
        // mint fee to self
        CFSC.mint(address(this), fee);
        // mint to user
        CFSC.mint(msg.sender, cfscAmount);
        return cfscAmount;
    }

    // return `asset` amount
    function mintByCFSCAmount(address asset, uint cfscAmount) public assetSupported(asset) returns (uint){
        Exp memory assetPrice = Exp(oracle.getPrice(asset));
        Exp memory cfscPrice = Exp(CFSC_PRICE);
        MathError err;
        uint fee;
        Exp memory cfscValue;
        Exp memory tokenAmount;
        // calculate mint fee
        (err, fee) = mulScalarTruncate(Exp(feeRate), cfscAmount);
        require(err == MathError.NO_ERROR, "calculate fee failed");
        // calculate actual mint amount
        cfscAmount = sub_(cfscAmount, fee);
        // calculate needed token amount
        (err, cfscValue) = mulScalar(cfscPrice, cfscAmount);
        require(err == MathError.NO_ERROR, "calculate cfscValue err");
        (err, tokenAmount) = divExp(cfscValue, assetPrice);
        require(err == MathError.NO_ERROR, "calculate tokenAmount err");
        uint result = truncate(tokenAmount);
        // transfer asset to self
        require(asset.safeTransferFrom(msg.sender, address(this), result), "transfer failed");
        //mint fee to self
        CFSC.mint(address(this), fee);
        // mint fee to user
        CFSC.mint(msg.sender, cfscAmount);
        return result;
    }

    // return burned CFSC amount
    function burn(address asset, uint tokenAmount) public assetSupported(asset) returns (uint){
        Exp memory assetPrice = Exp(oracle.getPrice(asset));
        // because CFSC decimals is same with expScale, the cfscAmount is the final result
        // calculate needed CFSC amount
        (MathError err, uint cfscAmount) = mulScalarTruncate(assetPrice, tokenAmount);
        require(err == MathError.NO_ERROR, "calculate err");
        // transfer CFSC to self
        require(CFSC.transferFrom(msg.sender, address(this), cfscAmount), "transferFrom CFSC failed");
        // calculate burn fee
        (MathError err1, uint fee) = mulScalarTruncate(Exp(feeRate), cfscAmount);
        require(err1 == MathError.NO_ERROR, "calculate fee failed");
        // calculate actual burn amount
        cfscAmount = sub_(cfscAmount, fee);
        CFSC.burn(cfscAmount);
        // transfer asset to user
        require(asset.safeTransfer(msg.sender, tokenAmount), "transfer asset failed");
        return cfscAmount;
    }

    // return `asset` amount
    function burnByCFSCAmount(address asset, uint cfscAmount) public assetSupported(asset) returns (uint){
        // transfer CFSC to self
        require(CFSC.transferFrom(msg.sender, address(this), cfscAmount), "transferFrom CFSC failed");
        // calculate burn fee
        (MathError err0, uint fee) = mulScalarTruncate(Exp(feeRate), cfscAmount);
        require(err0 == MathError.NO_ERROR, "calculate fee failed");
        // calculate actual burn amount
        cfscAmount = sub_(cfscAmount, fee);
        CFSC.burn(cfscAmount);

        // calculate needed asset amount
        Exp memory assetPrice = Exp(oracle.getPrice(asset));
        Exp memory cfscPrice = Exp(CFSC_PRICE);
        (MathError err1, Exp memory cfscValue) = mulScalar(cfscPrice, cfscAmount);
        require(err1 == MathError.NO_ERROR, "calculate cfscValue err");
        (MathError err2, Exp memory tokenAmount) = divExp(cfscValue, assetPrice);
        require(err2 == MathError.NO_ERROR, "calculate tokenAmount err");
        uint result = truncate(tokenAmount);
        // transfer asset to user
        require(asset.safeTransfer(msg.sender, result), "transfer asset faield");
        return result;
    }
}
