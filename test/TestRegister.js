const web3 = require("web3");
const Comptroller = artifacts.require("Comptroller");
const ComptrollerProxy = artifacts.require("ComptrollerProxy");

contract('Comptroller', async (accounts) => {
    let comptroller = await Comptroller.at(ComptrollerProxy.address);
    it('test register market', async () => {
        debug(comptroller.registerMarket('0x74D7c4a5aB864ac288be614498EAbD7728857A1a'), web3.utils.toWei('0.75'));
    });
});