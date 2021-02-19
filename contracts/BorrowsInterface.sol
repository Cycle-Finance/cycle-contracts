// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

interface BorrowsInterface {

    function accrueInterest() external returns (uint);

    function totalBorrows() external returns (uint);

    function getBorrows(address user) external returns (uint);
}
