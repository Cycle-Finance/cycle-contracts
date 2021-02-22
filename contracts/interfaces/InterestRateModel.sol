// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

interface InterestRateModel {
    function isInterestRateModel() external view returns (bool);

    function borrowRatePerBlock(uint depositValue, uint borrowsValue) external view returns (uint);

    function supplyRatePerBlock(uint depositValue, uint borrowsValue, uint reservesFactor) external view returns (uint);
}
