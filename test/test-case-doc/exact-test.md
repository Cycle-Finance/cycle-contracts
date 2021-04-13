# Exact Quantitative Test

The value we calculate locally has some precision errors, but most of the values in the contract are integers with 18/36
decimals. Therefore, when we check, we can't ask them to be completely equal. We just require that the margin is less
than a certain range, such as 0.01%. But we should be as precise as possible.

## Interest Rate Model

We check interest rate model with some initialized param.

[implementation](../integration-test-quantify/method/interest-rate-model.js)

## Exchange Pool

User could exchange CFSC and other stable coin at exchange pool.

[implementation](../integration-test-quantify/method/exchange-pool.js)

## DToken

The exchange rate of underlying asset and dToken is constant, the value is 1. And there are only some state variable in
dToken. However, there are some interface that used oracle, so we test dToken with oracle.

We check dToken state change after user operate through dToken interface.

[implementation](../integration-test-quantify/method/dToken.js)

## Borrow Pool

Borrow pool calculate concrete interest and own reserves.

[implementation](../integration-test-quantify/method/borrow-pool.js)

## Comptroller

Comptroller is responsible for CFGT disctribution, interest CFSC distribution, borrow/liquidation audit.

[implementation](../integration-test-quantify/method/comptroller.js)