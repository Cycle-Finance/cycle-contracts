# Integration Test —— RepayBorrow

## repayBorrow-1

the debt of borrower is 0.

### repayBorrow-1-1

successful repay: repay 0 or -1.

- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDTContract, 0)
- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDCContract, 0)
- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], CFSCContract, 0)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDTContract,
    0)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDCContract,
    0)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], CFSCContract,
    0)
- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDTContract, -1)
- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDCContract, -1)
- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], CFSCContract, -1)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDTContract,
  -1)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDCContract,
  -1)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], CFSCContract,
  -1)

### repayBorrow-1-2

reverted repay: repay some value.

- [RevertRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDTContract, 100)
- [RevertRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDCContract, 100)
- [RevertRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], CFSCContract, 100)
- [RevertRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDTContract,
    100)
- [RevertRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDCContract,
    100)
- [RevertRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], CFSCContract,
    100)

### repayBorrow-2

the debt of borrower is more than 0.

### beforeAll

deposit some value so that system enable borrow.

- [SimpleDeposit](./test-function.md#SimpleDeposit)(dEther, accounts[0], 10 dEther)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dEther, accounts[0], 10000 CFSC)

### repayBorrow-2-1

successful: repay 0.

- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDTContract, 0)
- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDCContract, 0)
- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], CFSCContract, 0)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDTContract,
    0)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDCContract,
    0)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], CFSCContract,
    0)

### repayBorrow-2-2

successful: repay the part of value.

- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDTContract, 100)
- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDCContract, 100)
- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], CFSCContract, 100)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDTContract,
    100)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDCContract,
    100)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], CFSCContract,
    100)

### repayBorrow-2-3

successful: repay the whole of borrows.

- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDTContract, -1)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dWBTC, accounts[0], 10000 CFSC)
- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDCContract, -1)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dWBTC, accounts[0], 10000 CFSC)
- [SimpleRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], CFSCContract, -1)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dWBTC, accounts[0], 10000 CFSC)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDTContract,
  -1)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dWBTC, accounts[0], 10000 CFSC)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDCContract,
  -1)
- [SimpleBorrow](./test-function.md#SimpleBorrow)(dWBTC, accounts[0], 10000 CFSC)
- [SimpleRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], CFSCContract,
  -1)

### repayBorrow-2-4

reverted: repay more than debts.

- [RevertRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDTContract, 100000)
- [RevertRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], USDCContract, 100000)
- [RevertRepayBorrow](./test-function.md#SimpleRepayBorrow)(dEther, accounts[0], CFSCContract, 100000)
- [RevertRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDTContract,
    100000)
- [RevertRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], USDCContract,
    100000)
- [RevertRepayBorrowBehalf](./test-function.md#SimpleRepayBorrowBehalf)(dEther, accounts[1], accounts[0], CFSCContract,
    100000)