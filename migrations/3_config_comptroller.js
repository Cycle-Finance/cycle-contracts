const Comptroller = artifacts.require("Comptroller");
const ComptrollerProxy = artifacts.require("ComptrollerProxy");

module.exports = async function (depolyer) {
    await ComptrollerProxy.deployed();
    let comptroller = await Comptroller.at(ComptrollerProxy.address);
    // comptroller.setSystemUtilizationRate(75*(10**16));
    // 100 CFGT per block, for test
    // if there are no deposit at all markets, don't set speed>0, otherwise CFGT is wasted
    // comptroller.setSupplySpeed(100*(10**18));
    // comptroller.setBorrowSpeed(100*(10**18));
}