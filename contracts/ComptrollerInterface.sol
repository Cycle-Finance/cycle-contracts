// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

interface ComptrollerInterface {
    function mintAllowed(address dToken, address minter, uint amount) external returns (string memory);

    function mintVerify(address dToken, address minter, uint amount) external returns (string memory);

    function redeemAllowed(address dToken, address redeemer, uint redeemTokens) external returns (string memory);

    function redeemVerify(address dToken, address minter, uint amount) external returns (string memory);

    function borrowAllowed(address user, uint borrowAmount) external returns (string memory);

    function borrowVerify(address user, uint borrowAmount) external returns (string memory);

    function repayBorrowAllowed(address user, uint repayAmount) external returns (string memory);

    function repayBorrowVerify(address user, uint repayAmount) external returns (string memory);

    function liquidateBorrowAllowed(address dToken, address liquidator, address borrower, uint repayAmount)
    external returns (string memory);

    function liquidateBorrowVerify(address dToken, address liquidator, address borrower, uint repayAmount)
    external returns (string memory);

    function seizeAllowed(address dToken, address borrowPool, address liquidator, address borrower, uint seizedTokens)
    external returns (string memory);

    function seizeVerify(address dToken, address borrowPool, address liquidator, address borrower, uint seizedTokens)
    external returns (string memory);

    function transferAllowed(address dToken, address from, address to, uint amount)
    external returns (string memory);

    function transferVerify(address dToken, address from, address to, address amount)
    external returns (string memory);

    /* view interface*/
    function isComptroller() external view returns (bool);

    function liquidateCalculateSeizeTokens(address dToken, address liquidator, address borrower, uint amount)
    external view returns (uint);

    function getAccountLiquidity(address account) external view returns (uint, uint, uint);

    function getAccountBorrowLimit(address account) external view returns (uint, uint);
}
