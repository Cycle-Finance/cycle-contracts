const SimpleInterestRateModel = artifacts.require("SimpleInterestRateModel");

const interestRateModel = require('./method/interest-rate-model');
const math = require('./method/math');

contract('test simple interest rate model', async (accounts) => {
    let multiplierPerYear = web3.utils.toBN(math.expScale * 0.3);
    let baseRatePerYear = web3.utils.toBN(math.expScale * 0.025);
    it('test with simple param', async () => {
        let contract = await SimpleInterestRateModel.new(baseRatePerYear, multiplierPerYear);
        let contractMultiplier = await contract.multiplierPerBlock();
        let contractBaseRate = await contract.baseRatePerBlock();
        assert.ok(contractMultiplier.cmp(interestRateModel.multiplierPerBlock(multiplierPerYear)) === 0);
        assert.ok(contractBaseRate.cmp(interestRateModel.baseRatePerBlock(baseRatePerYear)) === 0);
        let depositValue = web3.utils.toBN('165431321546543213134541');
        let borrowValue = web3.utils.toBN('101431321546543213134541');
        let contractUR = await contract.utilizationRate(depositValue, borrowValue);
        assert.ok(contractUR.cmp(math.expScale) <= 0);
        assert.ok(contractUR.cmp(interestRateModel.utilizationRate(depositValue, borrowValue)) === 0);
        let contractBorrowRate = await contract.borrowRatePerBlock(depositValue, borrowValue);
        let localBorrowRate = interestRateModel.borrowRatePerBlock(depositValue, borrowValue, baseRatePerYear,
            multiplierPerYear);
        assert.ok(contractBorrowRate.cmp(localBorrowRate) === 0);
        let reserveFactor = web3.utils.toBN(math.expScale * 0.15);
        let contractSupplyRate = await contract.supplyRatePerBlock(depositValue, borrowValue, reserveFactor);
        let localSupplyRate = interestRateModel.supplyRatePerBlock(depositValue, borrowValue, baseRatePerYear,
            multiplierPerYear, reserveFactor);
        assert.ok(contractSupplyRate.cmp(localSupplyRate) === 0);
        // we can log contract state here
        console.log(math.expToDecimals(contractUR),
            math.expToDecimals(contractBorrowRate * interestRateModel.blocksPerYear),
            math.expToDecimals(contractSupplyRate * interestRateModel.blocksPerYear));
    });
});
