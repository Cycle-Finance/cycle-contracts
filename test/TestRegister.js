const web3 = require("web3");
const Comptroller = artifacts.require("Comptroller");
const ComptrollerProxy = artifacts.require("ComptrollerProxy");

contract('Comptroller', async (accounts) => {
    let comptroller = await Comptroller.at(ComptrollerProxy.address);
    it('test register market', async () => {
        debug(comptroller.registerMarket('0xeb3A58f9dD05A2961E86d1F0547028e99C83Ea29'), web3.utils.toWei('0.75'));
    });
});