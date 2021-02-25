// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

interface BorrowsInterface {

    function isBorrowPool() external returns (bool);

    function accrueInterest() external returns (string memory, uint);

    // return reserves amount
    function reduceReserves(address recipient) external returns (uint);

    function borrowIndex() external view returns (uint);

    // return total borrows, is scalar
    function totalBorrows() external view returns (uint);

    // return user latest borrows(after multiply latest borrowIndex), is scalar
    function getBorrows(address user) external view returns (uint);
}
