// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

interface ComptrollerInterface {
    function mintAllowed(address dToken, address minter, uint amount) external returns (string memory);

    function mintVerify(address dToken, address minter, uint amount) external;

    function redeemAllowed(address dToken, address redeemer, uint redeemTokens) external returns (string memory);

    function redeemVerify(address dToken, address minter, uint amount) external;

    function borrowAllowed(address borrower, uint borrowAmount) external returns (string memory);

    function borrowVerify(address borrower, uint borrowAmount) external;

    function repayBorrowAllowed(address payer, address borrower, uint repayAmount) external returns (string memory);

    function repayBorrowVerify(address payer, address user, uint repayAmount) external;

    function liquidateBorrowAllowed(address dToken, address liquidator, address borrower, uint repayAmount)
    external returns (string memory);

    function liquidateBorrowVerify(address dToken, address liquidator, address borrower, uint repayAmount,
        uint seizedTokens) external;

    function seizeAllowed(address dToken, address borrowPool, address liquidator, address borrower, uint seizedTokens)
    external returns (string memory);

    function seizeVerify(address dToken, address borrowPool, address liquidator, address borrower, uint seizedTokens)
    external;

    function transferAllowed(address dToken, address from, address to, uint amount)
    external returns (string memory);

    function transferVerify(address dToken, address from, address to, uint amount)
    external;

    /* view interface*/
    function _isComptroller() external view returns (bool);

    function liquidateCalculateSeizeTokens(address dToken, uint amount)
    external view returns (string memory, uint);

    function getCurrentSystemLiquidity() external returns (uint, uint, uint);

    function getSystemLiquidity() external view returns (uint, uint, uint);

    function getAccountLiquidity(address account) external view returns (uint, uint, uint);

    function _totalDeposit() external view returns (uint);
}
