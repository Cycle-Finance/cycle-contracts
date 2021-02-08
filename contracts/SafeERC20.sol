// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library SafeERC20 {
    function safeTransfer(address asset, address to, uint amount) internal returns (bool){
        IERC20 erc20 = IERC20(asset);
        address self = address(this);
        uint balanceBefore = erc20.balanceOf(self);
        erc20.transfer(to, amount);
        uint balanceAfter = erc20.balanceOf(self);
        return balanceBefore - balanceAfter == amount;
    }

    function safeTransferFrom(address asset, address sender, address recipient, uint amount) internal returns (bool){
        IERC20 erc20 = IERC20(asset);
        address self = address(this);
        uint allowanceBefore = erc20.allowance(sender, self);
        erc20.transferFrom(sender, recipient, amount);
        uint allowanceAfter = erc20.allowance(sender, self);
        return allowanceBefore - allowanceAfter == amount;
    }
}
