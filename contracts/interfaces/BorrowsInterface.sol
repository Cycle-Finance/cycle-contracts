// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

interface BorrowsInterface {

    function isBorrowPool() external returns (bool);

    function accrueInterest() external returns (string memory, uint);

    // return reserves amount
    function reduceReserves(address recipient) external returns (uint);

    function setReserveFactor(uint factor) external;

    function setInterestRateModel(address _interestRateModel) external;

    function _borrowIndex() external view returns (uint);

    // return total borrows, is scalar
    function _totalBorrows() external view returns (uint);

    function _accrualBlockNumber()external view returns (uint);

    // return account borrows snapshot
    function accountBorrowsSnapshot(address user) external view returns (uint);

    // return user latest borrows(after multiply latest borrowIndex), is scalar
    function getBorrows(address user) external view returns (uint);
}
