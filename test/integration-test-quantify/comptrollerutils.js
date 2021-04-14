const localComp = require('./method/comptroller');
const localIRM = require('./method/interest-rate-model');
const localBP = require('./method/borrow-pool');
const math = require('./method/math');

const KIND_SUPPLIER = "supplier";
const KIND_BORROWER = "borrower";
const KIND_LIQUIDATOR = "liquidator";
const KIND_LIQUIDATEE = "liquidatee";

// check contract state change
function assertStateChange(stateBefore, stateAfter, userKind, borrowAmount, param) {
    let refreshBlockDelta = stateAfter.comp.refreshedBlock - stateBefore.comp.refreshedBlock;
    let interestBlockDelta = stateAfter.bp.accrualBlock - stateBefore.bp.accrualBlock;
    assert.equal(refreshBlockDelta, interestBlockDelta);
    assert.ok(refreshBlockDelta > 0);
    let borrowerCFGTBlockDelta = stateAfter.comp.borrowDistributedBlock - stateBefore.comp.borrowDistributedBlock;
    let localState = calculateLocalState(interestBlockDelta, borrowerCFGTBlockDelta, stateBefore.comp, stateBefore.bp,
        stateBefore.dToken, param);
    // check user index equals global index
    if (stateAfter.comp.supplierInterestIndex.cmpn(0) > 0) {
        assert.equal(stateAfter.comp.marketInterestIndex.toString(), stateAfter.comp.supplierInterestIndex.toString());
    }
    if (stateAfter.comp.supplierIndex.cmpn(0) > 0) {
        assert.equal(stateAfter.comp.marketSupplyIndex.toString(), stateAfter.comp.supplierIndex.toString());
    }
    if (stateAfter.comp.borrowerIndex.cmpn(0) > 0) {
        assert.equal(stateAfter.comp.borrowIndex.toString(), stateAfter.comp.borrowerIndex.toString());
    }
    // check actual state and local state
    assert.equal(stateAfter.comp.marketInterestIndex.toString(), localState.supplyInterestIndex.toString());
    assert.equal(stateAfter.comp.marketSupplyIndex.toString(), localState.supplyCFGTIndex.toString());
    assert.equal(stateAfter.comp.borrowIndex.toString(), localState.borrowIndex.toString());
    // check CFSC amount
    // interestAccrued: borrowPool -> comptroller
    // interestDistribution: comptroller -> supplier
    let supplierCFSCDelta = stateAfter.cfscBalance.sub(stateBefore.cfscBalance.add(borrowAmount));
    assert.equal(supplierCFSCDelta.toString(), localState.supplierInterest.toString());
    let compCFSCDelta = stateAfter.compCfscBalance.sub(stateBefore.compCfscBalance);
    let cfscDelta = compCFSCDelta.add(supplierCFSCDelta);
    assert.equal(cfscDelta.toString(), localState.interestAccrued.interestDelta.toString());
    // check CFGT amount
    let cfgtDelta = stateAfter.cfgtBalance.sub(stateBefore.cfgtBalance).add(
        stateAfter.comp.accruedCFGT.sub(stateBefore.comp.accruedCFGT));
    cfgtDelta = cfgtDelta.toString();
    switch (userKind) {
        case KIND_SUPPLIER:
            assert.equal(cfgtDelta, localState.supplierCFGT.toString());
            break;
        case KIND_BORROWER:
            assert.equal(cfgtDelta, localState.borrowerCFGT.toString());
            break;
        case KIND_LIQUIDATOR:
            assert.equal(cfgtDelta, localState.supplierCFGT.toString());
            break;
        case KIND_LIQUIDATEE:
            let totalCFGT = localState.borrowerCFGT.add(localState.supplierCFGT);
            assert.equal(cfgtDelta, totalCFGT.toString());
            break;
        default:
            throw new Error('unsupported kind');
    }
}

