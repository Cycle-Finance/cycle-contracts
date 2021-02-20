// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

interface BorrowsInterface {

    function accrueInterest() external returns (uint);

    // return total borrows, is scalar
    function totalBorrows() external view returns (uint);

    // return user latest borrows, is scalar
    function getBorrows(address user) external view returns (uint);
}
