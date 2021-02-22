// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

interface DTokenInterface {
    function isDToken() external view returns (bool);

    /* user interface */
    function mint(uint amount) external returns (string memory);

    function redeem(uint amount) external returns (string memory);

    function seize(address liquidator, address borrower, uint amount) external returns (string memory);

    /* view interface */
    // return the value of underlying asset, represented by USD, the value is exponential
    function depositValue() external view returns (uint);
    // return the value of the balance of user underlying asset, represented by USD, the value is exponential
    function userDepositValue(address account) external view returns (uint);
    // return the value of the specified number of token, the value is exponential
    function tokenValue(uint amount) external view returns (uint);
    // return the number of token that value equals `value`, the value is scalar
    function tokenAmount(uint value) external view returns (uint);
}