// check user CFGT and CFSC distribution
function assertBalanceChange(stateBefore, stateAfter, userKind, borrowAmount) {
    let localState = {};
    localState.supplierInterest = localComp.marketSupplierDistributionInterestByIndex(
        stateAfter.comp.marketInterestIndex, stateBefore.comp.supplierInterestIndex, stateBefore.dToken.userBalance);
    localState.supplierCFGT = localComp.marketSupplierDistributionCFGTByIndex(
        stateAfter.comp.marketSupplyIndex, stateBefore.comp.supplierIndex, stateBefore.dToken.userBalance);
    localState.borrowerCFGT = localComp.borrowerDistributionCFGTByIndex(
        stateAfter.comp.borrowIndex, stateBefore.comp.borrowerIndex, stateBefore.bp.accountBorrows, stateBefore.bp.borrowIndex);
    let supplierCFSCDelta = stateAfter.cfscBalance.sub(stateBefore.cfscBalance.add(borrowAmount));
    assert.equal(supplierCFSCDelta.toString(), localState.supplierInterest.toString());
    // check CFGT amount
    let cfgtDelta = stateAfter.cfgtBalance.sub(stateBefore.cfgtBalance).add(
        stateAfter.comp.accruedCFGT.sub(stateBefore.comp.accruedCFGT));
    cfgtDelta = cfgtDelta.toString();
    switch (userKind) {
        case KIND_SUPPLIER:
            assert.equal(cfgtDelta, localState.supplierCFGT.toString());
            break;
        case KIND_BORROWER:
            assert.equal(cfgtDelta, localState.borrowerCFGT.toString());
            break;
        case KIND_LIQUIDATOR:
            assert.equal(cfgtDelta, localState.supplierCFGT.toString());
            break;
        case KIND_LIQUIDATEE:
            let totalCFGT = localState.borrowerCFGT.add(localState.supplierCFGT);
            assert.equal(cfgtDelta, totalCFGT.toString());
            break;
        default:
            throw new Error('unsupported kind');
    }
}


/// @notice interestBlockDelta must equals supplierCFGTBlockDelta
function calculateLocalState(interestBlockDelta, borrowerCFGTBlockDelta, compStateBefore, borrowPoolStateBefore,
                             marketStateBefore, param) {
    // accrue interest firstly
    let borrowRate = localIRM.borrowRatePerBlock(compStateBefore.totalDeposit, borrowPoolStateBefore.totalBorrows,
        param.baseRatePerYear, param.multiplierPerYear);
    let interestAccrued = localBP.accrueInterest(borrowRate, interestBlockDelta, borrowPoolStateBefore.totalBorrows,
        borrowPoolStateBefore.reserveFactor, borrowPoolStateBefore.borrowIndex);
    // update interest index and supply CFGT index
    let supplyIndex = localComp.supplyIndex(compStateBefore.marketSupplyIndex, compStateBefore.marketInterestIndex,
        compStateBefore.totalDeposit, compStateBefore.marketDeposit, marketStateBefore.totalSupply, param.supplySpeed,
        interestBlockDelta, interestAccrued.interestDelta);
    // update borrowIndex
    let borrowIndex = localComp.borrowIndex(compStateBefore.borrowIndex, borrowPoolStateBefore.totalBorrows,
        borrowPoolStateBefore.borrowIndex, param.borrowSpeed, borrowerCFGTBlockDelta);
    // get CFGT distribution and interest CFSC distribution
    let marketSupplySpeed = param.supplySpeed;
    let marketInterestAccrued = interestAccrued.interestDelta;
    if (compStateBefore.marketDeposit.cmp(compStateBefore.totalDeposit) !== 0) {
        let weight = math.div_(compStateBefore.marketDeposit, compStateBefore.totalDeposit);
        marketSupplySpeed = math.mulScalarAndTruncate(weight, param.supplySpeed);
        marketInterestAccrued = math.mulScalarAndTruncate(weight, interestAccrued.interestDelta);
    }
    let supplierCFGT = localComp.marketSupplierDistributionCFGT(marketStateBefore.totalSupply,
        marketStateBefore.userBalance, marketSupplySpeed, interestBlockDelta);
    let supplierInterest = localComp.marketSupplierDistributionInterest(marketStateBefore.totalSupply,
        marketStateBefore.userBalance, marketInterestAccrued);
    let borrowerCFGT = localComp.borrowerDistributionCFGT(borrowPoolStateBefore.totalBorrows,
        borrowPoolStateBefore.accountBorrows, param.borrowSpeed, borrowerCFGTBlockDelta);
    return {
        interestAccrued: interestAccrued,
        supplyCFGTIndex: supplyIndex.supplyIndex,
        supplyInterestIndex: supplyIndex.interestIndex,
        borrowIndex: borrowIndex,
        supplierCFGT: supplierCFGT,
        supplierInterest: supplierInterest,
        borrowerCFGT: borrowerCFGT,
    };
}

module.exports = {
    KIND_SUPPLIER, KIND_BORROWER, KIND_LIQUIDATOR, KIND_LIQUIDATEE,
    assertStateChange, assertBalanceChange, calculateLocalState
};