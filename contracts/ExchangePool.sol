// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CycleStableCoin.sol";
import "./Oracle.sol";
import "./math/Exponential.sol";
import "./SafeERC20.sol";

// TODO: maybe add exchange fee

contract ExchangePool is Ownable, Exponential {
    using SafeERC20 for address;
    Oracle public oracle;

    uint public constant CFSC_PRICE = expScale;

    CycleStableCoin public CFSC;
    mapping(address => bool) public supportedAssets;

    /* modifier */
    modifier assetSupported(address asset){
        require(supportedAssets[asset], "asset is unsupported");
        _;
    }

    event SetSupportedAsset(address indexed asset, bool valid);
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

    // return minted CFSC amount
    function mint(address asset, uint tokenAmount) public assetSupported(asset) returns (uint){
        require(asset.safeTransferFrom(msg.sender, address(this), tokenAmount), "transferFrom failed");
        Exp memory price = Exp(oracle.getPrice(asset));
        // because CFSC decimals is same with expScale, the cfscAmount is the final result
        (MathError err, uint cfscAmount) = mulScalarTruncate(price, tokenAmount);
        require(err == MathError.NO_ERROR, "calculate err");
        CFSC.mint(msg.sender, cfscAmount);
        return cfscAmount;
    }

    // return `asset` amount
    function mintByCFSCAmount(address asset, uint cfscAmount) public assetSupported(asset) returns (uint){
        Exp memory assetPrice = Exp(oracle.getPrice(asset));
        Exp memory cfscPrice = Exp(CFSC_PRICE);
        // tokenAmount = cfscAmount * cfscPrice / assetPrice = cfscAmount * (cfscPrice / assetPrice)
        (MathError err, Exp memory ratio) = divExp(cfscPrice, assetPrice);
        require(err == MathError.NO_ERROR, "calculate err");
        uint tokenAmount = mul_ScalarTruncate(ratio, cfscAmount);
        require(asset.safeTransferFrom(msg.sender, address(this), tokenAmount), "transfer failed");
        CFSC.mint(msg.sender, cfscAmount);
        return tokenAmount;
    }

    // return burned CFSC amount
    function burn(address asset, uint tokenAmount) public assetSupported(asset) returns (uint){
        Exp memory assetPrice = Exp(oracle.getPrice(asset));
        // because CFSC decimals is same with expScale, the cfscAmount is the final result
        (MathError err, uint cfscAmount) = mulScalarTruncate(assetPrice, tokenAmount);
        require(err == MathError.NO_ERROR, "calculate err");
        require(CFSC.transferFrom(msg.sender, address(this), cfscAmount), "transferFrom CFSC failed");
        CFSC.burn(cfscAmount);
        require(asset.safeTransfer(msg.sender, tokenAmount), "transfer asset failed");
        return cfscAmount;
    }

    // return `asset` amount
    function burnByCFSCAmount(address asset, uint cfscAmount) public assetSupported(asset) returns (uint){
        require(CFSC.transferFrom(msg.sender, address(this), cfscAmount), "transferFrom CFSC failed");
        CFSC.burn(cfscAmount);
        Exp memory assetPrice = Exp(oracle.getPrice(asset));
        Exp memory cfscPrice = Exp(CFSC_PRICE);
        // tokenAmount = cfscAmount * cfscPrice / assetPrice = cfscAmount * (cfscPrice / assetPrice)
        (MathError err, Exp memory ratio) = divExp(cfscPrice, assetPrice);
        require(err == MathError.NO_ERROR, "calculate err");
        uint tokenAmount = mul_ScalarTruncate(ratio, cfscAmount);
        require(asset.safeTransfer(msg.sender, tokenAmount), "transfer asset faield");
        return tokenAmount;
    }
}
