# Exact Quantitative Test

The value we calculate locally has some precision errors, but most of the values in the contract are integers with 18/36
decimals. Therefore, when we check, we can't ask them to be completely equal. We just require that the margin is less
than a certain range, such 0.01%.

## Interest Rate Model

We check interest rate model with some initialized param.

[implementation](../integration-test-quantify/TestInterestRateModel.js)

##