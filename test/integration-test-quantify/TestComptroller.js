const Comptroller = artifacts.require("Comptroller");
const Borrows = artifacts.require("Borrows");
const DERC20 = artifacts.require("DERC20");
const DEther = artifacts.require("DEther");
const ComptrollerProxy = artifacts.require("ComptrollerProxy");
const BorrowsProxy = artifacts.require("BorrowsProxy");
const dTokenProxy = artifacts.require("DTokenProxy");

const SimpleInterestRateModel = artifacts.require("SimpleInterestRateModel");
const ExchangePool = artifacts.require("ExchangePool");
const CycleStableCoin = artifacts.require("CycleStableCoin");
const CycleGovToken = artifacts.require("CycleToken");

/* test only, will be replaced at maninnet*/
const TestOracle = artifacts.require("TestOracle");
const USDC = artifacts.require("TestUSDC");
const USDT = artifacts.require("TestUSDT");
const WBTC = artifacts.require("TestWBTC");

const IERC20 = artifacts.require("IERC20");

const context = require('./method/context');
const math = require('./method/math');
const localComp = require('./method/comptroller');
const localIRM = require('./method/interest-rate-model');
const localBP = require('./method/borrow-pool');

const KIND_SUPPLIER = "supplier";
const KIND_BORROWER = "borrower";
const KIND_LIQUIDATOR = "liquidator";
const KIND_LIQUIDATEE = "liquidatee";

// TODO: check system liquidity and user liquidity

const maxUint256 = web3.utils.toBN(2).pow(web3.utils.toBN(256)).sub(web3.utils.toBN(1));
let ctx = {};
let param = {};
let cfscLocalTotalSupply = web3.utils.toBN(0);
contract('test comptroller', async (accounts) => {
    before(async () => {
        let wbtc = await WBTC.deployed();
        let usdc = await USDC.deployed();
        let usdt = await USDT.deployed();
        let comptroller = await Comptroller.at(ComptrollerProxy.address);
        let dEther = await DEther.at(await comptroller.markets(0));
        let dWBTC = await DERC20.at(await comptroller.markets(1));
        let dUSDC = await DERC20.at(await comptroller.markets(2));
        let dUSDT = await DERC20.at(await comptroller.markets(3));
        let CFGT = await CycleGovToken.deployed();
        let CFSC = await CycleStableCoin.deployed();
        let borrowPool = await Borrows.at(BorrowsProxy.address);
        let exchangePool = await ExchangePool.deployed();
        let oracle = await TestOracle.deployed();
        // init context
        ctx = {
            comptroller: comptroller,
            borrowPool: borrowPool,
            exchangePool: exchangePool,
            CFGT: CFGT,
            CFSC: CFSC,
            dEther: dEther,
            dWBTC: dWBTC,
            dUSDT: dUSDT,
            dUSDC: dUSDC,
            WBTC: wbtc,
            USDC: usdc,
            USDT: usdt,
            oracle: oracle,
            IERC20: IERC20,
        };
        // transfer asset to other accounts
        let wbtcAmount = 1000 * (10 ** 8);
        let usdAmount = 1000000 * (10 ** 6);
        wbtc.transfer(accounts[1], wbtcAmount);
        wbtc.transfer(accounts[2], wbtcAmount);
        wbtc.transfer(accounts[3], wbtcAmount);
        wbtc.transfer(accounts[4], wbtcAmount);
        usdc.transfer(accounts[1], usdAmount);
        usdc.transfer(accounts[2], usdAmount);
        usdc.transfer(accounts[3], usdAmount);
        usdc.transfer(accounts[4], usdAmount);
        usdt.transfer(accounts[1], usdAmount);
        usdt.transfer(accounts[2], usdAmount);
        usdt.transfer(accounts[3], usdAmount);
        usdt.transfer(accounts[4], usdAmount);
        // fetch system params
        param.supplySpeed = await comptroller.supplySpeed();
        param.borrowSpeed = await comptroller.borrowSpeed();
        param.collateralFactor = [
            await comptroller.collateralFactor(dEther.address),
            await comptroller.collateralFactor(dWBTC.address),
            await comptroller.collateralFactor(dUSDC.address),
            await comptroller.collateralFactor(dUSDT.address)
        ];
        param.liquidationIncentive = await comptroller.liquidationIncentive();
        param.reserveFactor = await borrowPool.reserveFactor();
        param.multiplierPerYear = web3.utils.toBN(math.expScale * 0.3);
        param.baseRatePerYear = web3.utils.toBN(math.expScale * 0.025);
    });
    let stateAccount0 = {};
    it('accounts[0] deposit 10 ETH', async () => {
        let stateBefore = await context.getState(ctx, ctx.dEther, accounts[0]);
        let depositAmount = web3.utils.toBN(web3.utils.toWei('10'));
        await ctx.dEther.mint(depositAmount, {value: depositAmount});
        let stateAfter = await context.getState(ctx, ctx.dEther, accounts[0]);
        assertStateChange(stateBefore, stateAfter, KIND_SUPPLIER);
        stateAccount0 = stateAfter
    });
    let stateAccount1 = {}
    it('accounts[1] deposit after some blocks', async () => {
        stateAccount1 = await context.getState(ctx, ctx.dEther, accounts[1]);
        let depositAmount = web3.utils.toBN(web3.utils.toWei('10'));
        await ctx.dEther.mint(depositAmount, {value: depositAmount});
        await ctx.comptroller.claimAllProfit([accounts[0], accounts[1]]);
        let stateAfter0 = await context.getState(ctx, ctx.dEther, accounts[0]);
        let stateAfter1 = await context.getState(ctx, ctx.dEther, accounts[1]);
        assertStateChange(stateAccount0, stateAfter0, KIND_SUPPLIER);
        assertStateChange(stateAccount1, stateAfter1, KIND_SUPPLIER);
        let cfgtGap0 = stateAfter0.cfgtBalance.sub(stateAccount0.cfgtBalance);
        let cfgtGap1 = stateAfter1.cfgtBalance.sub(stateAccount1.cfgtBalance);
        assert.ok(cfgtGap0.cmpn(0) > 0);
        assert.ok(cfgtGap1.cmpn(0) > 0);
        assert.ok(cfgtGap0.cmp(cfgtGap1) > 0);
        stateAccount0 = stateAfter0;
        stateAccount1 = stateAfter1;
    });
});

