// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.7.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CycleToken is ERC20, Ownable {

    uint constant private factor = 10 ** 18;
    uint constant public PRESERVED_TOKEN = 50000 * factor;
    uint constant public MAX_TOTAL_SUPPLY = 2100000 * factor;

    uint public approvedToken;

    // live the most of tokens inside the contract
    constructor()ERC20("Cycle Finance Governance Token", "CFGT"){
        // mint 50,000 to dev team
        _mint(owner(), PRESERVED_TOKEN);
        // the remaining 2,050,000 remain in the contract
        _mint(address(this), MAX_TOTAL_SUPPLY - PRESERVED_TOKEN);
    }

    // set address who can transferFrom token
    function setApprover(address approver, uint amount) public onlyOwner {
        require(approver != address(0));
        _approve(address(this), approver, amount);
    }

    function totalCirculation() public view returns (uint){
        return MAX_TOTAL_SUPPLY - balanceOf(address(this));
    }
}