function assertStateChange(stateBefore, stateAfter, userKind) {
    let refreshBlockDelta = stateAfter.comp.refreshedBlock - stateBefore.comp.refreshedBlock;
    let interestBlockDelta = stateAfter.bp.accrualBlock - stateBefore.bp.accrualBlock;
    assert.equal(refreshBlockDelta, interestBlockDelta);
    assert.ok(refreshBlockDelta > 0);
    let borrowerCFGTBlockDelta = stateAfter.comp.borrowDistributedBlock - stateBefore.comp.borrowDistributedBlock;
    let localState = calculateLocalState(interestBlockDelta, borrowerCFGTBlockDelta, stateBefore.comp, stateBefore.bp,
        stateBefore.dToken);
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
    let supplierCFSCDelta = stateAfter.cfscBalance.sub(stateBefore.cfscBalance);
    assert.equal(supplierCFSCDelta.toString(), localState.supplierInterest.toString());
    let compCFSCDelta = stateAfter.compCfscBalance.sub(stateBefore.compCfscBalance);
    let cfscDelta = compCFSCDelta.add(supplierCFSCDelta);
    assert.equal(cfscDelta.toString(), localState.interestAccrued.interestDelta.toString());
    cfscLocalTotalSupply = cfscLocalTotalSupply.add(cfscDelta);
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
                             marketStateBefore) {
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
    let supplierCFGT = localComp.marketSupplierDistributionCFGT(marketStateBefore.totalSupply,
        marketStateBefore.userBalance, param.supplySpeed, interestBlockDelta);
    let supplierInterest = localComp.marketSupplierDistributionInterest(marketStateBefore.totalSupply,
        marketStateBefore.userBalance, interestAccrued.interestDelta);
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